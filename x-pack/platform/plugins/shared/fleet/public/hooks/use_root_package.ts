/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: resolve a root package (one with `schemas`) and its schema children from the
// package list. Works the same for the fixture and for real registry roots.

import { useMemo } from 'react';

import { installationStatuses } from '../../common/constants';
import { getRootDefaultSchema, getRootSchemaChildren } from '../../common/services';
import type { PackageListItem } from '../types';

import { useGetPackagesQuery } from './use_request';

export interface RootSchemaOption {
  schema: string;
  packageName: string;
  versionConstraint: string;
  /** Resolved child list item (latest version in the registry), if available. */
  child?: PackageListItem;
  isInstalled: boolean;
}

export const useRootPackage = (rootName?: string) => {
  // Children (e.g. OTel packages) are often prereleases, so always include them here.
  const { data, isLoading, error } = useGetPackagesQuery(
    { prerelease: true },
    { enabled: !!rootName }
  );

  return useMemo(() => {
    const items = data?.items ?? [];
    const root = rootName
      ? items.find((item) => item.name === rootName && item.schemas)
      : undefined;
    const options: RootSchemaOption[] = root
      ? getRootSchemaChildren(root).map((c) => {
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
      root,
      options,
      defaultSchema: root ? getRootDefaultSchema(root) : undefined,
    };
  }, [data?.items, error, isLoading, rootName]);
};
