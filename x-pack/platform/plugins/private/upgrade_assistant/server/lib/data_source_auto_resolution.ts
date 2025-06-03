/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSourceAutoResolution } from '../../common/types';

export const defaultAutoResolution: DataSourceAutoResolution = {
  'apm-7.*': 'readOnly',
};

export const matchAutoResolutionPattern = (indexName: string) => {
  const result = Object.entries(defaultAutoResolution).find(([excludedPattern]) => {
    const isPattern = /.+\*$/.test(excludedPattern);
    if (isPattern) {
      const matcher = excludedPattern.slice(0, -1);
      return indexName.startsWith(matcher);
    }
    return indexName === excludedPattern;
  });

  if (!result) {
    return null;
  }

  return result[1];
};
