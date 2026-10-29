/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ALL_SPACES_ID } from '@kbn/core-spaces-common';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { collectUnitComponentIds, type StreamsUnit } from '@kbn/streams-schema';
import { StatusError } from '../streams/errors/status_error';
import {
  STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
  STREAMS_METADATA_REFERENCE_NAME,
  STREAMS_UI_METADATA_SAVED_OBJECT_TYPE,
  getStreamsUiMetadataSavedObjectId,
} from '../../../common/constants';
import type {
  StreamsConfigurationSavedObjectAttributes,
  StreamsUiMetadataSavedObjectAttributes,
} from './streams_configuration';
import type {
  PrepareCredentialsInput,
  PreparedCredentials,
  PrepareUnitCredentials,
  PublishUnitConfig,
  RepublishUnitOutcome,
  StoredUnitCredential,
  UnitValidationResult,
  ValidateUnitConfig,
} from '../unit_config/types';

const isNotFoundError = (error: unknown): boolean => {
  return SavedObjectsErrorHelpers.isNotFoundError(error as Error);
};

const pruneStaleNodeMetadata = (
  metadata: StreamsUnit.UiMetadata,
  unit: StreamsUnit.Configuration
): StreamsUnit.UiMetadata => {
  const nodes = metadata.nodes;

  if (!nodes || typeof nodes !== 'object' || Array.isArray(nodes)) {
    return metadata;
  }

  const componentIds = new Set(collectUnitComponentIds(unit));
  const prunedNodes = Object.fromEntries(
    Object.entries(nodes).filter(([nodeId]) => componentIds.has(nodeId))
  );

  return {
    ...metadata,
    nodes: prunedNodes,
  };
};

const emptySecrets = (): StreamsUnit.Secrets => ({});

const mergeUnitSecrets = (
  incoming: StreamsUnit.Secrets | undefined,
  existing: StreamsUnit.Secrets | undefined
): StreamsUnit.Secrets => {
  if (incoming === undefined) {
    return existing ?? emptySecrets();
  }

  return {
    ...existing,
    ...incoming,
  };
};

// A config entry references a credential only when its value is exactly `{ credential: <name> }`.
const credentialReferenceName = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const keys = Object.keys(value);
  const { credential } = value as { credential?: unknown };
  return keys.length === 1 && keys[0] === 'credential' && typeof credential === 'string'
    ? credential
    : undefined;
};

// Only top-level config entries of sources, processors, and destinations are scanned.
const collectCredentialReferenceNames = (unit: StreamsUnit.Configuration): Set<string> => {
  const components = [unit.sources, unit.processors, unit.destinations].flatMap((list) =>
    Array.isArray(list) ? list : []
  );
  return new Set(
    components
      .flatMap((component) => (Array.isArray(component?.config) ? component.config : []))
      .flatMap((entry) => {
        const name = credentialReferenceName(entry?.value);
        return name === undefined ? [] : [name];
      })
  );
};

const pickReferencedSecrets = (
  secrets: StreamsUnit.Secrets,
  referencedNames: Set<string>
): StreamsUnit.Secrets =>
  Object.fromEntries(Object.entries(secrets).filter(([name]) => referencedNames.has(name)));

const isSameSealed = (left: StoredUnitCredential[], right: StoredUnitCredential[]): boolean => {
  const rightByName = new Map(right.map((credential) => [credential.name, credential]));
  return (
    left.length === right.length &&
    left.every(({ name, target, ciphertext }) => {
      const other = rightByName.get(name);
      return other?.target === target && other.ciphertext === ciphertext;
    })
  );
};

export class StreamsUnitService {
  private readonly soClient: SavedObjectsClientContract;
  private readonly logger: Logger;
  private readonly publishUnit: PublishUnitConfig;
  private readonly validateUnit: ValidateUnitConfig;
  private readonly prepareCredentials?: PrepareUnitCredentials;
  private readonly encryptedSavedObjectsClient?: EncryptedSavedObjectsClient;
  private readonly canEncrypt: boolean;

