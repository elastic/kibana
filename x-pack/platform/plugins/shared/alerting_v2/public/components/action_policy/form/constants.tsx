/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { type ReactNode } from 'react';
import type { ActionPolicyFormState } from './types';

const boldChunks = (chunks: ReactNode) => <strong>{chunks}</strong>;

export const GROUPING_MODE_OPTIONS: Array<{ id: GroupingMode; label: string }> = [
  {
    id: 'per_episode',
    label: i18n.translate('xpack.alertingV2.actionPolicy.form.dispatch.mode.perAlert', {
      defaultMessage: 'Per alert',
    }),
  },
  {
    id: 'per_field',
    label: i18n.translate('xpack.alertingV2.actionPolicy.form.dispatch.mode.combined', {
      defaultMessage: 'Combined',
    }),
  },
  {
    id: 'all',
    label: i18n.translate('xpack.alertingV2.actionPolicy.form.dispatch.mode.combinedAll', {
      defaultMessage: 'Combined',
    }),
  },
];

/** UI-only: Group + Digest merged into Combined. */
export type GroupingModeUiOption = 'per_episode' | 'bundle';

export const GROUPING_MODE_UI_OPTIONS: Array<{ id: GroupingModeUiOption; label: string }> = [
  {
    id: 'per_episode',
    label: i18n.translate('xpack.alertingV2.actionPolicy.form.dispatch.mode.perAlert', {
      defaultMessage: 'Per alert',
    }),
  },
  {
    id: 'bundle',
    label: i18n.translate('xpack.alertingV2.actionPolicy.form.dispatch.mode.combined', {
      defaultMessage: 'Combined',
    }),
  },
];

export const groupingModeToUiOption = (groupingMode: GroupingMode): GroupingModeUiOption =>
  groupingMode === 'per_episode' ? 'per_episode' : 'bundle';

export const uiOptionToGroupingMode = (option: GroupingModeUiOption): GroupingMode =>
  option === 'per_episode' ? 'per_episode' : 'all';

export const GROUPING_MODE_HELP_TEXT: Record<GroupingMode, ReactNode> = {
  per_episode: (
    <FormattedMessage
      id="xpack.alertingV2.actionPolicy.form.dispatch.mode.perAlert.help"
      defaultMessage="<bold>Per alert</bold>: Best when you need visibility into each alert separately."
      values={{ bold: boldChunks }}
    />
  ),
  per_field: (
    <FormattedMessage
      id="xpack.alertingV2.actionPolicy.form.dispatch.mode.combinedGroup.help"
      defaultMessage="<bold>Combined</bold>: Best when many related alerts should share one send per field value, for example per host or service."
      values={{ bold: boldChunks }}
    />
  ),
  all: (
    <FormattedMessage
      id="xpack.alertingV2.actionPolicy.form.dispatch.mode.combinedAll.help"
      defaultMessage="<bold>Combined</bold>: Best for periodic roll-ups when individual alerts are not needed."
      values={{ bold: boldChunks }}
    />
  ),
};

export const PER_EPISODE_STRATEGY_OPTIONS: Array<{ value: ThrottleStrategy; text: string }> = [
  {
    value: 'on_status_change',
    text: i18n.translate('xpack.alertingV2.actionPolicy.form.dispatch.strategy.onStatusChange', {
      defaultMessage: 'On status change',
    }),
  },
  {
    value: 'per_status_interval',
    text: i18n.translate('xpack.alertingV2.actionPolicy.form.dispatch.strategy.perStatusInterval', {
      defaultMessage: 'On change, then repeat',
    }),
  },
  {
    value: 'every_time',
    text: i18n.translate('xpack.alertingV2.actionPolicy.form.dispatch.strategy.everyTime', {
      defaultMessage: 'Every evaluation',
    }),
  },
];

export const AGGREGATE_STRATEGY_OPTIONS: Array<{ value: ThrottleStrategy; text: string }> = [
  {
    value: 'time_interval',
    text: i18n.translate('xpack.alertingV2.actionPolicy.form.dispatch.strategy.timeInterval', {
      defaultMessage: 'At most once every',
    }),
  },
  {
    value: 'every_time',
    text: i18n.translate(
      'xpack.alertingV2.actionPolicy.form.dispatch.strategy.everyTimeAggregate',
      { defaultMessage: 'Every evaluation' }
    ),
  },
];

export const DEFAULT_STRATEGY_FOR_MODE: Record<GroupingMode, ThrottleStrategy> = {
  per_episode: 'on_status_change',
  per_field: 'time_interval',
  all: 'time_interval',
};

