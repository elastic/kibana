/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import {
  AGGREGATE_STRATEGY_OPTIONS,
  GROUPING_MODE_OPTIONS,
  PER_EPISODE_STRATEGY_OPTIONS,
} from './form/constants';

const NOT_CONFIGURED_LABEL = i18n.translate('xpack.alertingV2.actionPolicy.labels.notConfigured', {
  defaultMessage: 'Not configured',
});

export const getGroupingModeLabel = (mode: GroupingMode | null | undefined): string => {
  if (mode == null) return NOT_CONFIGURED_LABEL;
  const match = GROUPING_MODE_OPTIONS.find((option) => option.id === mode);
  return match?.label ?? NOT_CONFIGURED_LABEL;
};

export const getThrottleStrategyLabel = (
  strategy: ThrottleStrategy | null | undefined,
  mode: GroupingMode | null | undefined
): string => {
  if (strategy == null || mode == null) return NOT_CONFIGURED_LABEL;
  const options =
    mode === 'per_episode' ? PER_EPISODE_STRATEGY_OPTIONS : AGGREGATE_STRATEGY_OPTIONS;
  const match = options.find((option) => option.value === strategy);
  return match?.text ?? NOT_CONFIGURED_LABEL;
};