  constructor({
    soClient,
    logger,
    publishUnit = async () => {},
    validateUnit = async () => ({}),
    prepareCredentials,
    encryptedSavedObjectsClient,
    canEncrypt = false,
  }: {
    soClient: SavedObjectsClientContract;
    logger: Logger;
    publishUnit?: PublishUnitConfig;
    validateUnit?: ValidateUnitConfig;
    prepareCredentials?: PrepareUnitCredentials;
    encryptedSavedObjectsClient?: EncryptedSavedObjectsClient;
    canEncrypt?: boolean;
  }) {
    this.soClient = soClient;
    this.logger = logger;
    this.publishUnit = publishUnit;
    this.validateUnit = validateUnit;
    this.prepareCredentials = prepareCredentials;
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
    this.canEncrypt = canEncrypt;
  }

  async getUnit(unitId: string): Promise<StreamsUnit.GetResponse> {
    const unit = await this.readUnit(unitId);
    if (!unit) {
      throw new StatusError(`Streams unit [${unitId}] not found.`, 404);
    }
    return unit;
  }

  /** Empty config when the unit has never been stored. Used by PUT, reset, and resolve-indices. */
  async getUnitOrEmpty(unitId: string): Promise<StreamsUnit.GetResponse> {
    return (
      (await this.readUnit(unitId)) ?? {
        unit: { sources: [], destinations: [], pipelines: [] },
        ui_metadata: {},
      }
    );
  }

  async upsertUnit({
    unitId,
    unit,
    ui_metadata: uiMetadata,
    secrets,
    onPublished,
  }: {
    unitId: string;
    unit: StreamsUnit.Configuration;
    ui_metadata?: StreamsUnit.UiMetadata;
    secrets?: StreamsUnit.Secrets;
    /** Runs once the unit is published, before the UI metadata write. */
    onPublished?: () => Promise<void>;
  }): Promise<UnitValidationResult & { ui_metadata_not_persisted?: true }> {
    if (!this.canEncrypt) {
      throw new StatusError(
        'Cannot store Streams unit credentials: encrypted saved objects are not configured.',
        503
      );
    }

    const referencedNames = collectCredentialReferenceNames(unit);
    const unreferencedNames = Object.keys(secrets ?? {}).filter(
      (name) => !referencedNames.has(name)
    );
    if (unreferencedNames.length > 0) {
      throw new StatusError(
        `Streams unit secrets must be referenced by a { credential: <name> } config value: ${unreferencedNames.join(
          ', '
        )}`,
        400
      );
    }

    const existingConfiguration = await this.getDecryptedConfigurationSavedObject(unitId);
    const previousSecrets = existingConfiguration?.attributes.secrets ?? emptySecrets();
    // GET omits secrets, and the UI only sends newly entered ones. Merge
    // those secrets with the stored secrets, do not replace them. Stored
    // secrets of deleted nodes are dropped.
    const secretsToStore = pickReferencedSecrets(
      mergeUnitSecrets(secrets, previousSecrets),
      referencedNames
    );

    // `in` would see Object.prototype keys such as `constructor`, which are valid identifiers.
    const unresolvedNames = [...referencedNames]
      .filter((name) => !Object.hasOwn(secretsToStore, name))
      .sort();
    if (unresolvedNames.length > 0) {
      throw new StatusError(
        `Streams unit references credentials that have no secret: ${unresolvedNames.join(', ')}`,
        400
      );
    }

    const { credentials, sealed } = await this.prepareUnitCredentials({
      secrets: secretsToStore,
      previous: {
        secrets: previousSecrets,
        sealed: existingConfiguration?.attributes.sealed_credentials ?? [],
      },
    });

    // Validate before any write, with the same credentials the publish sends.
    const validation = await this.validateUnit({ unit, credentials });

    // Always overwrite the full document. Partial `soClient.update` must not touch
    // `secrets`, `unit_id` or `sealed_credentials` (ESO encrypted / AAD attributes).
    await this.writeConfiguration({
      savedObjectId: unitId,
      unitId,
      unit,
      secrets: secretsToStore,
      sealedCredentials: sealed,
    });

    try {
      await this.publishUnit({ unitId, unit, credentials });
    } catch (error) {
      this.logger.error(`Failed to publish Streams unit [${unitId}]: ${error}`);
      await this.rollbackConfiguration(existingConfiguration, unitId).catch((rollbackError) => {
        this.logger.error(
          `Failed to roll back Streams unit [${unitId}] after publish failure: ${rollbackError}`
        );
      });
      throw error;
    }

    await onPublished?.();

    const metadataToWrite =
      uiMetadata !== undefined
        ? uiMetadata
        : (await this.getUiMetadataSavedObject(unitId))?.attributes.metadata ?? {};

    try {
      await this.writeUiMetadata({
        configurationSavedObjectId: unitId,
        metadata: pruneStaleNodeMetadata(metadataToWrite, unit),
      });
    } catch (error) {
      // The unit is already stored and published. Fail the metadata write
      // in-band so the PUT can still acknowledge the live configuration.
      this.logger.error(`Failed to persist Streams unit UI metadata [${unitId}]: ${error}`);
      return { ...validation, ui_metadata_not_persisted: true };
    }

    return validation;
  }

