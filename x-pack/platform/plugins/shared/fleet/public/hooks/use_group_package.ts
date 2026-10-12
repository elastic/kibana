/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: resolve an integration group (a package with `schemas`) and its child integrations
// from the package list. Works the same for the fixture and for real registry groups.

import { useMemo } from 'react';

import { installationStatuses } from '../../common/constants';
import { getGroupDefaultSchema, getGroupSchemaChildren } from '../../common/services';
import type { PackageListItem } from '../types';

import { useGetPackagesQuery } from './use_request';

export interface GroupSchemaOption {
  schema: string;
  packageName: string;
  versionConstraint: string;
  /** Resolved child list item (latest version in the registry), if available. */
  child?: PackageListItem;
  isInstalled: boolean;
}

export const useGroupPackage = (groupName?: string) => {
  // Children (e.g. OTel packages) are often prereleases, so always include them here.
  const { data, isLoading, error } = useGetPackagesQuery(
    { prerelease: true },
    { enabled: !!groupName }
  );

  return useMemo(() => {
    const items = data?.items ?? [];
    const group = groupName
      ? items.find((item) => item.name === groupName && item.schemas)
      : undefined;
    const options: GroupSchemaOption[] = group
      ? getGroupSchemaChildren(group).map((c) => {
          const child = items.find((item) => item.name === c.package);
          return {
            schema: c.schema,
            packageName: c.package,
            versionConstraint: c.version,
            child,
            isInstalled: child?.installationInfo?.install_status === installationStatuses.Installed,
          };
        })
      : [];
    return {
      isLoading,
      error,
      group,
      options,
      defaultSchema: group ? getGroupDefaultSchema(group) : undefined,
    };
  }, [data?.items, error, isLoading, groupName]);
};
