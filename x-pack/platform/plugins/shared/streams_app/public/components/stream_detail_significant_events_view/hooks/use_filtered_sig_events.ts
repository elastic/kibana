/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { SignificantEventItem } from '../../../hooks/use_fetch_significant_events';

export const useFilteredSigEvents = (response: SignificantEventItem[], queryString: string) => {
  const significantEvents = useMemo(() => {
    const values = response ?? [];
    if (queryString) {
      const lowerCaseQuery = queryString.toLowerCase();
      return values.filter(
        (item) =>
          item.title.toLowerCase().includes(lowerCaseQuery) ||
          item.query.system?.name.toLowerCase().includes(lowerCaseQuery) ||
          item.query.system?.name?.toLowerCase().includes(lowerCaseQuery) ||
          item.query.kql.query.toLowerCase().includes(lowerCaseQuery)
      );
    }
    return response ?? [];
  }, [response, queryString]);
  // calculate a combined query for all items
  const combinedQuery = useMemo(() => {
    if (significantEvents.length === 0) {
      return null;
    }
    const queries = significantEvents.map((item) => `(${item.query.kql.query})`);
    return queries.join(' OR ');
  }, [significantEvents]);

  return { significantEvents, combinedQuery };
};
