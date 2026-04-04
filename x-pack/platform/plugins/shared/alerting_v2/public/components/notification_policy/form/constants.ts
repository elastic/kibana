/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import type { NotificationPolicyFormState } from './types';

export const GROUPING_MODE_OPTIONS: Array<{ id: GroupingMode; label: string }> = [
  {
    id: 'per_episode',
    label: i18n.translate('xpack.alertingV2.notificationPolicy.form.dispatch.mode.perEpisode', {
      defaultMessage: 'Episode',
    }),
  },
  {
    id: 'per_field',
    label: i18n.translate('xpack.alertingV2.notificationPolicy.form.dispatch.mode.perGroup', {
      defaultMessage: 'Group',
    }),
  },
  {
    id: 'all',
    label: i18n.translate('xpack.alertingV2.notificationPolicy.form.dispatch.mode.digest', {
      defaultMessage: 'Digest',
    }),
  },
];

export const GROUPING_MODE_HELP_TEXT: Record<GroupingMode, string> = {
  per_episode: i18n.translate(
    'xpack.alertingV2.notificationPolicy.form.dispatch.mode.perEpisode.help',
    { defaultMessage: 'One dispatch per matched episode.' }
  ),
  per_field: i18n.translate(
    'xpack.alertingV2.notificationPolicy.form.dispatch.mode.perGroup.help',
    { defaultMessage: 'Episodes grouped by shared field values. One dispatch per group.' }
  ),
  all: i18n.translate('xpack.alertingV2.notificationPolicy.form.dispatch.mode.digest.help', {
    defaultMessage:
      'All matched episodes bundled into a single dispatch. Good for periodic summaries.',
  }),
};

export const PER_EPISODE_STRATEGY_OPTIONS: Array<{ value: ThrottleStrategy; text: string }> = [
  {
    value: 'on_status_change',
    text: i18n.translate(
      'xpack.alertingV2.notificationPolicy.form.dispatch.strategy.onStatusChange',
      { defaultMessage: 'On status change' }
    ),
  },
  {
    value: 'per_status_interval',
    text: i18n.translate(
      'xpack.alertingV2.notificationPolicy.form.dispatch.strategy.perStatusInterval',
      { defaultMessage: 'On status change + repeat at interval' }
    ),
  },
  {
    value: 'every_time',
    text: i18n.translate('xpack.alertingV2.notificationPolicy.form.dispatch.strategy.everyTime', {
      defaultMessage: 'Every evaluation (per episode, no throttle)',
    }),
  },
];

export const AGGREGATE_STRATEGY_OPTIONS: Array<{ value: ThrottleStrategy; text: string }> = [
  {
    value: 'time_interval',
    text: i18n.translate(
      'xpack.alertingV2.notificationPolicy.form.dispatch.strategy.timeInterval',
      { defaultMessage: 'At most once every...' }
    ),
  },
  {
    value: 'every_time',
    text: i18n.translate(
      'xpack.alertingV2.notificationPolicy.form.dispatch.strategy.everyTimeAggregate',
      { defaultMessage: 'Every evaluation (per group, no throttle)' }
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
    'xpack.alertingV2.notificationPolicy.form.dispatch.strategy.onStatusChange.help',
    { defaultMessage: 'When the episode status changes.' }
  ),
  per_status_interval: i18n.translate(
    'xpack.alertingV2.notificationPolicy.form.dispatch.strategy.perStatusInterval.help',
    { defaultMessage: 'On status change and on a repeat interval while status is unchanged.' }
  ),
  every_time: i18n.translate(
    'xpack.alertingV2.notificationPolicy.form.dispatch.strategy.everyTime.help',
    { defaultMessage: 'No minimum time between dispatches for the same episode.' }
  ),
};

export const AGGREGATE_STRATEGY_HELP_TEXT: Partial<Record<ThrottleStrategy, string>> = {
  time_interval: i18n.translate(
    'xpack.alertingV2.notificationPolicy.form.dispatch.strategy.timeInterval.help',
    { defaultMessage: 'At most one dispatch per group per repeat interval.' }
  ),
  every_time: i18n.translate(
    'xpack.alertingV2.notificationPolicy.form.dispatch.strategy.everyTimeAggregate.help',
    { defaultMessage: 'No minimum time between dispatches for the same group.' }
  ),
};

export const THROTTLE_INTERVAL_PATTERN = /^[1-9][0-9]*[dhms]$/;

export const DEFAULT_THROTTLE_INTERVAL = '5m';

export const DURATION_UNIT_LABELS: Record<string, string> = {
  s: i18n.translate('xpack.alertingV2.notificationPolicy.form.durationUnit.seconds', {
    defaultMessage: 'second(s)',
  }),
  m: i18n.translate('xpack.alertingV2.notificationPolicy.form.durationUnit.minutes', {
    defaultMessage: 'minute(s)',
  }),
  h: i18n.translate('xpack.alertingV2.notificationPolicy.form.durationUnit.hours', {
    defaultMessage: 'hour(s)',
  }),
  d: i18n.translate('xpack.alertingV2.notificationPolicy.form.durationUnit.days', {
    defaultMessage: 'day(s)',
  }),
};

export const DEFAULT_FORM_STATE: NotificationPolicyFormState = {
  name: '',
  description: '',
  matcher: '',
  groupingMode: 'per_episode',
  groupBy: [],
  throttleStrategy: 'on_status_change',
  throttleInterval: '',
  destinations: [],
};
