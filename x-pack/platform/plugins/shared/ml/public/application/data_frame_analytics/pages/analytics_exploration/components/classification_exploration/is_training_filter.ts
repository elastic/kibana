/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResultsSearchQuery } from '../../../../common/analytics';
import { isResultsSearchBoolQuery } from '../../../../common/analytics';

export type IsTraining = boolean | undefined;

export function isTrainingFilter(
  searchQuery: ResultsSearchQuery,
  resultsField: string
): IsTraining {
  let isTraining: IsTraining;
  const query =
    isResultsSearchBoolQuery(searchQuery) && (searchQuery.bool.should || searchQuery.bool.filter);

  if (query !== undefined && query !== false) {
    for (let i = 0; i < query.length; i++) {
      const clause = query[i];

      if (clause.match && clause.match[`${resultsField}.is_training`] !== undefined) {
        isTraining = clause.match[`${resultsField}.is_training`];
        break;
      } else if (
        clause.bool &&
        (clause.bool.should !== undefined || clause.bool.filter !== undefined)
      ) {
        const innerQuery = clause.bool.should || clause.bool.filter;
        if (innerQuery !== undefined) {
          for (let j = 0; j < innerQuery.length; j++) {
            const innerClause = innerQuery[j];
            if (
              innerClause.match &&
              innerClause.match[`${resultsField}.is_training`] !== undefined
            ) {
              isTraining = innerClause.match[`${resultsField}.is_training`];
              break;
            }
          }
        }
      }
    }
  }

  return isTraining;
}
