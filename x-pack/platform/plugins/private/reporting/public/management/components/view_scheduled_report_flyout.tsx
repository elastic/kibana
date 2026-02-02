/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout } from '@elastic/eui';
import type { ReportTypeData, ScheduledReport } from '../../types';
import { ScheduledReportForm } from './scheduled_report_form';

export interface ScheduledReportFlyoutProps {
  scheduledReport: Partial<ScheduledReport>;
  availableReportTypes?: ReportTypeData[];
  onClose: () => void;
}

export const ViewScheduledReportFlyout = ({
  scheduledReport,
  availableReportTypes,
  onClose,
}: ScheduledReportFlyoutProps) => {
  return (
    <EuiFlyout
      size="m"
      maxWidth={500}
      paddingSize="l"
      ownFocus={true}
      onClose={onClose}
      data-test-subj="viewScheduledReportFlyout"
      aria-label="viewScheduledReportFlyout"
    >
      <ScheduledReportForm
        scheduledReport={scheduledReport}
        onClose={onClose}
        availableReportTypes={availableReportTypes}
        readOnly
      />
    </EuiFlyout>
  );
};
