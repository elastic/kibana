/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';

import { useGetFileByPathQuery } from '../../../../../hooks';
import { getBreakingChanges, parseYamlChangelog } from '../utils';

/**
 * @param packageName the package to get the changelog for
 * @param latestVersion the version of changelog for the specified package
 * @param currentVersion is used to display the changelog starting from this version up to the latest version
 */
export const useChangelog = (
  packageName: string,
  latestVersion: string,
  currentVersion?: string
) => {
  const {
    data,
    error: getFileError,
    isLoading,
  } = useGetFileByPathQuery(`/package/${packageName}/${latestVersion}/changelog.yml`);

  const error = getFileError?.statusCode === 404 ? null : getFileError;

  const changelog = useMemo(() => {
    return parseYamlChangelog(data, latestVersion, currentVersion);
  }, [data, latestVersion, currentVersion]);

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
