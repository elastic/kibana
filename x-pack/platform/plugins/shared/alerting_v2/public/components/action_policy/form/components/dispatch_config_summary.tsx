/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface DispatchConfigSummaryProps {
  groupingMode: GroupingMode;
  groupBy: string[];
  throttleStrategy: ThrottleStrategy;
  throttleInterval: string;
}

type DurationUnit = 's' | 'm' | 'h' | 'd';

const isDurationUnit = (c: string): c is DurationUnit =>
  c === 's' || c === 'm' || c === 'h' || c === 'd';

const formatInterval = (raw: string): string => {
  if (!raw) return '';
  const unit = raw.charAt(raw.length - 1);
  const value = parseInt(raw, 10);
  if (Number.isNaN(value) || !isDurationUnit(unit)) return raw;
  switch (unit) {
    case 's':
      return i18n.translate('xpack.alertingV2.actionPolicy.form.dispatchSummary.duration.seconds', {
        defaultMessage: '{value, plural, one {# second} other {# seconds}}',
        values: { value },
      });
    case 'm':
      return i18n.translate('xpack.alertingV2.actionPolicy.form.dispatchSummary.duration.minutes', {
        defaultMessage: '{value, plural, one {# minute} other {# minutes}}',
        values: { value },
      });
    case 'h':
      return i18n.translate('xpack.alertingV2.actionPolicy.form.dispatchSummary.duration.hours', {
        defaultMessage: '{value, plural, one {# hour} other {# hours}}',
        values: { value },
      });
    case 'd':
      return i18n.translate('xpack.alertingV2.actionPolicy.form.dispatchSummary.duration.days', {
        defaultMessage: '{value, plural, one {# day} other {# days}}',
        values: { value },
      });
  }
};

const getDispatchSummary = ({
  groupingMode,
  groupBy,
  throttleStrategy,
  throttleInterval,
}: DispatchConfigSummaryProps): string => {
  const interval = formatInterval(throttleInterval);
  const fields = groupBy.join(', ');

  if (groupingMode === 'per_episode') {
    switch (throttleStrategy) {
      case 'on_status_change':
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.dispatchSummary.episode.statusChange',
          {
            defaultMessage:
              'Sends one notification when an episode opens and one when it recovers.',
          }
        );
      case 'per_status_interval':
        if (!interval) {
          return i18n.translate(
            'xpack.alertingV2.actionPolicy.form.dispatchSummary.episode.statusChangeNoInterval',
            {
              defaultMessage: 'Sends a notification on status change.',
            }
          );
        }
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.dispatchSummary.episode.statusChangeRepeat',
          {
            defaultMessage:
              'Sends a notification on status change and repeats every {interval} while the episode remains active.',
            values: { interval },
          }
        );
      case 'every_time':
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.dispatchSummary.episode.everyEvaluation',
          {
            defaultMessage:
              'Sends a notification for every rule evaluation. No limit on notification frequency.',
          }
        );
    }
  }

  if (groupingMode === 'per_field') {
    if (groupBy.length === 0) {
      return i18n.translate('xpack.alertingV2.actionPolicy.form.dispatchSummary.group.noFields', {
        defaultMessage: 'Select a field in Group by to configure group notifications.',
      });
    }

    switch (throttleStrategy) {
      case 'time_interval':
        if (!interval) {
          return i18n.translate(
            'xpack.alertingV2.actionPolicy.form.dispatchSummary.group.throttleNoInterval',
            {
              defaultMessage: 'Sends a notification for each group sharing values in {fields}.',
              values: { fields },
            }
          );
        }
        return i18n.translate('xpack.alertingV2.actionPolicy.form.dispatchSummary.group.throttle', {
          defaultMessage:
            'Sends at most one notification every {interval} for each group sharing values in {fields}.',
          values: { fields, interval },
        });
      case 'every_time':
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.dispatchSummary.group.everyEvaluation',
          {
            defaultMessage:
              'Sends a notification for each group on every rule evaluation. No limit on notification frequency.',
          }
        );
    }
  }

  if (groupingMode === 'all') {
    switch (throttleStrategy) {
      case 'time_interval':
        if (!interval) {
          return i18n.translate(
            'xpack.alertingV2.actionPolicy.form.dispatchSummary.digest.throttleNoInterval',
            {
              defaultMessage: 'Combines all matching episodes into one notification.',
            }
          );
        }
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.dispatchSummary.digest.throttle',
          {
            defaultMessage:
              'Combines all matching episodes into one notification at most every {interval}.',
            values: { interval },
          }
        );
      case 'every_time':
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.dispatchSummary.digest.everyEvaluation',
          {
            defaultMessage:
              'Combines all matching episodes into one notification on every rule evaluation. No limit on notification frequency.',
          }
        );
    }
  }

  return '';
};

export const DispatchConfigSummary = (props: DispatchConfigSummaryProps) => {
  const summary = getDispatchSummary(props);

  if (!summary) return null;

  return (
    <EuiPanel
      color="subdued"
      paddingSize="m"
      hasBorder={false}
      data-test-subj="dispatchConfigCallout"
    >
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.alertingV2.actionPolicy.form.dispatchSummary.title', {
            defaultMessage: 'Notification summary',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued" data-test-subj="dispatchConfigSummaryText">
        {summary}
      </EuiText>
    </EuiPanel>
  );
};
