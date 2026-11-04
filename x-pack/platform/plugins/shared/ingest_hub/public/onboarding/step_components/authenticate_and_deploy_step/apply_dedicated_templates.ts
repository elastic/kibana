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

/**
 * Opts the namespace in to dedicated index templates for each package, like Fleet's switch does
 * after a policy is saved. Only adds: a namespace that is already in the package's list is left
 * alone, and none is removed, since the list is shared with Fleet's own settings.
 *
 * @returns the packages that could not be updated.
 */
export const applyDedicatedNamespaceTemplates = async (
  packageNames: string[],
  namespace: string
): Promise<string[]> => {
  const results = await Promise.all(
    packageNames.map(async (packageName) => {
      const { data, error: infoError } = await sendGetPackageInfoByKey(packageName);
      // The installed version, which can differ from the latest one the info call describes.
      const installationInfo = data?.item?.installationInfo;
      if (infoError || !installationInfo?.version) return packageName;

      const enabledFor = installationInfo.namespace_customization_enabled_for ?? [];
      if (enabledFor.includes(namespace)) return undefined;

      const { error } = await sendUpdatePackage(packageName, installationInfo.version, {
        namespace_customization_enabled_for: [...enabledFor, namespace],
      });
      return error ? packageName : undefined;
    })
  );
  return results.filter((packageName): packageName is string => !!packageName);
};
