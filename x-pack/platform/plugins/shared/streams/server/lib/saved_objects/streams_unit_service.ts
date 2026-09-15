/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
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
import type { PublishUnitConfig } from '../unit_config/types';

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

export class StreamsUnitService {
  private readonly soClient: SavedObjectsClientContract;
  private readonly logger: Logger;
  private readonly publishUnit: PublishUnitConfig;
  private readonly encryptedSavedObjectsClient?: EncryptedSavedObjectsClient;
  private readonly canEncrypt: boolean;

  constructor({
    soClient,
    logger,
    publishUnit = async () => {},
    encryptedSavedObjectsClient,
    canEncrypt = false,
  }: {
    soClient: SavedObjectsClientContract;
    logger: Logger;
    publishUnit?: PublishUnitConfig;
    encryptedSavedObjectsClient?: EncryptedSavedObjectsClient;
    canEncrypt?: boolean;
  }) {
    this.soClient = soClient;
    this.logger = logger;
    this.publishUnit = publishUnit;
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
    this.canEncrypt = canEncrypt;
  }

  async getUnit(unitId: string): Promise<StreamsUnit.GetResponse> {
    const configuration = await this.getConfigurationSavedObject(unitId);

    if (!configuration) {
      throw new StatusError(`Streams unit [${unitId}] not found.`, 404);
    }

    const uiMetadata = await this.getUiMetadataSavedObject(configuration.id);

    return {
      unit: configuration.attributes.unit,
      ui_metadata: uiMetadata?.attributes.metadata ?? {},
    };
  }

  async upsertUnit({
    unitId,
    unit,
    ui_metadata: uiMetadata,
    secrets,
  }: {
    unitId: string;
    unit: StreamsUnit.Configuration;
    ui_metadata: StreamsUnit.UiMetadata;
    secrets?: StreamsUnit.Secrets;
  }): Promise<void> {
    if (!this.canEncrypt) {
      throw new StatusError(
        'Cannot store Streams unit credentials: encrypted saved objects are not configured.',
        503
      );
    }

    const existingConfiguration = await this.getDecryptedConfigurationSavedObject(unitId);
    // GET omits secrets, and the UI only sends newly entered ones. Merge
    // those secrets with the stored secrets, do not replace them.
    const secretsToStore = mergeUnitSecrets(secrets, existingConfiguration?.attributes.secrets);

    // Always overwrite the full document. Partial `soClient.update` must not
    // touch `secrets` or `unit_id` (ESO encrypted / AAD attributes).
    await this.writeConfiguration({
      savedObjectId: unitId,
      unitId,
      unit,
      secrets: secretsToStore,
    });

    try {
      await this.publishUnit({ unitId, unit, secrets: secretsToStore });
    } catch (error) {
      this.logger.error(`Failed to publish Streams unit [${unitId}]: ${error}`);
      await this.rollbackConfiguration(existingConfiguration, unitId).catch((rollbackError) => {
        this.logger.error(
          `Failed to roll back Streams unit [${unitId}] after publish failure: ${rollbackError}`
        );
      });
      throw error;
    }

    await this.writeUiMetadata({
      configurationSavedObjectId: unitId,
      metadata: pruneStaleNodeMetadata(uiMetadata, unit),
    });
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
  }: {
    savedObjectId: string;
    unitId: string;
    unit: StreamsUnit.Configuration;
    secrets: StreamsUnit.Secrets;
  }): Promise<void> {
    await this.soClient.create<StreamsConfigurationSavedObjectAttributes>(
      STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
      { unit_id: unitId, unit, secrets },
      {
        id: savedObjectId,
        overwrite: true,
        references: [
          {
            name: STREAMS_METADATA_REFERENCE_NAME,
            type: STREAMS_UI_METADATA_SAVED_OBJECT_TYPE,
            id: getStreamsUiMetadataSavedObjectId(savedObjectId),
          },
        ],
      }
    );
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
      }
    );
  }

  private async deleteSavedObject(type: string, id: string): Promise<void> {
    try {
      await this.soClient.delete(type, id);
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
      await this.soClient.delete(
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
        references: previousConfiguration.references,
      }
    );
  }
}