export const PER_EPISODE_STRATEGY_HELP_TEXT: Partial<Record<ThrottleStrategy, string>> = {
  on_status_change: i18n.translate(
    'xpack.alertingV2.actionPolicy.form.dispatch.strategy.onStatusChange.help',
    {
      defaultMessage:
        'Notifies once when an episode opens and once when it recovers. No repeat notifications while it remains active.',
    }
  ),
  per_status_interval: i18n.translate(
    'xpack.alertingV2.actionPolicy.form.dispatch.strategy.perStatusInterval.help',
    {
      defaultMessage:
        'Notifies on status change, then resends at a regular interval while the episode remains active. Use this when issues can stay open for long periods and you want ongoing notifications until they resolve.',
    }
  ),
  every_time: i18n.translate(
    'xpack.alertingV2.actionPolicy.form.dispatch.strategy.everyTime.help',
    {
      defaultMessage:
        'Sends a notification on every rule evaluation per episode. Use only for infrequent rule schedules or when you need a full audit trail.',
    }
  ),
};

export const AGGREGATE_STRATEGY_HELP_TEXT: Partial<Record<ThrottleStrategy, string>> = {
  time_interval: i18n.translate(
    'xpack.alertingV2.actionPolicy.form.dispatch.strategy.timeInterval.help',
    {
      defaultMessage:
        'Sends at most one notification per group within the specified interval, regardless of how often the rule runs. Use this to limit notification volume for noisy rules.',
    }
  ),
  every_time: i18n.translate(
    'xpack.alertingV2.actionPolicy.form.dispatch.strategy.everyTimeAggregate.help',
    {
      defaultMessage:
        'Sends a notification for each group on every rule evaluation. Use only for infrequent rule schedules or when you need a full audit trail.',
    }
  ),
};

export const THROTTLE_INTERVAL_PATTERN = /^[1-9][0-9]*[dhms]$/;

export const DEFAULT_THROTTLE_INTERVAL = '5m';

export const DURATION_UNIT_LABELS: Record<string, string> = {
  s: i18n.translate('xpack.alertingV2.actionPolicy.form.durationUnit.seconds', {
    defaultMessage: 'second(s)',
  }),
  m: i18n.translate('xpack.alertingV2.actionPolicy.form.durationUnit.minutes', {
    defaultMessage: 'minute(s)',
  }),
  h: i18n.translate('xpack.alertingV2.actionPolicy.form.durationUnit.hours', {
    defaultMessage: 'hour(s)',
  }),
  d: i18n.translate('xpack.alertingV2.actionPolicy.form.durationUnit.days', {
    defaultMessage: 'day(s)',
  }),
};

export interface EpisodeStatusFilterOption {
  value: 'active' | 'recovering' | 'pending' | 'inactive';
  title: string;
  badgeColor: 'danger' | 'success' | 'warning' | 'default';
  description: string;
}

export const EPISODE_STATUS_FILTER_OPTIONS: EpisodeStatusFilterOption[] = [
  {
    value: 'active',
    title: i18n.translate('xpack.alertingV2.actionPolicy.form.quickFilters.status.active.title', {
      defaultMessage: 'Active',
    }),
    badgeColor: 'danger',
    description: i18n.translate(
      'xpack.alertingV2.actionPolicy.form.quickFilters.status.active.description',
      { defaultMessage: 'Episode is confirmed and ongoing' }
    ),
  },
  {
    value: 'recovering',
    title: i18n.translate(
      'xpack.alertingV2.actionPolicy.form.quickFilters.status.recovering.title',
      { defaultMessage: 'Recovering' }
    ),
    badgeColor: 'success',
    description: i18n.translate(
      'xpack.alertingV2.actionPolicy.form.quickFilters.status.recovering.description',
      { defaultMessage: 'Condition stopped breaching, waiting for confirmation' }
    ),
  },
  {
    value: 'pending',
    title: i18n.translate('xpack.alertingV2.actionPolicy.form.quickFilters.status.pending.title', {
      defaultMessage: 'Pending',
    }),
    badgeColor: 'warning',
    description: i18n.translate(
      'xpack.alertingV2.actionPolicy.form.quickFilters.status.pending.description',
      { defaultMessage: 'First breach detected, not yet confirmed' }
    ),
  },
  {
    value: 'inactive',
    title: i18n.translate('xpack.alertingV2.actionPolicy.form.quickFilters.status.inactive.title', {
      defaultMessage: 'Inactive',
    }),
    badgeColor: 'default',
    description: i18n.translate(
      'xpack.alertingV2.actionPolicy.form.quickFilters.status.inactive.description',
      { defaultMessage: 'Episode is fully resolved' }
    ),
  },
];

export const DEFAULT_FORM_STATE: ActionPolicyFormState = {
  name: '',
  description: '',
  tags: [],
  matcher: null,
  groupingMode: 'per_episode',
  groupBy: [],
  throttleStrategy: 'on_status_change',
  throttleInterval: '',
  destinations: [],
  inlineActions: [],
  enabled: false,
};
