/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DispatchPer, NotificationPolicyFormState, SuppressionMechanismItem } from './types';

/** Frequency when dispatch per episode is selected */
export const EPISODE_FREQUENCY_OPTIONS = [
  {
    value: 'episode_status_change',
    text: i18n.translate(
      'xpack.alertingV2.notificationPolicy.form.frequency.episode.statusChange',
      {
        defaultMessage: 'On status change',
      }
    ),
  },
  {
    value: 'episode_status_change_repeat',
    text: i18n.translate(
      'xpack.alertingV2.notificationPolicy.form.frequency.episode.statusChangeRepeat',
      { defaultMessage: 'On status change + repeat at interval' }
    ),
  },
  {
    value: 'episode_every_evaluation',
    text: i18n.translate(
      'xpack.alertingV2.notificationPolicy.form.frequency.episode.everyEvaluation',
      {
        defaultMessage: 'Every evaluation (per episode, no throttle)',
      }
    ),
  },
];

/** Short hint for the Frequency field; full behavior is summarized below. */
export const EPISODE_FREQUENCY_DESCRIPTIONS: Record<string, string> = {
  episode_status_change: i18n.translate(
    'xpack.alertingV2.notificationPolicy.form.frequency.episode.statusChange.description',
    {
      defaultMessage: 'When the episode status changes.',
    }
  ),
  episode_status_change_repeat: i18n.translate(
    'xpack.alertingV2.notificationPolicy.form.frequency.episode.statusChangeRepeat.description',
    {
      defaultMessage: 'On status change and on a repeat interval while status is unchanged.',
    }
  ),
  episode_every_evaluation: i18n.translate(
    'xpack.alertingV2.notificationPolicy.form.frequency.episode.everyEvaluation.description',
    {
      defaultMessage: 'No minimum time between notifications for the same episode.',
    }
  ),
};

/** Frequency when "Group" dispatch is selected */
export const GROUP_FREQUENCY_OPTIONS = [
  {
    value: 'group_throttle',
    text: i18n.translate(
      'xpack.alertingV2.notificationPolicy.form.frequency.group.atMostOnceEvery',
      {
        defaultMessage: 'At most once every…',
      }
    ),
  },
  {
    value: 'group_immediate',
    text: i18n.translate('xpack.alertingV2.notificationPolicy.form.frequency.group.immediate', {
      defaultMessage: 'Every evaluation (per group, no throttle)',
    }),
  },
];

export const GROUP_FREQUENCY_DESCRIPTIONS: Record<string, string> = {
  group_throttle: i18n.translate(
    'xpack.alertingV2.notificationPolicy.form.frequency.group.throttle.description',
    {
      defaultMessage: 'At most one notification per group per repeat interval.',
    }
  ),
  group_immediate: i18n.translate(
    'xpack.alertingV2.notificationPolicy.form.frequency.group.immediate.description',
    {
      defaultMessage: 'No minimum time between notifications for the same group.',
    }
  ),
};

export const REPEAT_INTERVAL_UNIT_OPTIONS = [
  {
    value: 's',
    text: i18n.translate('xpack.alertingV2.notificationPolicy.form.repeatInterval.unit.seconds', {
      defaultMessage: 'seconds',
    }),
  },
  {
    value: 'm',
    text: i18n.translate('xpack.alertingV2.notificationPolicy.form.repeatInterval.unit.minutes', {
      defaultMessage: 'minutes',
    }),
  },
  {
    value: 'h',
    text: i18n.translate('xpack.alertingV2.notificationPolicy.form.repeatInterval.unit.hours', {
      defaultMessage: 'hours',
    }),
  },
  {
    value: 'd',
    text: i18n.translate('xpack.alertingV2.notificationPolicy.form.repeatInterval.unit.days', {
      defaultMessage: 'days',
    }),
  },
];

