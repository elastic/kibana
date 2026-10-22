/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: resolve an integration group (a package with `schemas`) and its child packages
// from the package list. Works the same for the fixture and for real registry groups. A child is
// the latest version in the list (the registry only lists versions compatible with this stack);
// a schema whose package isn't listed is skipped, so a group can degrade to a single schema.

import { useMemo } from 'react';

import { installationStatuses } from '../../common/constants';
import { getGroupDefaultSchema, getGroupSchemaChildren } from '../../common/services';
import type { PackageListItem } from '../types';

import { useGetPackagesQuery } from './use_request';

export interface GroupSchemaOption {
  schema: string;
  packageName: string;
  /** Resolved child list item (latest compatible version in the registry). */
  child: PackageListItem;
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
      ? getGroupSchemaChildren(group).flatMap((c) => {
          const child = items.find((item) => item.name === c.package);
          if (!child) return [];
          return [
            {
              schema: c.schema,
              packageName: c.package,
              child,
              isInstalled:
                child.installationInfo?.install_status === installationStatuses.Installed,
            },
          ];
        })
      : [];
    const manifestDefault = group ? getGroupDefaultSchema(group) : undefined;
    return {
      isLoading,
      error,
      group,
      options,
      defaultSchema:
        options.find((o) => o.schema === manifestDefault)?.schema ?? options[0]?.schema,
    };
  }, [data?.items, error, isLoading, groupName]);
};