  async listUnitIds(): Promise<string[]> {
    const finder = this.soClient.createPointInTimeFinder<StreamsConfigurationSavedObjectAttributes>(
      {
        type: STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
        namespaces: [ALL_SPACES_ID],
        perPage: 100,
      }
    );
    const ids: string[] = [];
    try {
      for await (const { saved_objects: savedObjects } of finder.find()) {
        ids.push(...savedObjects.map(({ id }) => id));
      }
    } finally {
      await finder.close();
    }
    return ids;
  }

  async republishUnit(unitId: string, signal?: AbortSignal): Promise<RepublishUnitOutcome> {
    const stored = await this.getDecryptedConfigurationSavedObject(unitId);
    if (!stored) {
      return 'not_found';
    }

    const { unit, secrets, sealed_credentials: storedSealed = [] } = stored.attributes;
    const { credentials, sealed } = await this.prepareUnitCredentials({
      secrets,
      previous: { secrets, sealed: storedSealed },
    });
    const resealed = !isSameSealed(sealed, storedSealed);

    let committedVersion = stored.version;
    if (resealed) {
      if (signal?.aborted) {
        return 'aborted';
      }
      await this.validateUnit({ unit, credentials, signal });
      if (signal?.aborted) {
        return 'aborted';
      }
      try {
        committedVersion = await this.writeConfiguration({
          savedObjectId: unitId,
          unitId,
          unit,
          secrets,
          sealedCredentials: sealed,
          version: stored.version,
        });
      } catch (error) {
        if (SavedObjectsErrorHelpers.isConflictError(error as Error)) {
          return 'conflict';
        }
        throw error;
      }
    }

    // A timed-out run must not PUT alongside the run task manager starts next. A re-seal write
    // stays: the next run reuses those blobs, so a PUT that did land does not roll the collector twice.
    if (signal?.aborted) {
      return 'aborted';
    }

    const current = await this.getConfigurationSavedObject(unitId);
    if (current?.version !== committedVersion) {
      return 'conflict';
    }
    if (signal?.aborted) {
      return 'aborted';
    }

    await this.publishUnit({ unitId, unit, credentials, signal });

    return resealed ? 'resealed' : 'republished';
  }

  private async prepareUnitCredentials(
    input: PrepareCredentialsInput
  ): Promise<PreparedCredentials> {
    const names = Object.keys(input.secrets).sort();
    if (names.length === 0) {
      return { credentials: [], sealed: [] };
    }

    // Publishing without the sidecar would ship a unit that names credentials the collector never gets.
    if (!this.prepareCredentials) {
      throw new StatusError(
        'Cannot publish Streams unit credentials: xpack.streams.encryptionKey.path is not configured.',
        503
      );
    }

    const prepared = await this.prepareCredentials(input);
    const credentialNames = prepared.credentials.map(({ name }) => name).sort();
    if (
      credentialNames.length !== names.length ||
      names.some((name, index) => name !== credentialNames[index])
    ) {
      throw new StatusError(
        'Cannot publish Streams unit credentials: encryption did not return one ciphertext per secret.',
        500
      );
    }

    return prepared;
  }

  async resetUnit(unitId: string): Promise<void> {
    const configuration = await this.getConfigurationSavedObject(unitId);

    if (!configuration) {
      return;
    }

    await this.deleteSavedObject(
      STREAMS_UI_METADATA_SAVED_OBJECT_TYPE,
      getStreamsUiMetadataSavedObjectId(configuration.id)
    );
    await this.deleteSavedObject(STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE, configuration.id);
  }

