/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFormContext, useWatch } from 'react-hook-form';
import type { FormValues } from '../types';
import { assembleFullQuery } from '../utils/assemble_full_query';
import { usePreview } from './use_preview';

// Re-export shared types for backward compatibility
export type { PreviewResult as RulePreviewResult, PreviewColumn } from './use_preview';

/**
 * Rule preview hook.
 *
 * Watches the evaluation form fields (base query + optional condition),
 * assembles the full query, and delegates to the generic `usePreview` hook
 * for ES|QL execution, debouncing, and result mapping.
 */
export const useRulePreview = () => {
  const { control } = useFormContext<FormValues>();

  const baseQuery = useWatch({ control, name: 'evaluation.query.base' });
  const condition = useWatch({ control, name: 'evaluation.query.condition' });
  const timeField = useWatch({ control, name: 'timeField' });
  const lookback = useWatch({ control, name: 'schedule.lookback' });
  const groupingFields = useWatch({ control, name: 'grouping.fields' }) ?? [];

  const fullQuery = assembleFullQuery(baseQuery, condition);

  return usePreview({
    query: fullQuery,
    timeField,
    lookback,
    groupingFields,
  });
};
