/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDescriptor, IndexPatternsFetcher } from '@kbn/data-views-plugin/server';

const ALERT_FIELDS_TIME_FILTER = {
  range: {
    '@timestamp': {
      gte: 'now-90d',
    },
  },
};

export const getAlertFieldsFromIndexFetcher = async (
  indexPatternsFetcher: IndexPatternsFetcher,
  indices: string[]
): Promise<FieldDescriptor[]> => {
  if (!indices || indices.length === 0) {
    return [];
  }

  try {
    const result = await indexPatternsFetcher.getFieldsForWildcard({
      pattern: indices,
      metaFields: ['_id', '_index'],
      fieldCapsOptions: { allow_no_indices: true },
      includeEmptyFields: false,
      indexFilter: ALERT_FIELDS_TIME_FILTER,
    });

    return result.fields;
  } catch (error) {
    if (error.meta && error.meta.statusCode === 403) {
      return [];
    }
    throw error;
  }
};
