/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSource, DataSourceType } from '../../common';

const getDataSourceRegion = (dataSource: DataSource): string =>
  dataSource.type === 's3' ? dataSource.settings.region?.trim() ?? '' : '';

/**
 * Existing data sources that could read a URI of this type and region. Data
 * sources do not store buckets, so type and region are all there is to match on.
 * A source without a region is treated as a candidate for any region.
 */
const getCandidateDataSources = (
  dataSources: readonly DataSource[],
  type: DataSourceType,
  detectedRegion: string
): DataSource[] => {
  const trimmedRegion = detectedRegion.trim();

  return dataSources.filter((dataSource) => {
    if (dataSource.type !== type) {
      return false;
    }

    const region = getDataSourceRegion(dataSource);

    return !trimmedRegion || !region || region === trimmedRegion;
  });
};

/**
 * The single unambiguous match for a URI, or undefined when there is none or
 * more than one. Only an unambiguous match is worth pre-selecting for the user.
 */
export const findMatchingDataSource = (
  dataSources: readonly DataSource[],
  type: DataSourceType,
  detectedRegion: string
): DataSource | undefined => {
  const candidates = getCandidateDataSources(dataSources, type, detectedRegion);

  return candidates.length === 1 ? candidates[0] : undefined;
};
