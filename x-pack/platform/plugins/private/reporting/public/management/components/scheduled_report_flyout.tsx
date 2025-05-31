/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import { SetRequired } from 'type-fest';
import {
  CANNOT_LOAD_REPORTING_HEALTH_MESSAGE,
  CANNOT_LOAD_REPORTING_HEALTH_TITLE,
  SCHEDULED_REPORT_FLYOUT_TITLE,
} from '../translations';
import { ReportFormat, ScheduledReport } from '../../types';
import { useGetReportingHealthQuery } from '../hooks/use_get_reporting_health_query';
import { ScheduledReportForm } from './scheduled_report_flyout_content';

export interface ScheduledReportFlyoutProps {
  scheduledReport: SetRequired<Partial<ScheduledReport>, 'jobParams'>;
  availableFormats: ReportFormat[];
  onClose: () => void;
  readOnly?: boolean;
}

export const ScheduledReportFlyout = ({
  scheduledReport,
  availableFormats,
  onClose,
  readOnly = false,
}: ScheduledReportFlyoutProps) => {
  const { data: reportingHealth, isLoading, isError } = useGetReportingHealthQuery();

  return (
    <EuiFlyout size="m" maxWidth={500} paddingSize="l" ownFocus={true} onClose={onClose}>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="s">
          <h2>{SCHEDULED_REPORT_FLYOUT_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      {isLoading || isError ? (
        <EuiFlyoutBody>
          {isLoading && <EuiLoadingSpinner size="l" />}
          {isError && (
            <EuiCallOut title={CANNOT_LOAD_REPORTING_HEALTH_TITLE} iconType="error" color="danger">
              <p>{CANNOT_LOAD_REPORTING_HEALTH_MESSAGE}</p>
            </EuiCallOut>
          )}
        </EuiFlyoutBody>
      ) : (
        <ScheduledReportForm
          scheduledReport={scheduledReport}
          availableFormats={availableFormats}
          onClose={onClose}
          readOnly={readOnly}
          hasEmailConnector={reportingHealth?.hasEmailConnector}
        />
      )}
    </EuiFlyout>
  );
};
