/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConnectorSpec } from '@kbn/connector-specs';
import type { ActionTypeExecutorOptions, SpecVersionsContract, ValidatorServices } from '../types';
import type { PluginSetupContract as ActionsPluginSetupContract } from '../plugin';
import { createConnectorTypeFromSpec } from '../lib/single_file_connectors/create_connector_from_spec';
import { SpecVersionRequestError } from '../lib/errors/spec_version_request_error';
import type { CatalogActionType, BuiltVersion, TypeMetadataState } from './types';
import { withTypeMetadata } from './build_spec';
import {
  compareSpecVersions,
  isExactVersion,
  isMajorRequest,
  parseSpecVersion,
} from './spec_version_format';

type SpecValidatorKey = 'config' | 'secrets' | 'params';
type SpecExecutorOptions = ActionTypeExecutorOptions<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>
>;

export interface VersionedConnectorTypeOptions {
  id: string;
  versions: BuiltVersion[];
  metadata: TypeMetadataState;
  actions: ActionsPluginSetupContract;
  logger: Logger;
  loadVersion?: (id: string, version: string) => Promise<BuiltVersion>;
}

/** One registry entry per connector id that dispatches on the connector instance pin. */
export interface VersionedConnectorType {
  readonly id: string;
  readonly actionType: CatalogActionType;
  addVersion(materialized: BuiltVersion): void;
  updateMetadata(next: TypeMetadataState): void;
  getMetadata(): TypeMetadataState;
  getLatestVersions(): Record<string, string>;
  getLatestVersion(major?: number): string | undefined;
  getVersions(): string[];
  hasVersion(version: string): boolean;
  getMaterialized(version: string): BuiltVersion | undefined;
}

interface VersionEntry {
  materialized: BuiltVersion;
  type: CatalogActionType;
}

