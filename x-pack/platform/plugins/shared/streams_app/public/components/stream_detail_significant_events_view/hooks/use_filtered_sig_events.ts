/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { SignificantEventItem } from '../../../hooks/use_fetch_significant_events';

export const useFilteredSigEvents = (
  response: { significant_events: SignificantEventItem[] },
  queryString: string
) => {
  const significantEvents = useMemo(() => {
    const values = response.significant_events ?? [];
    if (queryString) {
      const lowerCaseQuery = queryString.toLowerCase();
      return values.filter(
        (item) =>
          item.query.title.toLowerCase().includes(lowerCaseQuery) ||
          item.query.feature?.name.toLowerCase().includes(lowerCaseQuery) ||
          item.query.feature?.name?.toLowerCase().includes(lowerCaseQuery) ||
          item.query.kql.query.toLowerCase().includes(lowerCaseQuery)
      );
    }
    return response.significant_events ?? [];
  }, [response.significant_events, queryString]);

  return significantEvents;
};
