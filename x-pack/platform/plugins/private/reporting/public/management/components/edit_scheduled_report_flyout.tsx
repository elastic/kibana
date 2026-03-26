/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { convertToRRule } from '@kbn/response-ops-recurring-schedule-form/utils/convert_to_rrule';
import { useKibana } from '@kbn/reporting-public';
import type { Rrule } from '@kbn/task-manager-plugin/server/task';
import { mountReactNode } from '@kbn/core-mount-utils-browser-internal';
import { transformEmailNotification } from '../utils';
import type { ReportTypeData, ScheduledReport } from '../../types';
import type { FormData } from './scheduled_report_form';
import { ScheduledReportForm } from './scheduled_report_form';
import { useUpdateScheduleReport } from '../hooks/use_update_schedule_report';
import * as i18n from '../translations';

export interface ScheduledReportFlyoutProps {
  scheduledReport: Partial<ScheduledReport>;
  availableReportTypes: ReportTypeData[];
  onClose: () => void;
}

export const EditScheduledReportFlyout = ({
  scheduledReport,
  availableReportTypes,
  onClose,
}: ScheduledReportFlyoutProps) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const { mutateAsync: updateScheduleReport, isLoading: isSubmitLoading } = useUpdateScheduleReport(
    {
      http,
    }
  );

  const onSubmit = async (formData: FormData) => {
    try {
      const {
        title,
        startDate,
        timezone,
        recurringSchedule,
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

      await updateScheduleReport({
        reportId: scheduledReport.id!,
        title,
        schedule: { rrule: rrule as Rrule },
        notification: {
          email: sendByEmail
            ? transformEmailNotification({
                emailRecipients,
                emailCcRecipients,
                emailBccRecipients,
                emailSubject,
                emailMessage,
              })
            : // Nullifying the email notification to remove it (undefined leaves it unchanged)
              null,
        },
      });
      toasts.addSuccess({
        title: i18n.SCHEDULED_REPORT_UPDATE_SUCCESS_TOAST_TITLE,
        text: mountReactNode(<>{i18n.SCHEDULED_REPORT_UPDATE_SUCCESS_TOAST_MESSAGE}</>),
      });
    } catch (error) {
      toasts.addError(error, {
        title: i18n.SCHEDULED_REPORT_FORM_FAILURE_TOAST_TITLE,
        toastMessage: i18n.SCHEDULED_REPORT_FORM_FAILURE_TOAST_MESSAGE,
      });
      // Forward error to signal whether to close the flyout or not
      throw error;
    }
  };

  return (
    <EuiFlyout
      size="m"
      maxWidth={500}
      paddingSize="l"
      ownFocus={true}
      onClose={onClose}
      data-test-subj="editScheduledReportFlyout"
      aria-label="editScheduledReportFlyout"
    >
      <ScheduledReportForm
        scheduledReport={scheduledReport}
        availableReportTypes={availableReportTypes}
        onClose={onClose}
        onSubmitForm={onSubmit}
        isSubmitLoading={isSubmitLoading}
        editMode
      />
    </EuiFlyout>
  );
};
