/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  ActionTypeExecutorOptions,
  PluginSetupContract as ActionsPluginSetupContract,
  CatalogActionType,
  SpecVersionsContract,
  ValidatorServices,
} from '@kbn/actions-plugin/server';
import { createConnectorTypeFromSpec } from '@kbn/actions-plugin/server/lib';
import type { ConnectorSpec } from '@kbn/connector-specs';
import type { MaterializedSpec } from './load_declarative_specs';

type SpecValidatorKey = 'config' | 'secrets' | 'params';
type SpecExecutorOptions = ActionTypeExecutorOptions<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>
>;

export interface VersionedConnectorTypeOptions {
  id: string;
  /** Materialized versions available at build time. Must contain `activeVersion`. */
  versions: MaterializedSpec[];
  activeVersion: string;
  actions: ActionsPluginSetupContract;
  logger: Logger;
  /** Lazy loader for versions not yet materialized on this node. Rejects when unobtainable. */
  loadVersion?: (id: string, version: string) => Promise<MaterializedSpec>;
}

/** One registry entry per connector id that dispatches on the connector instance pin. */
export interface VersionedConnectorType {
  readonly id: string;
  readonly actionType: CatalogActionType;
  addVersion(materialized: MaterializedSpec): void;
  setActiveVersion(version: string): void;
  getActiveVersion(): string;
  getVersions(): string[];
  hasVersion(version: string): boolean;
  getMaterialized(version: string): MaterializedSpec | undefined;
}

interface VersionEntry {
  materialized: MaterializedSpec;
  type: CatalogActionType;
}

export const createVersionedConnectorType = ({
  id,
  versions,
  activeVersion,
  actions,
  logger,
  loadVersion,
}: VersionedConnectorTypeOptions): VersionedConnectorType => {
  const entries = new Map<string, VersionEntry>();
  const inFlight = new Map<string, Promise<VersionEntry>>();
  const warnedLegacyConnectors = new Set<string>();
  let active = activeVersion;

  const assertSameId = (materialized: MaterializedSpec): void => {
    if (materialized.id !== id) {
      throw new Error(
        `Connector type "${id}" cannot serve spec "${materialized.id}@${materialized.version}".`
      );
    }
  };

  const materialize = (materialized: MaterializedSpec): VersionEntry => {
    assertSameId(materialized);
    const entry: VersionEntry = {
      materialized,
      type: createConnectorTypeFromSpec(materialized.spec, actions),
    };
    entries.set(materialized.version, entry);
    return entry;
  };

  for (const materialized of versions) {
    materialize(materialized);
  }
  if (!entries.has(active)) {
    throw new Error(`Connector type "${id}" has no materialized active version "${active}".`);
  }

  const activeEntry = (): VersionEntry => {
    const entry = entries.get(active);
    if (!entry) {
      throw new Error(`Connector type "${id}" lost its active version "${active}".`);
    }
    return entry;
  };

  /** Synchronous lookup used by validators. The framework loads the pin before validating. */
  const loadedEntry = (version: string | undefined): VersionEntry => {
    if (version === undefined) {
      return activeEntry();
    }
    const entry = entries.get(version);
    if (!entry) {
      throw new Error(
        `Spec version "${version}" of connector type "${id}" is not loaded on this node.`
      );
    }
    return entry;
  };

  const ensureEntry = async (version: string | undefined): Promise<VersionEntry> => {
    if (version === undefined) {
      return activeEntry();
    }
    const loaded = entries.get(version);
    if (loaded) {
      return loaded;
    }
    if (!loadVersion) {
      throw new Error(`Spec version "${version}" of connector type "${id}" is not available.`);
    }
    const pending = inFlight.get(version);
    if (pending) {
      return pending;
    }
    const promise = loadVersion(id, version)
      .then((materialized) => entries.get(version) ?? materialize(materialized))
      .finally(() => inFlight.delete(version));
    inFlight.set(version, promise);
    return promise;
  };

  const warnLegacyOnce = (connectorId: string): void => {
    if (warnedLegacyConnectors.has(connectorId)) {
      return;
    }
    warnedLegacyConnectors.add(connectorId);
    logger.warn(
      `Connector "${connectorId}" of type "${id}" has no pinned spec version; using the active version "${active}". Upgrade the connector to pin it.`
    );
  };

  const validatorSchema = (entry: VersionEntry, key: SpecValidatorKey) => {
    const schema = entry.type.validate[key]?.schema;
    if (!schema) {
      throw new Error(`Connector type "${id}" has no ${key} validator.`);
    }
    return schema;
  };

  const validator = (key: SpecValidatorKey) => ({
    // `schema` reflects the active version for consumers that introspect the type directly.
    get schema() {
      return validatorSchema(activeEntry(), key);
    },
    resolveSchema: (services: ValidatorServices) =>
      validatorSchema(loadedEntry(services.specVersion), key),
    customValidator: (value: Record<string, unknown>, services: ValidatorServices) =>
      loadedEntry(services.specVersion).type.validate[key]?.customValidator?.(value, services),
  });

  const specVersions: SpecVersionsContract = {
    getActiveVersion: () => active,
    getActiveSpec: () => activeEntry().materialized.spec,
    getSpec: async (version?: string): Promise<ConnectorSpec> =>
      (await ensureEntry(version)).materialized.spec,
    hasVersion: (version: string) => entries.has(version),
  };

  const actionType: CatalogActionType = {
    id,
    get name() {
      return activeEntry().type.name;
    },
    get minimumLicenseRequired() {
      return activeEntry().type.minimumLicenseRequired;
    },
    get supportedFeatureIds() {
      return activeEntry().type.supportedFeatureIds;
    },
    get source() {
      return activeEntry().type.source;
    },
    get description() {
      return activeEntry().type.description;
    },
    get isExperimental() {
      return activeEntry().type.isExperimental;
    },
    get isTestable() {
      return activeEntry().type.isTestable;
    },
    get globalAuthHeaders() {
      return activeEntry().type.globalAuthHeaders;
    },
    get connectorSpec() {
      return activeEntry().materialized.spec;
    },
    specVersions,
    validate: {
      config: validator('config'),
      secrets: validator('secrets'),
      params: validator('params'),
    },
    executor: async (options: SpecExecutorOptions) => {
      const { specVersion, actionId } = options;
      if (specVersion === undefined) {
        warnLegacyOnce(actionId);
      }
      const entry = await ensureEntry(specVersion);
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
    setActiveVersion: (version) => {
      if (!entries.has(version)) {
        throw new Error(
          `Cannot activate spec version "${version}" of connector type "${id}": not materialized.`
        );
      }
      active = version;
    },
    getActiveVersion: () => active,
    getVersions: () => [...entries.keys()].sort(),
    hasVersion: (version) => entries.has(version),
    getMaterialized: (version) => entries.get(version)?.materialized,
  };
};
