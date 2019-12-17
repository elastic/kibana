/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OverviewFilters } from '../../../../common/runtime_types';

type SupportedFields = 'locations' | 'ports' | 'schemes' | 'tags';

export const extractFilterAggsResults = (
  responseAggregations: Record<string, any>,
  keys: SupportedFields[]
): OverviewFilters => {
  const values: OverviewFilters = {
    locations: [],
    ports: [],
    schemes: [],
    tags: [],
  };
  keys.forEach(key => {
    const buckets = responseAggregations[key]?.term?.buckets ?? [];
    values[key] = buckets.map((item: { key: string | number }) => item.key);
  });
  return values;
};