export const createVersionedConnectorType = ({
  id,
  versions,
  metadata: initialMetadata,
  actions,
  logger,
  loadVersion,
}: VersionedConnectorTypeOptions): VersionedConnectorType => {
  const entries = new Map<string, VersionEntry>();
  const latestPerMajor = new Map<number, string>();
  const inFlight = new Map<string, Promise<VersionEntry>>();
  let metadata: TypeMetadataState = { ...initialMetadata };

  const specFor = (materialized: BuiltVersion): ConnectorSpec =>
    withTypeMetadata(id, materialized.spec, metadata);

  const assertSameId = (materialized: BuiltVersion): void => {
    if (materialized.id !== id) {
      throw new Error(
        `Connector type "${id}" cannot serve spec "${materialized.id}@${materialized.version}".`
      );
    }
  };

  const recordLatest = (version: string): void => {
    const { major } = parseSpecVersion(version);
    const current = latestPerMajor.get(major);
    if (current === undefined || compareSpecVersions(version, current) > 0) {
      latestPerMajor.set(major, version);
    }
  };

  const materialize = (materialized: BuiltVersion): VersionEntry => {
    assertSameId(materialized);
    const entry: VersionEntry = {
      materialized,
      type: createConnectorTypeFromSpec(specFor(materialized), actions),
    };
    entries.set(materialized.version, entry);
    recordLatest(materialized.version);
    return entry;
  };

  for (const materialized of versions) {
    materialize(materialized);
  }
  if (latestPerMajor.size === 0) {
    throw new Error(`Connector type "${id}" has no materialized spec versions.`);
  }

  const newestMajor = (): number => Math.max(...latestPerMajor.keys());

  const selectedVersion = (): string => {
    const version = latestPerMajor.get(newestMajor());
    if (version === undefined) {
      throw new Error(`Connector type "${id}" has no accepted spec versions.`);
    }
    return version;
  };

  const latestOfMajor = (major: number): string => {
    const version = latestPerMajor.get(major);
    if (version === undefined) {
      throw new SpecVersionRequestError({
        reason: 'no_version_for_major',
        actionTypeId: id,
        requested: String(major),
        message: `Connector type "${id}" has no accepted spec version for major ${major}`,
      });
    }
    return version;
  };

  const selectedEntry = (): VersionEntry => {
    const version = selectedVersion();
    const entry = entries.get(version);
    if (!entry) {
      throw new Error(`Connector type "${id}" lost spec version "${version}".`);
    }
    return entry;
  };

  const major1Entry = (): VersionEntry => {
    const version = latestOfMajor(1);
    const entry = entries.get(version);
    if (!entry) {
      throw new Error(`Connector type "${id}" lost spec version "${version}".`);
    }
    return entry;
  };

  const loadedEntry = (version: string | undefined): VersionEntry => {
    if (version === undefined) {
      return major1Entry();
    }
    const entry = entries.get(version);
    if (!entry) {
      throw new Error(
        `Spec version "${version}" of connector type "${id}" is not loaded on this node.`
      );
    }
    return entry;
  };

  const ensureEntry = async (version: string): Promise<VersionEntry> => {
    const loaded = entries.get(version);
    if (loaded) {
      return loaded;
    }
    if (!loadVersion) {
      throw new SpecVersionRequestError({
        reason: 'not_stored',
        actionTypeId: id,
        requested: version,
        message: `Spec version "${version}" of connector type "${id}" is not stored in this cluster; retry after the next catalog reload or check that it exists`,
      });
    }
    const pending = inFlight.get(version);
    if (pending) {
      return pending;
    }
    const promise = loadVersion(id, version)
      .then((materialized) => entries.get(version) ?? materialize(materialized))
      .catch((error) => {
        throw new SpecVersionRequestError({
          reason: 'not_stored',
          actionTypeId: id,
          requested: version,
          message: `Spec version "${version}" of connector type "${id}" is not stored in this cluster; retry after the next catalog reload or check that it exists${
            error instanceof Error && error.message ? ` (${error.message})` : ''
          }`,
        });
      })
      .finally(() => inFlight.delete(version));
    inFlight.set(version, promise);
    return promise;
  };

  const getLatestVersions = (): Record<string, string> =>
    Object.fromEntries(
      [...latestPerMajor.entries()]
        .sort(([left], [right]) => left - right)
        .map(([major, version]) => [String(major), version])
    );

  const getLatestVersion = (major?: number): string | undefined => {
    if (major === undefined) {
      return latestPerMajor.get(newestMajor());
    }
    return latestPerMajor.get(major);
  };

  const resolveRequest = async (
    request: string | undefined,
    currentMajor?: number
  ): Promise<string> => {
    if (request === undefined) {
      return latestOfMajor(currentMajor ?? 1);
    }
    if (isMajorRequest(request)) {
      return latestOfMajor(Number(request));
    }
    if (!isExactVersion(request)) {
      throw new SpecVersionRequestError({
        reason: 'invalid_request',
        actionTypeId: id,
        requested: request,
        message: `Spec version "${request}" is not a valid N or N.M request`,
      });
    }
    await ensureEntry(request);
    return request;
  };

  const validatorSchema = (entry: VersionEntry, key: SpecValidatorKey) => {
    const schema = entry.type.validate[key]?.schema;
    if (!schema) {
      throw new Error(`Connector type "${id}" has no ${key} validator.`);
    }
    return schema;
  };

  const validator = (key: SpecValidatorKey) => ({
    get schema() {
      return validatorSchema(selectedEntry(), key);
    },
    resolveSchema: (services: ValidatorServices) =>
      validatorSchema(loadedEntry(services.specVersion), key),
    customValidator: (value: Record<string, unknown>, services: ValidatorServices) =>
      loadedEntry(services.specVersion).type.validate[key]?.customValidator?.(value, services),
  });

  const specVersions: SpecVersionsContract = {
    getLatestVersions,
    getLatestVersion,
    hasVersion: (version: string) => entries.has(version),
    getSpec: async (version: string): Promise<ConnectorSpec> =>
      specFor((await ensureEntry(version)).materialized),
    resolveRequest,
  };

  const actionType: CatalogActionType = {
    id,
    get name() {
      return metadata.displayName;
    },
    get minimumLicenseRequired() {
      return metadata.minimumLicense;
    },
    get supportedFeatureIds() {
      return metadata.supportedFeatureIds;
    },
    get source() {
      return selectedEntry().type.source;
    },
    get description() {
      return metadata.description;
    },
    get isExperimental() {
      return metadata.isTechnicalPreview;
    },
    get isTestable() {
      return selectedEntry().type.isTestable;
    },
    get globalAuthHeaders() {
      return selectedEntry().type.globalAuthHeaders;
    },
    get connectorSpec() {
      return specFor(selectedEntry().materialized);
    },
    specVersions,
    validate: {
      config: validator('config'),
      secrets: validator('secrets'),
      params: validator('params'),
    },
    executor: async (options: SpecExecutorOptions) => {
      const { specVersion } = options;
      const version = specVersion === undefined ? latestOfMajor(1) : specVersion;
      const entry = await ensureEntry(version);
      if (!entry.type.executor) {
        throw new Error(
          `Spec version "${entry.materialized.version}" of connector type "${id}" has no executor.`
        );
      }
      return entry.type.executor(options);
    },
  };

  return {
    id,
    actionType,
    addVersion: (materialized) => {
      assertSameId(materialized);
      if (!entries.has(materialized.version)) {
        materialize(materialized);
      }
    },
    updateMetadata: (next) => {
      metadata = { ...next };
      logger.debug(
        `Updated catalog type metadata for "${id}" (license=${next.minimumLicense}, preview=${
          next.isTechnicalPreview === true
        })`
      );
    },
    getMetadata: () => metadata,
    getLatestVersions,
    getLatestVersion,
    getVersions: () => [...entries.keys()].sort(compareSpecVersions),
    hasVersion: (version) => entries.has(version),
    getMaterialized: (version) => entries.get(version)?.materialized,
  };
};