  private async readUnit(unitId: string): Promise<StreamsUnit.GetResponse | undefined> {
    const configuration = await this.getConfigurationSavedObject(unitId);
    if (!configuration) {
      return undefined;
    }

    const uiMetadata = await this.getUiMetadataSavedObject(configuration.id);

    return {
      unit: configuration.attributes.unit,
      ui_metadata: uiMetadata?.attributes.metadata ?? {},
    };
  }

  private async getConfigurationSavedObject(
    unitId: string
  ): Promise<SavedObject<StreamsConfigurationSavedObjectAttributes> | undefined> {
    try {
      return await this.soClient.get<StreamsConfigurationSavedObjectAttributes>(
        STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
        unitId
      );
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private async getDecryptedConfigurationSavedObject(
    unitId: string
  ): Promise<SavedObject<StreamsConfigurationSavedObjectAttributes> | undefined> {
    try {
      if (this.encryptedSavedObjectsClient) {
        return await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<StreamsConfigurationSavedObjectAttributes>(
          STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
          unitId,
          { namespace: this.soClient.getCurrentNamespace() }
        );
      }

      return await this.getConfigurationSavedObject(unitId);
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private async getUiMetadataSavedObject(
    configurationSavedObjectId: string
  ): Promise<SavedObject<StreamsUiMetadataSavedObjectAttributes> | undefined> {
    try {
      return await this.soClient.get<StreamsUiMetadataSavedObjectAttributes>(
        STREAMS_UI_METADATA_SAVED_OBJECT_TYPE,
        getStreamsUiMetadataSavedObjectId(configurationSavedObjectId)
      );
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private async writeConfiguration({
    savedObjectId,
    unitId,
    unit,
    secrets,
    sealedCredentials,
    version,
  }: {
    savedObjectId: string;
    unitId: string;
    unit: StreamsUnit.Configuration;
    secrets: StreamsUnit.Secrets;
    sealedCredentials: StoredUnitCredential[];
    /** When set, the write fails with 409 if the document changed since that version. */
    version?: string;
  }): Promise<string | undefined> {
    const written = await this.soClient.create<StreamsConfigurationSavedObjectAttributes>(
      STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
      { unit_id: unitId, unit, secrets, sealed_credentials: sealedCredentials },
      {
        id: savedObjectId,
        overwrite: true,
        ...(version ? { version } : {}),
        // One unit per cluster (distributor `/v1/units/default`). Share to all
        // spaces so they see the same document instead of colliding on the id.
        initialNamespaces: [ALL_SPACES_ID],
        references: [
          {
            name: STREAMS_METADATA_REFERENCE_NAME,
            type: STREAMS_UI_METADATA_SAVED_OBJECT_TYPE,
            id: getStreamsUiMetadataSavedObjectId(savedObjectId),
          },
        ],
      }
    );
    return written.version;
  }

  private async writeUiMetadata({
    configurationSavedObjectId,
    metadata,
  }: {
    configurationSavedObjectId: string;
    metadata: StreamsUnit.UiMetadata;
  }): Promise<void> {
    await this.soClient.create<StreamsUiMetadataSavedObjectAttributes>(
      STREAMS_UI_METADATA_SAVED_OBJECT_TYPE,
      { metadata },
      {
        id: getStreamsUiMetadataSavedObjectId(configurationSavedObjectId),
        overwrite: true,
        initialNamespaces: [ALL_SPACES_ID],
      }
    );
  }

  private async deleteSavedObject(type: string, id: string): Promise<void> {
    try {
      // Shared to all spaces (`*`); force is required to delete multi-namespace objects.
      await this.soClient.delete(type, id, { force: true });
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }
  }

  private async rollbackConfiguration(
    previousConfiguration: SavedObject<StreamsConfigurationSavedObjectAttributes> | undefined,
    configurationSavedObjectId: string
  ): Promise<void> {
    if (!previousConfiguration) {
      await this.deleteSavedObject(
        STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
        configurationSavedObjectId
      );
      return;
    }

    await this.soClient.create<StreamsConfigurationSavedObjectAttributes>(
      STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
      previousConfiguration.attributes,
      {
        id: previousConfiguration.id,
        overwrite: true,
        initialNamespaces: [ALL_SPACES_ID],
        references: previousConfiguration.references,
      }
    );
  }
}
