/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import type {
  ActionTypeExecutorOptions,
  SpecVersionsContract,
  ValidatorServices,
} from '../../types';
import { SpecVersionUnavailableError } from '../errors';
import { parseSpecVersion } from '../resolve_connector_spec_version';
import type { CatalogActionType } from './types';

type SpecValidatorKey = 'config' | 'secrets' | 'params';
type SpecExecutorOptions = ActionTypeExecutorOptions<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>
>;

export interface BuiltSpecVersion {
  /** Exact major.minor. */
  version: string;
  /** Single-version type from buildTypeFromStoredSpec. Must have `spec`. */
  type: CatalogActionType;
}

export interface VersionedConnectorType {
  readonly id: string;
  /** The single registry entry for this id. */
  readonly actionType: CatalogActionType;
  hasVersion(version: string): boolean;
  /** Adds a built version. A version that is already present is ignored. */
  addVersion(built: BuiltSpecVersion): void;
}

interface ParsedVersion {
  major: number;
  minor: number;
}

const parseExactVersion = (id: string, version: string): ParsedVersion => {
  const { major, minor } = parseSpecVersion(version) ?? {};
  if (major === undefined || minor === undefined) {
    throw new Error(`Spec version "${version}" of connector type "${id}" is not "major.minor".`);
  }
  return { major, minor };
};

/** Builds the one registry entry of a connector id that dispatches on the connector pin. */
export const createVersionedConnectorType = ({
  id,
  versions,
}: {
  id: string;
  versions: BuiltSpecVersion[];
}): VersionedConnectorType => {
  const types = new Map<string, CatalogActionType>();
  // Same Map object for the lifetime of the entry. The registry keeps it and sees new versions.
  const specs = new Map<string, ConnectorSpec>();
  const latestPerMajor = new Map<number, ParsedVersion>();

  const addVersion = ({ version, type }: BuiltSpecVersion): void => {
    if (type.id !== id) {
      throw new Error(`Connector type "${id}" cannot serve a spec built for "${type.id}".`);
    }
    if (!type.spec) {
      throw new Error(`Spec version "${version}" of connector type "${id}" has no spec.`);
    }
    const parsed = parseExactVersion(id, version);
    if (types.has(version)) {
      return;
    }

    types.set(version, type);
    specs.set(version, type.spec);
    const latest = latestPerMajor.get(parsed.major);
    if (latest === undefined || parsed.minor > latest.minor) {
      latestPerMajor.set(parsed.major, parsed);
    }
  };

  if (versions.length === 0) {
    throw new Error(`Connector type "${id}" needs at least one spec version.`);
  }
  versions.forEach(addVersion);

  const toVersion = ({ major, minor }: ParsedVersion): string => `${major}.${minor}`;

  /** Newest accepted 1.y. Without a 1.y a connector without a pin cannot run. */
  const newestMajor1 = (): string => {
    const latest = latestPerMajor.get(1);
    if (!latest) {
      throw new SpecVersionUnavailableError({
        reason: 'not_loaded',
        actionTypeId: id,
        specVersion: '1',
      });
    }
    return toVersion(latest);
  };

  /** Version shown for the entry: the newest 1.y, else the newest version overall. */
  const defaultVersion = (): string => {
    const latest = latestPerMajor.get(1) ?? latestPerMajor.get(Math.max(...latestPerMajor.keys()));
    if (!latest) {
      throw new Error(`Connector type "${id}" has no spec versions.`);
    }
    return toVersion(latest);
  };

  const getType = (version: string): CatalogActionType => {
    const type = types.get(version);
    if (!type) {
      throw new SpecVersionUnavailableError({
        reason: 'not_loaded',
        actionTypeId: id,
        specVersion: version,
      });
    }
    return type;
  };

  const getDefaultType = (): CatalogActionType => getType(defaultVersion());

  const getValidator = (type: CatalogActionType, key: SpecValidatorKey) => {
    const validator = type.validate[key];
    if (!validator) {
      throw new Error(`Connector type "${id}" has no ${key} validator for this spec version.`);
    }
    return validator;
  };

  const typeForServices = ({ specVersion }: ValidatorServices): CatalogActionType =>
    specVersion === undefined ? getDefaultType() : getType(specVersion);

  const createValidator = (key: SpecValidatorKey) => ({
    get schema() {
      return getValidator(getDefaultType(), key).schema;
    },
    resolveSchema: (validatorServices: ValidatorServices) =>
      getValidator(typeForServices(validatorServices), key).schema,
    customValidator: (value: Record<string, unknown>, validatorServices: ValidatorServices) =>
      typeForServices(validatorServices).validate[key]?.customValidator?.(value, validatorServices),
  });

  const specVersions: SpecVersionsContract = {
    getLatestVersions: () =>
      Object.fromEntries(
        [...latestPerMajor.values()]
          .sort((left, right) => left.major - right.major)
          .map((latest) => [String(latest.major), toVersion(latest)])
      ),
    resolveExecutionVersion: (pin) => {
      if (pin === undefined) {
        return newestMajor1();
      }
      getType(pin);
      return pin;
    },
  };

  const initial = getDefaultType();
  const defaultFields = {
    name: initial.name,
    description: initial.description,
    minimumLicenseRequired: initial.minimumLicenseRequired,
    supportedFeatureIds: initial.supportedFeatureIds,
    isExperimental: initial.isExperimental,
    source: initial.source,
  };

  const actionType: CatalogActionType = {
    id,
    ...defaultFields,
    get spec() {
      return getDefaultType().spec;
    },
    get specs() {
      return specs;
    },
    get isTestable() {
      return getDefaultType().isTestable;
    },
    get globalAuthHeaders() {
      return getDefaultType().globalAuthHeaders;
    },
    get sandboxSupportedAuthTypes() {
      return getDefaultType().sandboxSupportedAuthTypes;
    },
    getSandboxHosts: (args) => getDefaultType().getSandboxHosts?.(args) ?? [],
    specVersions,
    validate: {
      config: createValidator('config'),
      secrets: createValidator('secrets'),
      ...(initial.validate.params ? { params: createValidator('params') } : {}),
    },
    ...(initial.executor
      ? {
          executor: async (options: SpecExecutorOptions) => {
            const version = options.specVersion ?? newestMajor1();
            const type = getType(version);
            if (!type.executor) {
              throw new Error(
                `Spec version "${version}" of connector type "${id}" has no executor.`
              );
            }
            return type.executor({ ...options, globalAuthHeaders: type.globalAuthHeaders });
          },
        }
      : {}),
  };

  return {
    id,
    actionType,
    hasVersion: (version) => types.has(version),
    addVersion,
  };
};
