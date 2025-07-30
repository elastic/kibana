/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { ReportingAPIClient } from '@kbn/reporting-public';
import { ReportTypeData, ScheduledReport } from '../../types';
import { ScheduledReportFlyoutContent } from './scheduled_report_flyout_content';

export interface ScheduledReportFlyoutProps {
  apiClient: ReportingAPIClient;
  scheduledReport: Partial<ScheduledReport>;
  availableReportTypes: ReportTypeData[];
  onClose: () => void;
}

export const ScheduledReportFlyout = ({
  apiClient,
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
      data-test-subj="scheduledReportFlyout"
    >
      <ScheduledReportFlyoutContent
        apiClient={apiClient}
        scheduledReport={scheduledReport}
        availableReportTypes={availableReportTypes}
        onClose={onClose}
        readOnly
      />
    </EuiFlyout>
  );
};
