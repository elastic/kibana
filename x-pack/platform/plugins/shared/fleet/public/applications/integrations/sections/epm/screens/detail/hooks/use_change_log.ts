/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetFileByPathQuery } from '../../../../../hooks';
import { parseYamlChangelog } from '../utils';

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
  const { data, error, isLoading } = useGetFileByPathQuery(
    `/package/${packageName}/${latestVersion}/changelog.yml`
  );

  const changelog = parseYamlChangelog(data, latestVersion, currentVersion);

  return {
    changelog,
    error,
    isLoading,
  };
};
