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
import { DURATION_UNIT_LABELS } from '../constants';

interface DispatchConfigSummaryProps {
  groupingMode: GroupingMode;
  groupBy: string[];
  throttleStrategy: ThrottleStrategy;
  throttleInterval: string;
}

const formatInterval = (raw: string): string => {
  if (!raw) return '';
  const unit = raw.charAt(raw.length - 1);
  const value = parseInt(raw, 10);
  if (Number.isNaN(value)) return raw;
  return `${value} ${DURATION_UNIT_LABELS[unit] ?? unit}`;
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
          'xpack.alertingV2.notificationPolicy.form.dispatchSummary.episode.statusChange',
          { defaultMessage: 'Each episode is dispatched once per status transition.' }
        );
      case 'per_status_interval':
        if (!interval) {
          return i18n.translate(
            'xpack.alertingV2.notificationPolicy.form.dispatchSummary.episode.statusChangeNoInterval',
            {
              defaultMessage: 'Each episode is dispatched on status change.',
            }
          );
        }
        return i18n.translate(
          'xpack.alertingV2.notificationPolicy.form.dispatchSummary.episode.statusChangeRepeat',
          {
            defaultMessage:
              'Each episode is dispatched on status change and repeated every {interval}.',
            values: { interval },
          }
        );
      case 'every_time':
        return i18n.translate(
          'xpack.alertingV2.notificationPolicy.form.dispatchSummary.episode.everyEvaluation',
          {
            defaultMessage: 'Each episode is dispatched on every evaluation with no throttle.',
          }
        );
    }
  }

  if (groupingMode === 'per_field') {
    if (groupBy.length === 0) {
      return i18n.translate(
        'xpack.alertingV2.notificationPolicy.form.dispatchSummary.group.noFields',
        { defaultMessage: 'Add group-by fields to configure grouped dispatch.' }
      );
    }

    switch (throttleStrategy) {
      case 'time_interval':
        if (!interval) {
          return i18n.translate(
            'xpack.alertingV2.notificationPolicy.form.dispatchSummary.group.throttleNoInterval',
            {
              defaultMessage: 'Episodes grouped by {fields} are dispatched.',
              values: { fields },
            }
          );
        }
        return i18n.translate(
          'xpack.alertingV2.notificationPolicy.form.dispatchSummary.group.throttle',
          {
            defaultMessage:
              'Episodes grouped by {fields} are dispatched at most once every {interval}.',
            values: { fields, interval },
          }
        );
      case 'every_time':
        return i18n.translate(
          'xpack.alertingV2.notificationPolicy.form.dispatchSummary.group.everyEvaluation',
          {
            defaultMessage:
              'Episodes grouped by {fields} are dispatched on every evaluation with no throttle.',
            values: { fields },
          }
        );
    }
  }

  if (groupingMode === 'all') {
    switch (throttleStrategy) {
      case 'time_interval':
        if (!interval) {
          return i18n.translate(
            'xpack.alertingV2.notificationPolicy.form.dispatchSummary.digest.throttleNoInterval',
            { defaultMessage: 'All matched episodes are dispatched.' }
          );
        }
        return i18n.translate(
          'xpack.alertingV2.notificationPolicy.form.dispatchSummary.digest.throttle',
          {
            defaultMessage: 'All matched episodes are dispatched at most once every {interval}.',
            values: { interval },
          }
        );
      case 'every_time':
        return i18n.translate(
          'xpack.alertingV2.notificationPolicy.form.dispatchSummary.digest.everyEvaluation',
          {
            defaultMessage:
              'All matched episodes are dispatched on every evaluation with no throttle.',
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
          {i18n.translate('xpack.alertingV2.notificationPolicy.form.dispatchSummary.title', {
            defaultMessage: 'Dispatch configuration',
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
