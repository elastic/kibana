/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepmerge from 'deepmerge';

export const getAnomaliesFilterQuery = (filterQuery: string) => {
  const filterQueryObject = filterQuery ? JSON.parse(filterQuery) : {};
  const anomaliesFilterQuery = [
    {
      match_phrase: {
        result_type: 'record',
      },
    },
    {
      range: {
        record_score: {
          gte: 50,
        },
      },
    },
  ];
  const mergedFilterQuery = deepmerge(filterQueryObject, {
    bool: {
      filter: anomaliesFilterQuery,
    },
  });

  return JSON.stringify(mergedFilterQuery);
};
