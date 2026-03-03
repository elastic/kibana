/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { FormValues } from '../types';
import { useDefaultGroupBy } from './use_default_group_by';

interface UseFormDefaultsProps {
  /** The ES|QL query to derive defaults from */
  query: string;
}

/**
 * Computes the default form values based on the provided ES|QL query.
 *
 * This hook extracts:
 * - groupingKey: columns from the STATS ... BY clause
 *
 * Note: timeField defaults to '@timestamp' which is the most common time field.
 * TimeFieldSelect may update this if @timestamp is not available in the query results.
 */
export const useFormDefaults = ({ query }: UseFormDefaultsProps): FormValues => {
  const { defaultGroupBy } = useDefaultGroupBy({ query });

  return useMemo(
    () => ({
      kind: 'alert',
      metadata: {
        name: '',
        enabled: true,
        description: '',
      },
      timeField: '@timestamp', // Default to @timestamp; TimeFieldSelect may update if not available
      schedule: {
        every: '5m',
        lookback: '1m',
      },
      evaluation: {
        query: {
          base: query,
        },
      },
      grouping: defaultGroupBy.length
        ? {
            fields: defaultGroupBy,
          }
        : undefined,
    }),
    [query, defaultGroupBy]
  );
};
