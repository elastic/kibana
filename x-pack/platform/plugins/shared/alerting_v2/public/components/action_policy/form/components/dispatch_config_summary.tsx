/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode } from '@elastic/eui';
import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { GROUPING_MODE_HELP_TEXT } from '../constants';
import { FormSectionSummary } from './form_section_summary';

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

const renderFieldList = (fields: string[]) => (
  <>
    {fields.map((field, index) => (
      <React.Fragment key={field}>
        {index > 0 ? ', ' : null}
        <EuiCode>{field}</EuiCode>
      </React.Fragment>
    ))}
  </>
);

const getDispatchSummary = ({
  groupingMode,
  groupBy,
  throttleStrategy,
  throttleInterval,
}: DispatchConfigSummaryProps): React.ReactNode => {
  const interval = formatInterval(throttleInterval);
  const fields = renderFieldList(groupBy);

  if (groupingMode === 'per_episode') {
    switch (throttleStrategy) {
      case 'on_status_change':
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.dispatchSummary.perAlert.statusChange',
          {
            defaultMessage: 'Sends alert data when each alert opens and when it recovers.',
          }
        );
      case 'per_status_interval':
        if (!interval) {
          return i18n.translate(
            'xpack.alertingV2.actionPolicy.form.dispatchSummary.perAlert.statusChangeNoInterval',
            {
              defaultMessage: 'Sends alert data on status change, then repeats while active.',
            }
          );
        }
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.dispatchSummary.perAlert.statusChangeRepeat',
          {
            defaultMessage:
              'Sends alert data on status change, then every {interval} while the alert stays active.',
            values: { interval },
          }
        );
      case 'every_time':
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.dispatchSummary.perAlert.everyEvaluation',
          {
            defaultMessage:
              'Sends alert data on every rule evaluation. Use sparingly, with no frequency limit.',
          }
        );
    }
  }

  if (groupingMode === 'per_field') {
    if (groupBy.length === 0) {
      return i18n.translate('xpack.alertingV2.actionPolicy.form.dispatchSummary.combined.noFields', {
        defaultMessage: 'Add a field below to finish this combined send setup.',
      });
    }

    switch (throttleStrategy) {
      case 'time_interval':
        if (!interval) {
          return (
            <FormattedMessage
              id="xpack.alertingV2.actionPolicy.form.dispatchSummary.combined.groupNoInterval"
              defaultMessage="Combines alerts that share {fields} into one send per unique value."
              values={{ fields }}
            />
          );
        }
        return (
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.dispatchSummary.combined.groupThrottle"
            defaultMessage="Combines alerts that share {fields} into one send per unique value, at most every {interval}."
            values={{ fields, interval }}
          />
        );
      case 'every_time':
        return (
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.dispatchSummary.combined.groupEveryEvaluation"
            defaultMessage="Combines alerts that share {fields} into one send per unique value on every rule evaluation."
            values={{ fields }}
          />
        );
    }
  }

  if (groupingMode === 'all') {
    switch (throttleStrategy) {
      case 'time_interval':
        if (!interval) {
          return i18n.translate(
            'xpack.alertingV2.actionPolicy.form.dispatchSummary.combined.allNoInterval',
            {
              defaultMessage: 'Combines matching alerts into a single send.',
            }
          );
        }
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.dispatchSummary.combined.allThrottle',
          {
            defaultMessage: 'Combines matching alerts into a single send at most every {interval}.',
            values: { interval },
          }
        );
      case 'every_time':
        return i18n.translate(
          'xpack.alertingV2.actionPolicy.form.dispatchSummary.combined.allEveryEvaluation',
          {
            defaultMessage:
              'Combines matching alerts into a single send on every rule evaluation.',
          }
        );
    }
  }

  return null;
};

export const DispatchConfigSummary = (props: DispatchConfigSummaryProps) => {
  const summary = getDispatchSummary(props);
  const modeHelp = GROUPING_MODE_HELP_TEXT[props.groupingMode];

  if (!summary && !modeHelp) return null;

  return (
    <FormSectionSummary
      preamble={
        modeHelp ? <span data-test-subj="dispatchConfigModeHelp">{modeHelp}</span> : undefined
      }
      data-test-subj="dispatchConfigCallout"
      textTestSubj="dispatchConfigSummaryText"
    >
      {summary}
    </FormSectionSummary>
  );
};
