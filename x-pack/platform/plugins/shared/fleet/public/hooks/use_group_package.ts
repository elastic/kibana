/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: resolve an integration group (from the registry `GET /groups`) and its member
// packages from the package list. A member is the latest version in the list (the registry only
// lists versions compatible with this stack); a schema whose package isn't listed is skipped, so a
// group can degrade to a single schema.

import { useMemo } from 'react';

import { installationStatuses } from '../../common/constants';
import { getGroupDefaultSchema, getGroupSchemaChildren } from '../../common/services';
import type { IntegrationGroup, PackageListItem } from '../types';

import { useGetIntegrationGroupsQuery, useGetPackagesQuery } from './use_request';

export interface GroupSchemaOption {
  schema: string;
  packageName: string;
  /** Resolved member list item (latest compatible version in the registry). */
  child: PackageListItem;
  isInstalled: boolean;
}

/** Schema options of a group: one per schema whose package is in `items`. */
export const getGroupSchemaOptions = (
  group: IntegrationGroup,
  items: PackageListItem[]
): GroupSchemaOption[] =>
  getGroupSchemaChildren(group).flatMap((c) => {
    const child = items.find((item) => item.name === c.package);
    if (!child) return [];
    return [
      {
        schema: c.schema,
        packageName: c.package,
        child,
        isInstalled: child.installationInfo?.install_status === installationStatuses.Installed,
      },
    ];
  });

/** List item whose icon the group tile uses: the `icon` member, else the first listed member. */
export const getGroupIconPackage = (
  group: IntegrationGroup,
  items: PackageListItem[]
): PackageListItem | undefined =>
  items.find((item) => item.name === group.icon) ?? getGroupSchemaOptions(group, items)[0]?.child;

export const useGroupPackage = (groupName?: string) => {
  const groupsQuery = useGetIntegrationGroupsQuery({ enabled: !!groupName });
  // Members (e.g. OTel packages) are often prereleases, so always include them here.
  const packagesQuery = useGetPackagesQuery({ prerelease: true }, { enabled: !!groupName });

  const groups = groupsQuery.data?.items;
  const items = packagesQuery.data?.items;
  return useMemo(() => {
    const group = groupName ? groups?.find((g) => g.name === groupName) : undefined;
    const options = group ? getGroupSchemaOptions(group, items ?? []) : [];
    const manifestDefault = group ? getGroupDefaultSchema(group) : undefined;
    return {
      isLoading: groupsQuery.isLoading || packagesQuery.isLoading,
      error: groupsQuery.error ?? packagesQuery.error,
      group,
      options,
      iconPackage: group ? getGroupIconPackage(group, items ?? []) : undefined,
      defaultSchema:
        options.find((o) => o.schema === manifestDefault)?.schema ?? options[0]?.schema,
    };
  }, [
    groupName,
    groups,
    items,
    groupsQuery.isLoading,
    groupsQuery.error,
    packagesQuery.isLoading,
    packagesQuery.error,
  ]);
};
