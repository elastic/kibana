/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: resolve an integration group (built by Fleet from member packages that bundle a
// `group.yml`, GET /internal/fleet/epm/groups) and its member packages from the package list. A
// member is the latest version in the list (the registry only lists versions compatible with this
// stack); a member that isn't listed is skipped, so a group can degrade to fewer schemas.
//
// A name that matches no group but an integration package with one policy template resolves to
// a "group of one": the plain package, shown through the same wizard (schema read from its
// package info).

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';

import { installationStatuses } from '../../common/constants';
import { getGroupDefaultSchema, getPackageSchema } from '../../common/services';
import type { IntegrationGroup, PackageListItem } from '../types';

import {
  sendGetPackageInfoByKeyForRq,
  useGetIntegrationGroupsQuery,
  useGetPackagesQuery,
} from './use_request';

export interface GroupMemberOption {
  schema: string;
  packageName: string;
  /** Resolved member list item (latest compatible version in the registry). */
  child: PackageListItem;
  isInstalled: boolean;
}

/** Installed version, else the latest listed one. */
export const getGroupChildVersion = (option: Pick<GroupMemberOption, 'child'>) =>
  option.child?.installationInfo?.version ?? option.child?.version;

/** Package info options shared with the wizard, so the react-query cache is shared too. */
export const getMemberInfoQueryOptions = (child: PackageListItem) => ({
  full: true,
  prerelease: child.release !== 'ga',
});

/** One option per member package that is in `items`, in group member order. */
export const getGroupMemberOptions = (
  group: IntegrationGroup,
  items: PackageListItem[]
): GroupMemberOption[] =>
  group.members.flatMap((member) => {
    const child = items.find((item) => item.name === member.package);
    if (!child) return [];
    return [
      {
        schema: member.schema,
        packageName: member.package,
        child,
        isInstalled: child.installationInfo?.install_status === installationStatuses.Installed,
      },
    ];
  });

/** Default member option: group.yml `default`, else the first listed member. */
export const getDefaultMemberOption = (
  group: Pick<IntegrationGroup, 'default'>,
  options: GroupMemberOption[]
) => options.find((o) => o.packageName === group.default) ?? options[0];

/** Can this plain package open the wizard as a group of one? */
export const isGroupOfOneCandidate = (item: PackageListItem) =>
  (item.type ?? 'integration') === 'integration' && (item.policy_templates ?? []).length === 1;

const toGroupOfOne = (item: PackageListItem, schema: string): IntegrationGroup => ({
  name: item.name,
  title: item.title,
  description: item.description,
  default: item.name,
  members: [{ package: item.name, version: item.version, title: item.title, schema }],
});

export const useGroupPackage = (groupName?: string) => {
  const groupsQuery = useGetIntegrationGroupsQuery({ enabled: !!groupName });
  // Members (e.g. OTel packages) are often prereleases, so always include them here.
  const packagesQuery = useGetPackagesQuery({ prerelease: true }, { enabled: !!groupName });

  const groups = groupsQuery.data?.items;
  const items = packagesQuery.data?.items;
  const realGroup = groupName ? groups?.find((g) => g.name === groupName) : undefined;
  const singleItem =
    groupName && groups && !realGroup
      ? items?.find((item) => item.name === groupName && isGroupOfOneCandidate(item))
      : undefined;

  // Group of one: the schema is a package property, read from its package info.
  const singleVersion = singleItem ? getGroupChildVersion({ child: singleItem }) : undefined;
  const singleInfoOptions = singleItem ? getMemberInfoQueryOptions(singleItem) : undefined;
  const singleInfoQuery = useQuery({
    queryKey: [singleItem?.name, singleVersion, singleInfoOptions],
    queryFn: () => sendGetPackageInfoByKeyForRq(singleItem!.name, singleVersion, singleInfoOptions),
    enabled: !!singleItem && !!singleVersion,
    refetchOnWindowFocus: false,
  });
  const singleInfo = singleInfoQuery.data?.item;

  return useMemo(() => {
    const group =
      realGroup ??
      (singleItem && singleInfo
        ? toGroupOfOne(singleItem, getPackageSchema(singleInfo))
        : undefined);
    const options = group ? getGroupMemberOptions(group, items ?? []) : [];
    return {
      isLoading:
        groupsQuery.isLoading ||
        packagesQuery.isLoading ||
        (!!singleItem && !singleInfo && !singleInfoQuery.error),
      error: groupsQuery.error ?? packagesQuery.error ?? singleInfoQuery.error,
      group,
      isGroupOfOne: !realGroup && !!group,
      options,
      defaultSchema: group ? getGroupDefaultSchema(group) : undefined,
    };
  }, [
    realGroup,
    singleItem,
    singleInfo,
    items,
    groupsQuery.isLoading,
    groupsQuery.error,
    packagesQuery.isLoading,
    packagesQuery.error,
    singleInfoQuery.error,
  ]);
};
