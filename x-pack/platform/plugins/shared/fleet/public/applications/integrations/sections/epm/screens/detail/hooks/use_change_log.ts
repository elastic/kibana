/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetFileByPathQuery } from '../../../../../hooks';
import { getFormattedChangelog } from '../utils';

/**
 * @param packageName the package to get the change log for
 * @param version the version of change log for the specified package
 * @param fromVersion is used to display the change log starting from this version up to the request version
 */
export const useChangelog = (packageName: string, version: string, fromVersion?: string) => {
  const {
    data: fileResponse,
    error,
    isLoading,
  } = useGetFileByPathQuery(`/package/${packageName}/${version}/changelog.yml`);

  const changelogText = fileResponse?.data;

  const formattedChangelog = getFormattedChangelog(changelogText, version, fromVersion);

  return {
    formattedChangelog,
    error,
    isLoading,
  };
};
