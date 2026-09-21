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
import { useFormContext, useWatch } from 'react-hook-form';
import { formatInterval } from '../../format_interval';
import { GROUPING_MODE_HELP_TEXT } from '../constants';
import type { ActionPolicyFormState } from '../types';

interface DispatchSummaryInput {
  groupingMode: GroupingMode;
  groupBy: string[];
  throttleStrategy: ThrottleStrategy;
  throttleInterval: string;
}

/**
 * Human-readable outcome sentence for the current notification configuration.
 * Returns an empty string when the configuration is incomplete (e.g. group mode
 * without a selected field).
 */
export const getDispatchSummary = ({
  groupingMode,
  groupBy,
  throttleStrategy,
  throttleInterval,
}: DispatchSummaryInput): string => {
  const interval = formatInterval(throttleInterval);
  const fields = groupBy.join(', ');

  if (groupingMode === 'per_episode') {
    switch (throttleStrategy) {
      case 'on_status_change':
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.notificationSummary.episode.statusChange',
          {
            defaultMessage:
              'Sends one notification when an episode opens and one when it recovers.',
          }
        );
      case 'per_status_interval':
        if (!interval) {
          return i18n.translate(
            'xpack.alertingV2.actionPolicy.form.notificationSummary.episode.statusChangeNoInterval',
            {
              defaultMessage: 'Sends a notification on status change.',
            }
          );
        }
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.notificationSummary.episode.statusChangeRepeat',
          {
            defaultMessage:
              'Sends a notification on status change and repeats every {interval} while the episode remains active.',
            values: { interval },
          }
        );
      case 'every_time':
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.notificationSummary.episode.everyEvaluation',
          {
            defaultMessage:
              'Sends a notification for every rule evaluation. No limit on notification frequency.',
          }
        );
    }
  }

  if (groupingMode === 'per_field') {
    if (groupBy.length === 0) {
      return i18n.translate(
        'xpack.alertingV2.actionPolicy.form.notificationSummary.group.noFields',
        {
          defaultMessage: 'Select a field in Group by to configure group notifications.',
        }
      );
    }

    switch (throttleStrategy) {
      case 'time_interval':
        if (!interval) {
          return i18n.translate(
            'xpack.alertingV2.actionPolicy.form.notificationSummary.group.throttleNoInterval',
            {
              defaultMessage: 'Sends a notification for each group sharing values in {fields}.',
              values: { fields },
            }
          );
        }
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.notificationSummary.group.throttle',
          {
            defaultMessage:
              'Sends at most one notification every {interval} for each group sharing values in {fields}.',
            values: { fields, interval },
          }
        );
      case 'every_time':
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.notificationSummary.group.everyEvaluation',
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
            'xpack.alertingV2.actionPolicy.form.notificationSummary.digest.throttleNoInterval',
            {
              defaultMessage: 'Combines all matching episodes into one notification.',
            }
          );
        }
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.notificationSummary.digest.throttle',
          {
            defaultMessage:
              'Combines all matching episodes into one notification at most every {interval}.',
            values: { interval },
          }
        );
      case 'every_time':
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.notificationSummary.digest.everyEvaluation',
          {
            defaultMessage:
              'Combines all matching episodes into one notification on every rule evaluation. No limit on notification frequency.',
          }
        );
    }
  }

  return '';
};

/**
 * Live summary for the Notification controls section, rendered in the described-form-group
 * left column. Reads the current form state and describes the selected notify-per mode
 * followed by the resulting notification outcome.
 */
export const NotificationSummary = () => {
  const { control } = useFormContext<ActionPolicyFormState>();
  const [groupingMode, groupBy, throttleStrategy, throttleInterval] = useWatch({
    control,
    name: ['groupingMode', 'groupBy', 'throttleStrategy', 'throttleInterval'],
  });

  const modeDescription = GROUPING_MODE_HELP_TEXT[groupingMode];
  const outcome = getDispatchSummary({ groupingMode, groupBy, throttleStrategy, throttleInterval });

  return (
    <EuiPanel
      color="subdued"
      paddingSize="m"
      hasBorder={false}
      data-test-subj="notificationSummary"
    >
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.alertingV2.actionPolicy.form.notificationSummary.title', {
            defaultMessage: 'Notification summary',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued" data-test-subj="notificationSummaryModeText">
        {modeDescription}
      </EuiText>
      {outcome ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued" data-test-subj="notificationSummaryOutcomeText">
            {outcome}
          </EuiText>
        </>
      ) : null}
    </EuiPanel>
  );
};
