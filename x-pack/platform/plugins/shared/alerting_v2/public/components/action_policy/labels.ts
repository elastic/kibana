/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import {
  AGGREGATE_STRATEGIES,
  needsInterval,
  PER_EPISODE_STRATEGIES,
} from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { GROUPING_MODE_OPTIONS } from './form/constants';
import { formatInterval } from './format_interval';

const NOT_CONFIGURED_LABEL = i18n.translate('xpack.alertingV2.actionPolicy.labels.notConfigured', {
  defaultMessage: 'Not configured',
});

export const DISPATCH_PER_LABEL = i18n.translate(
  'xpack.alertingV2.actionPolicyDefinition.dispatchMode',
  { defaultMessage: 'Dispatch per' }
);

export const GROUP_BY_LABEL = i18n.translate('xpack.alertingV2.actionPolicyDefinition.groupBy', {
  defaultMessage: 'Group by',
});

export const ACTION_POLICIES_LICENSE_REQUIRED_MESSAGE = i18n.translate(
  'xpack.alertingV2.actionPolicy.license.requiredMessage',
  {
    defaultMessage:
      'Action policies run Workflows, which require an active Enterprise license. You can view, disable, snooze, and delete existing policies, but you cannot create, edit, or enable them.',
  }
);

export const FREQUENCY_LABEL = i18n.translate('xpack.alertingV2.actionPolicyDefinition.frequency', {
  defaultMessage: 'Frequency',
});

export const getGroupingModeLabel = (mode: GroupingMode | null | undefined): string => {
  if (mode == null) return NOT_CONFIGURED_LABEL;
  const match = GROUPING_MODE_OPTIONS.find((option) => option.id === mode);
  return match?.label ?? NOT_CONFIGURED_LABEL;
};

interface ThrottleInput {
  strategy?: ThrottleStrategy;
  interval?: string | null;
}

/** Returns a humanized, self-contained frequency label for the given throttle and grouping mode. */
export const getFrequencyLabel = (
  throttle: ThrottleInput | null | undefined,
  mode: GroupingMode | null | undefined
): string => {
  const strategy = throttle?.strategy;
  if (strategy == null || mode == null) return NOT_CONFIGURED_LABEL;

  const allowed = mode === 'per_episode' ? PER_EPISODE_STRATEGIES : AGGREGATE_STRATEGIES;
  if (!allowed.has(strategy)) return NOT_CONFIGURED_LABEL;

  const interval = formatInterval(throttle?.interval ?? '');
  if (needsInterval(strategy) && !interval) return NOT_CONFIGURED_LABEL;

  switch (strategy) {
    case 'on_status_change':
      return i18n.translate('xpack.alertingV2.actionPolicy.labels.frequency.onStatusChange', {
        defaultMessage: 'On status change',
      });
    case 'per_status_interval':
      return i18n.translate('xpack.alertingV2.actionPolicy.labels.frequency.statusChangeRepeat', {
        defaultMessage: 'On status change + repeat every {interval}',
        values: { interval },
      });
    case 'time_interval':
      return i18n.translate('xpack.alertingV2.actionPolicy.labels.frequency.atMostOnce', {
        defaultMessage: 'At most once every {interval}',
        values: { interval },
      });
    case 'every_time':
      return i18n.translate('xpack.alertingV2.actionPolicy.labels.frequency.everyEvaluation', {
        defaultMessage: 'Every evaluation',
      });
  }
};