export const DISPATCH_PER_OPTIONS: Array<{ id: DispatchPer; label: string }> = [
  {
    id: 'episode',
    label: i18n.translate('xpack.alertingV2.notificationPolicy.form.dispatchPer.episode', {
      defaultMessage: 'Episode',
    }),
  },
  {
    id: 'group',
    label: i18n.translate('xpack.alertingV2.notificationPolicy.form.dispatchPer.group', {
      defaultMessage: 'Group',
    }),
  },
];

/** Single label for the episode vs group control (replaces separate “Unit of dispatch” heading + “Send notification per”). */
export const NOTIFY_PER_LABEL = i18n.translate(
  'xpack.alertingV2.notificationPolicy.form.dispatchPer.notifyPer',
  { defaultMessage: 'Notify per' }
);

export const DISPATCH_PER_DESCRIPTIONS: Record<DispatchPer, string> = {
  episode: i18n.translate(
    'xpack.alertingV2.notificationPolicy.form.dispatchPer.episode.description',
    { defaultMessage: 'One dispatch per matched episode.' }
  ),
  group: i18n.translate('xpack.alertingV2.notificationPolicy.form.dispatchPer.group.description', {
    defaultMessage:
      'One notification per group. Add at least one field under Group by to define each group.',
  }),
};

export interface EpisodeStatusFilterOption {
  value: 'active' | 'recovering' | 'pending' | 'inactive';
  title: string;
  badgeLabel: string;
  badgeColor: 'danger' | 'success' | 'warning' | 'default';
  description: string;
}

export const EPISODE_STATUS_FILTER_OPTIONS: EpisodeStatusFilterOption[] = [
  {
    value: 'active',
    title: i18n.translate('xpack.alertingV2.notificationPolicy.form.statusFilter.active.title', {
      defaultMessage: 'Active',
    }),
    badgeLabel: 'active',
    badgeColor: 'danger',
    description: i18n.translate(
      'xpack.alertingV2.notificationPolicy.form.statusFilter.active.description',
      { defaultMessage: 'Episode is confirmed and ongoing' }
    ),
  },
  {
    value: 'recovering',
    title: i18n.translate(
      'xpack.alertingV2.notificationPolicy.form.statusFilter.recovering.title',
      {
        defaultMessage: 'Recovering',
      }
    ),
    badgeLabel: 'recovering',
    badgeColor: 'success',
    description: i18n.translate(
      'xpack.alertingV2.notificationPolicy.form.statusFilter.recovering.description',
      { defaultMessage: 'Condition stopped breaching, waiting for confirmation' }
    ),
  },
  {
    value: 'pending',
    title: i18n.translate('xpack.alertingV2.notificationPolicy.form.statusFilter.pending.title', {
      defaultMessage: 'Pending',
    }),
    badgeLabel: 'pending',
    badgeColor: 'warning',
    description: i18n.translate(
      'xpack.alertingV2.notificationPolicy.form.statusFilter.pending.description',
      { defaultMessage: 'First breach detected, not yet confirmed' }
    ),
  },
  {
    value: 'inactive',
    title: i18n.translate('xpack.alertingV2.notificationPolicy.form.statusFilter.inactive.title', {
      defaultMessage: 'Inactive',
    }),
    badgeLabel: 'inactive',
    badgeColor: 'default',
    description: i18n.translate(
      'xpack.alertingV2.notificationPolicy.form.statusFilter.inactive.description',
      { defaultMessage: 'Episode is fully resolved' }
    ),
  },
];

export const THROTTLE_INTERVAL_PATTERN = /^[1-9][0-9]*[dhms]$/;

export const DEFAULT_SUPPRESSION_MECHANISMS: SuppressionMechanismItem[] = [
  { id: 'maintenance_window', enabled: true },
  { id: 'manual_suppressions', enabled: true },
];

export const DEFAULT_FORM_STATE: NotificationPolicyFormState = {
  name: '',
  description: '',
  matcher: '',
  groupBy: [],
  dispatchPer: 'episode',
  frequency: { type: 'episode_every_evaluation' },
  destinations: [],
  suppressionMechanisms: DEFAULT_SUPPRESSION_MECHANISMS,
};
