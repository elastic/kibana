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
import { ScheduledReportApiJSON } from '@kbn/reporting-common/types';

interface ReportScheduleIndicatorProps {
  schedule: ScheduledReportApiJSON['schedule'];
}

const translations = {
  [Frequency.DAILY]: i18n.translate('xpack.reporting.schedules.scheduleIndicator.daily', {
    defaultMessage: 'Daily',
  }),
  [Frequency.WEEKLY]: i18n.translate('xpack.reporting.schedules.scheduleIndicator.weekly', {
    defaultMessage: 'Weekly',
  }),
  [Frequency.MONTHLY]: i18n.translate('xpack.reporting.schedules.scheduleIndicator.monthly', {
    defaultMessage: 'Monthly',
  }),
};

export const ReportScheduleIndicator: FC<ReportScheduleIndicatorProps> = ({ schedule }) => {
  if (!schedule || !schedule.rrule) {
    return null;
  }

  const statusText = translations[schedule.rrule.freq];

  if (!statusText) {
    return null;
  }

  return (
    <EuiBadge
      data-test-subj={`reportScheduleIndicator-${schedule.rrule.freq}`}
      color="default"
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
