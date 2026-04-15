/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FormValues } from '../types';
import { buildThresholdEvaluationQuery } from '../utils/build_threshold_evaluation_query';

/**
 * Keeps `evaluation.query.base` in sync with threshold stat rows and group fields
 * when the threshold alert builder is active.
 */
export const useSyncThresholdEvaluationQuery = (enabled: boolean): void => {
  const { control, setValue } = useFormContext<FormValues>();
  const thresholdStats = useWatch({ control, name: 'thresholdStats' });
  const thresholdDataSource = useWatch({ control, name: 'thresholdDataSource' });
  const thresholdConditions = useWatch({ control, name: 'thresholdConditions' });
  const thresholdConditionCombinator = useWatch({ control, name: 'thresholdConditionCombinator' });
  const groupingFields = useWatch({ control, name: 'grouping.fields' });
  const timeField = useWatch({ control, name: 'timeField' });
  const scheduleEvery = useWatch({ control, name: 'schedule.every' });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const query = buildThresholdEvaluationQuery(
      thresholdStats,
      groupingFields,
      thresholdDataSource,
      thresholdConditions,
      thresholdConditionCombinator,
      timeField,
      scheduleEvery
    );
    setValue('evaluation.query.base', query, { shouldValidate: true, shouldDirty: true });
  }, [
    enabled,
    thresholdStats,
    thresholdDataSource,
    thresholdConditions,
    thresholdConditionCombinator,
    groupingFields,
    timeField,
    scheduleEvery,
    setValue,
  ]);
};
