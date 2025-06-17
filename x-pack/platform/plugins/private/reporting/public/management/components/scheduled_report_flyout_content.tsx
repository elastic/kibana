/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import { ReportingAPIClient, useKibana } from '@kbn/reporting-public';
import type { ReportingSharingData } from '@kbn/reporting-public/share/share_context_menu';
import { SCHEDULED_REPORT_FORM_ID } from '../constants';
import {
  CANNOT_LOAD_REPORTING_HEALTH_MESSAGE,
  CANNOT_LOAD_REPORTING_HEALTH_TITLE,
  SCHEDULED_REPORT_FLYOUT_CANCEL_BUTTON_LABEL,
  SCHEDULED_REPORT_FLYOUT_SUBMIT_BUTTON_LABEL,
  SCHEDULED_REPORT_FLYOUT_TITLE,
  UNMET_REPORTING_PREREQUISITES_MESSAGE,
  UNMET_REPORTING_PREREQUISITES_TITLE,
} from '../translations';
import { ReportTypeData, ScheduledReport } from '../../types';
import { useGetReportingHealthQuery } from '../hooks/use_get_reporting_health_query';
import { ScheduledReportForm, ScheduledReportFormImperativeApi } from './scheduled_report_form';

export interface ScheduledReportFlyoutContentProps {
  apiClient: ReportingAPIClient;
  objectType?: string;
  sharingData?: ReportingSharingData;
  scheduledReport: Partial<ScheduledReport>;
  availableReportTypes?: ReportTypeData[];
  onClose: () => void;
  readOnly?: boolean;
}

export const ScheduledReportFlyoutContent = ({
  apiClient,
  objectType,
  sharingData,
  scheduledReport,
  availableReportTypes,
  onClose,
  readOnly = false,
}: ScheduledReportFlyoutContentProps) => {
  const { http } = useKibana().services;
  const {
    data: reportingHealth,
    isLoading: isReportingHealthLoading,
    isError: isReportingHealthError,
  } = useGetReportingHealthQuery({ http });
  const formRef = useRef<ScheduledReportFormImperativeApi>(null);

  const onSubmit = async () => {
    const submit = formRef.current?.submit;
    if (!submit) {
      return;
    }
    try {
      await submit();
      onClose();
    } catch (e) {
      // A validation error occurred
    }
  };

  const hasUnmetPrerequisites =
    !reportingHealth?.isSufficientlySecure || !reportingHealth?.hasPermanentEncryptionKey;

  return (
    <>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="s">
          <h2>{SCHEDULED_REPORT_FLYOUT_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isReportingHealthLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : isReportingHealthError ? (
          <EuiCallOut title={CANNOT_LOAD_REPORTING_HEALTH_TITLE} iconType="error" color="danger">
            <p>{CANNOT_LOAD_REPORTING_HEALTH_MESSAGE}</p>
          </EuiCallOut>
        ) : hasUnmetPrerequisites ? (
          <EuiCallOut title={UNMET_REPORTING_PREREQUISITES_TITLE} iconType="error" color="danger">
            <p>{UNMET_REPORTING_PREREQUISITES_MESSAGE}</p>
          </EuiCallOut>
        ) : (
          <ScheduledReportForm
            ref={formRef}
            apiClient={apiClient}
            objectType={objectType}
            sharingData={sharingData}
            scheduledReport={scheduledReport}
            availableReportTypes={availableReportTypes}
            readOnly={readOnly}
            hasEmailConnector={reportingHealth.areNotificationsEnabled}
          />
        )}
      </EuiFlyoutBody>
      {!readOnly && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} flush="left">
                {SCHEDULED_REPORT_FLYOUT_CANCEL_BUTTON_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                type="submit"
                form={SCHEDULED_REPORT_FORM_ID}
                isDisabled={false}
                onClick={onSubmit}
                fill
              >
                {SCHEDULED_REPORT_FLYOUT_SUBMIT_BUTTON_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </>
  );
};
