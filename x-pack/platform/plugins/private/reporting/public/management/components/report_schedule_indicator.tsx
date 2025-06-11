/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { Frequency } from '@kbn/rrule';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { ScheduledReport } from '@kbn/reporting-common/types';

interface ReportScheduleIndicatorProps {
  schedule: ScheduledReport['schedule'];
}

export const ReportScheduleIndicator: FC<ReportScheduleIndicatorProps> = ({ schedule }) => {
  if (!schedule || !schedule.rrule) {
    return null;
  }

  let statusText: string;

  switch (schedule.rrule.freq) {
    case Frequency.DAILY:
      statusText = i18n.translate('xpack.reporting.schedules.scheduleIndicator.daily', {
        defaultMessage: 'Daily',
      });
      break;
    case Frequency.WEEKLY:
      statusText = i18n.translate('xpack.reporting.schedules.scheduleIndicator.weekly', {
        defaultMessage: 'Weekly',
      });
      break;
    case Frequency.MONTHLY:
      statusText = i18n.translate('xpack.reporting.schedules.scheduleIndicator.monthly', {
        defaultMessage: 'Monthly',
      });
      break;
    default:
      statusText = i18n.translate('xpack.reporting.schedules.scheduleIndicator.unknown', {
        defaultMessage: 'Unknown',
      });
  }

  return (
    <EuiBadge
      data-test-subj={`reportScheduleIndicator-${schedule.rrule.freq}`}
      color="subdued"
      aria-label={statusText}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIconTip type="calendar" size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{statusText}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiBadge>
  );
};
