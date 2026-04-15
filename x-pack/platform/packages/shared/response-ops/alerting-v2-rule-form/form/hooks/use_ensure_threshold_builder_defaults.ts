/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import { DEFAULT_THRESHOLD_DATA_SOURCE } from '../threshold_builder_constants';

/**
 * Ensures threshold builder slice fields exist when the guided threshold UI is shown
 * (for example after toggling from ES|QL on a create flow that did not deep-link with ?builder=).
 */
export const useEnsureThresholdBuilderDefaults = (enabled: boolean): void => {
  const { getValues, setValue } = useFormContext<FormValues>();

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const stats = getValues('thresholdStats');
    if (!stats || stats.length === 0) {
      setValue('thresholdStats', [{ label: '', aggregation: 'avg', field: '' }], {
        shouldDirty: false,
      });
    }
    if (getValues('thresholdConditionCombinator') === undefined) {
      setValue('thresholdConditionCombinator', 'and', { shouldDirty: false });
    }
    const conditions = getValues('thresholdConditions');
    if (!conditions || conditions.length === 0) {
      setValue('thresholdConditions', [{ statLabel: '', operator: 'gt', value: '' }], {
        shouldDirty: false,
      });
    }
    if (!getValues('thresholdDataSource')) {
      setValue('thresholdDataSource', DEFAULT_THRESHOLD_DATA_SOURCE, { shouldDirty: false });
    }
  }, [enabled, getValues, setValue]);
};
