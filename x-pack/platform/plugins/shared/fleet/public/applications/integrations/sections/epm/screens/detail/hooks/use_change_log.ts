/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';

import { useGetFileByPathQuery } from '../../../../../hooks';
import { getBreakingChanges, parseYamlChangelog } from '../utils';
import { type PackageInfo } from '../../../../../types';

/**
 * @param packageName the package to get the changelog for
 * @param latestVersion the version of changelog for the specified package
 * @param currentVersion is used to display the changelog starting from this version up to the latest version
 */
export const useChangelog = (packageInfo: PackageInfo, currentVersion?: string) => {
  const path = 'path' in packageInfo ? packageInfo.path : null;

  const { data, error, isLoading } = useGetFileByPathQuery(`${path}/changelog.yml`, {
    enabled: Boolean(path),
  });

  const changelog = useMemo(() => {
    return parseYamlChangelog(data, packageInfo.latestVersion, currentVersion);
  }, [data, packageInfo.latestVersion, currentVersion]);

  const breakingChanges = useMemo(() => {
    const _breakingChanges = getBreakingChanges(changelog);
    return _breakingChanges.length > 0 ? _breakingChanges : null;
  }, [changelog]);

  return {
    changelog,
    breakingChanges,
    error,
    isLoading,
  };
};
