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
  /** Optional default time field */
  defaultTimeField?: string;
}

/**
 * Computes the default form values based on the provided ES|QL query.
 *
 * This hook extracts:
 * - groupingKey: columns from the STATS ... BY clause
 *
 * By computing all defaults upfront, we avoid useEffect-based synchronization
 * after the form is initialized.
 */
export const useFormDefaults = ({ query, defaultTimeField }: UseFormDefaultsProps): FormValues => {
  return useMemo(() => {
    // Extract grouping columns from STATS ... BY clause
    const groupingKey = getGroupByColumnsFromQuery(query);

    return {
      kind: 'alert',
      name: '',
      description: '',
      tags: [],
      schedule: {
        custom: '5m',
      },
      lookbackWindow: '5m',
      timeField: defaultTimeField ?? '',
      enabled: true,
      query,
      groupingKey,
    };
  }, [query, defaultTimeField]);
};
