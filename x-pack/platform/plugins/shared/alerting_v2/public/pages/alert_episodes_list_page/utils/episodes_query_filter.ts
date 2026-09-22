/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodesFilterState } from '@kbn/alerting-v2-common-queries';
import { fromKueryExpression } from '@kbn/es-query';

export const isValidKql = (value: string): boolean => {
  try {
    fromKueryExpression(value);
    return true;
  } catch {
    return false;
  }
};

export const getQueryFilterState = (filterState: EpisodesFilterState): EpisodesFilterState => {
  if (!filterState.queryString || isValidKql(filterState.queryString)) {
    return filterState;
  }

  const { queryString: _invalidQueryString, ...validFilterState } = filterState;
  return validFilterState;
};
