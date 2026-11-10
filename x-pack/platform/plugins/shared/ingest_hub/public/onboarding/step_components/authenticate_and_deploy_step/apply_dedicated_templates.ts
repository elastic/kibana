/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendGetPackageInfoByKey, sendUpdatePackage } from '@kbn/fleet-plugin/public';

import type { DeployGroup } from './deploy_groups';

/**
 * The packages whose policies deploy into the global namespace. A duplicate with a namespace of
 * its own is left out, so the switch never touches templates other policies may share.
 */
export const getGlobalNamespacePackages = (
  groups: DeployGroup[],
  globalNamespace: string
): string[] => {
  if (!globalNamespace) return [];
  const packageNames = groups
    .filter((group) => group.namespace === globalNamespace)
    .flatMap((group) => group.members.map(({ service }) => service.packageName));
  return [...new Set(packageNames)];
};

export interface ApplyDedicatedTemplatesResult {
  /** The packages that could not be updated. */
  failedPackages: string[];
  /**
   * The data streams whose dedicated template an existing index template overrides or blocks, so
   * the dedicated one has no effect. Fleet still opts the namespace in and reports these.
   */
  blockedDataStreams: string[];
  /**
   * The data streams where the dedicated template takes priority over an existing custom one, so
   * that template's settings stop applying.
   */
  overriddenDataStreams: string[];
}

interface PackageResult {
  packageName: string;
  failed: boolean;
  blocked?: string[];
  overridden?: string[];
}

// Fleet does not export its conflict types to other plugins, so take the type from what the update
// call returns.
type UpdatePackageData = NonNullable<Awaited<ReturnType<typeof sendUpdatePackage>>['data']>;
type ConflictType = NonNullable<
  UpdatePackageData['warnings']
>[number]['conflictingTemplates'][number]['conflictType'];

type ConflictOutcome = 'blocked' | 'overridden';

/**
 * What each conflict type means for the dedicated template. A record over every type Fleet reports,
 * so a new type fails to compile here instead of being counted as one of the two by default.
 */
const CONFLICT_OUTCOME: Record<ConflictType, ConflictOutcome> = {
  // An existing template has a higher priority than the dedicated one, or the same priority so the
  // dedicated one is not created: either way the dedicated template has no effect.
  overrides_fleet: 'blocked',
  blocked_by_same_priority: 'blocked',
  // The dedicated template has a higher priority than an existing custom one, which stops applying.
  overridden_by_fleet: 'overridden',
};

// A type from a newer server than this client knows is still reported, as the cautious reading.
const getConflictOutcome = (conflictType: ConflictType): ConflictOutcome =>
  CONFLICT_OUTCOME[conflictType] ?? 'blocked';

/**
 * Opts the namespace in to dedicated index templates for each package, like Fleet's switch does
 * after a policy is saved. Only adds: a namespace that is already in the package's list is left
 * alone, and none is removed, since the list is shared with Fleet's own settings.
 */
export const applyDedicatedNamespaceTemplates = async (
  packageNames: string[],
  namespace: string
): Promise<ApplyDedicatedTemplatesResult> => {
  const results = await Promise.all(
    packageNames.map(async (packageName): Promise<PackageResult> => {
      const { data, error: infoError } = await sendGetPackageInfoByKey(packageName);
      // The installed version, which can differ from the latest one the info call describes.
      const installationInfo = data?.item?.installationInfo;
      if (infoError || !installationInfo?.version) return { packageName, failed: true };

      const enabledFor = installationInfo.namespace_customization_enabled_for ?? [];
      if (enabledFor.includes(namespace)) return { packageName, failed: false };

      const { data: updated, error } = await sendUpdatePackage(
        packageName,
        installationInfo.version,
        { namespace_customization_enabled_for: [...enabledFor, namespace] }
      );
      const warnings = updated?.warnings ?? [];
      const dataStreamsWhere = (outcome: ConflictOutcome) =>
        warnings
          .filter(({ conflictingTemplates }) =>
            conflictingTemplates.some(
              ({ conflictType }) => getConflictOutcome(conflictType) === outcome
            )
          )
          .map(({ dataStreamName }) => dataStreamName);
      return {
        packageName,
        failed: !!error,
        blocked: dataStreamsWhere('blocked'),
        overridden: dataStreamsWhere('overridden'),
      };
    })
  );
  return {
    failedPackages: results.filter(({ failed }) => failed).map(({ packageName }) => packageName),
    blockedDataStreams: [...new Set(results.flatMap(({ blocked }) => blocked ?? []))],
    overriddenDataStreams: [...new Set(results.flatMap(({ overridden }) => overridden ?? []))],
  };
};
