/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { convertToRRule } from '@kbn/response-ops-recurring-schedule-form/utils/convert_to_rrule';
import type { ReportingAPIClient } from '@kbn/reporting-public';
import { useKibana } from '@kbn/reporting-public';
import type { Rrule } from '@kbn/task-manager-plugin/server/task';
import { mountReactNode } from '@kbn/core-mount-utils-browser-internal';
import type { ReportingSharingData } from '@kbn/reporting-public/share/share_context_menu';
import { EuiLink } from '@elastic/eui';
import { REPORTING_MANAGEMENT_SCHEDULES } from '@kbn/reporting-common';
import { transformEmailNotification } from '../utils';
import type { ReportTypeData, ScheduledReport } from '../../types';
import type { FormData } from './scheduled_report_form';
import { ScheduledReportForm } from './scheduled_report_form';
import * as i18n from '../translations';
import { getReportParams } from '../report_params';
import { useScheduleReport } from '../hooks/use_schedule_report';

export interface CreateScheduledReportFormProps {
  // create
  apiClient: ReportingAPIClient;
  objectType?: string;
  sharingData?: ReportingSharingData;
  scheduledReport: Partial<ScheduledReport>;
  availableReportTypes: ReportTypeData[];
  onClose: () => void;
}

export const CreateScheduledReportForm = ({
  apiClient,
  objectType,
  sharingData,
  scheduledReport,
  availableReportTypes,
  onClose,
}: CreateScheduledReportFormProps) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const reportingPageLink = useMemo(
    () => (
      <EuiLink href={http.basePath.prepend(REPORTING_MANAGEMENT_SCHEDULES)}>
        {i18n.REPORTING_PAGE_LINK_TEXT}
      </EuiLink>
    ),
    [http.basePath]
  );

  const { mutateAsync: createScheduledReport, isLoading: isSubmitLoading } = useScheduleReport({
    http,
  });

  const onSubmit = async (formData: FormData) => {
    if (!sharingData || !objectType) {
      return;
    }
    try {
      const {
        title,
        reportTypeId,
        startDate,
        timezone,
        recurringSchedule,
        optimizedForPrinting,
        sendByEmail,
        emailRecipients,
        emailCcRecipients,
        emailBccRecipients,
        emailSubject,
        emailMessage,
      } = formData;
      const rrule = convertToRRule({
        startDate,
        timezone,
        recurringSchedule,
        includeTime: true,
      });
      await createScheduledReport({
        reportTypeId,
        jobParams: getReportParams({
          apiClient,
          sharingData,
          objectType,
          title,
          reportTypeId,
          ...(reportTypeId === 'printablePdfV2' ? { optimizedForPrinting } : {}),
        }),
        schedule: { rrule: rrule as Rrule },
        notification: sendByEmail
          ? {
              email: transformEmailNotification({
                emailRecipients,
                emailCcRecipients,
                emailBccRecipients,
                emailSubject,
                emailMessage,
              }),
            }
          : undefined,
      });
      toasts.addSuccess({
        title: i18n.SCHEDULED_REPORT_FORM_SUCCESS_TOAST_TITLE,
        text: mountReactNode(
          <>
            {i18n.SCHEDULED_REPORT_FORM_SUCCESS_TOAST_MESSAGE} {reportingPageLink}.
          </>
        ),
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      toasts.addError(error, {
        title: i18n.SCHEDULED_REPORT_FORM_FAILURE_TOAST_TITLE,
        toastMessage: i18n.SCHEDULED_REPORT_FORM_FAILURE_TOAST_MESSAGE,
      });
      // Forward error to signal whether to close the flyout or not
      throw error;
    }
  };
  return (
    <ScheduledReportForm
      scheduledReport={scheduledReport}
      availableReportTypes={availableReportTypes}
      onClose={onClose}
      onSubmitForm={onSubmit}
      isSubmitLoading={isSubmitLoading}
    />
  );
};
