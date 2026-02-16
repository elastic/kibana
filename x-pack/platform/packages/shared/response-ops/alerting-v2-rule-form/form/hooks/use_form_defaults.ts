/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { FormValues } from '../types';
import { getGroupByColumnsFromQuery } from './use_default_group_by';

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
 * Note: timeField is initialized as empty and auto-selected by TimeFieldSelect
 * based on the available date fields from the query.
 */
export const useFormDefaults = ({ query }: UseFormDefaultsProps): FormValues => {
  return useMemo(() => {
    // Extract grouping columns from STATS ... BY clause
    const groupingKey = getGroupByColumnsFromQuery(query);

    return {
      kind: 'alert',
      metadata: {
        name: '',
        enabled: true,
        description: '',
      },
      timeField: '', // Auto-selected by TimeFieldSelect when fields load
      schedule: {
        every: '5m',
        lookback: '1m',
      },
      evaluation: {
        query: {
          base: query,
        },
      },
      grouping: groupingKey.length
        ? {
            fields: groupingKey,
          }
        : undefined,
    };
  }, [query]);
};
