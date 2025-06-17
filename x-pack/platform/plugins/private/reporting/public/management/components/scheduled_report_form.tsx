/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useImperativeHandle, useMemo } from 'react';
import { EuiCallOut, EuiFlexGroup, EuiLink, EuiSpacer } from '@elastic/eui';
import moment from 'moment';
import type { Moment } from 'moment';
import { type ReportingAPIClient, useKibana } from '@kbn/reporting-public';
import {
  useForm,
  getUseField,
  Form,
  useFormData,
  type FormSchema,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { RecurringScheduleFormFields } from '@kbn/response-ops-recurring-schedule-form/components/recurring_schedule_form_fields';
import { REPORTING_MANAGEMENT_HOME } from '@kbn/reporting-common';
import { convertToRRule } from '@kbn/response-ops-recurring-schedule-form/utils/convert_to_rrule';
import type { Rrule } from '@kbn/task-manager-plugin/server/task';
import type { ReportingSharingData } from '@kbn/reporting-public/share/share_context_menu';
import { mountReactNode } from '@kbn/core-mount-utils-browser-internal';
import { getScheduledReportFormSchema } from '../schemas/scheduled_report_form_schema';
import { useDefaultTimezone } from '../hooks/use_default_timezone';
import { useScheduleReport } from '../hooks/use_schedule_report';
import * as i18n from '../translations';
import { ReportTypeData, ScheduledReport } from '../../types';
import { getReportParams } from '../report_params';
import { SCHEDULED_REPORT_FORM_ID } from '../constants';
import { ResponsiveFormGroup } from './responsive_form_group';

export const toMoment = (value: string): Moment => moment(value);
export const toString = (value: Moment): string => value.toISOString();

const FormField = getUseField({
  component: Field,
});

export interface ScheduledReportFormProps {
  apiClient: ReportingAPIClient;
  sharingData?: ReportingSharingData;
  scheduledReport: Partial<ScheduledReport>;
  availableReportTypes?: ReportTypeData[];
  readOnly?: boolean;
  hasEmailConnector?: boolean;
  objectType?: string;
}

export type FormData = Pick<
  ScheduledReport,
  'title' | 'reportTypeId' | 'recurringSchedule' | 'sendByEmail' | 'emailRecipients'
>;

export interface ScheduledReportFormImperativeApi {
  submit: () => Promise<void>;
}

export const ScheduledReportForm = forwardRef<
  ScheduledReportFormImperativeApi,
  ScheduledReportFormProps
>(
  (
    {
      apiClient,
      sharingData,
      scheduledReport,
      availableReportTypes,
      hasEmailConnector,
      objectType,
      readOnly = false,
    },
    ref
  ) => {
    if (!readOnly && (!objectType || !sharingData)) {
      throw new Error('Cannot schedule an export without an objectType or sharingData');
    }
    const {
      services: {
        http,
        actions: { validateEmailAddresses },
        notifications: { toasts },
      },
    } = useKibana();
    const reportingPageLink = useMemo(
      () => (
        <EuiLink href={http.basePath.prepend(REPORTING_MANAGEMENT_HOME)}>
          {i18n.REPORTING_PAGE_LINK_TEXT}
        </EuiLink>
      ),
      [http.basePath]
    );
    const { mutateAsync: scheduleReport } = useScheduleReport({ http });
    const { defaultTimezone } = useDefaultTimezone();
    const now = useMemo(() => moment().tz(defaultTimezone), [defaultTimezone]);
    const defaultStartDateValue = useMemo(() => now.toISOString(), [now]);
    const schema = useMemo<FormSchema<ScheduledReport>>(
      () => getScheduledReportFormSchema(validateEmailAddresses, availableReportTypes),
      [availableReportTypes, validateEmailAddresses]
    );
    const recurring = true;
    const startDate = defaultStartDateValue;
    const timezone = defaultTimezone;
    const { form } = useForm<FormData>({
      defaultValue: scheduledReport,
      options: { stripEmptyFields: true },
      schema,
      onSubmit: async (formData) => {
        try {
          const { reportTypeId, recurringSchedule } = formData;
          // Remove start date since it's not supported for now
          const { dtstart, ...rrule } = convertToRRule({
            startDate: now,
            timezone,
            recurringSchedule,
            includeTime: true,
          });
          await scheduleReport({
            reportTypeId,
            jobParams: getReportParams({
              apiClient,
              // The assertion at the top of the component ensures these are defined when scheduling
              sharingData: sharingData!,
              objectType: objectType!,
              title: formData.title,
              reportTypeId: formData.reportTypeId,
            }),
            schedule: { rrule: rrule as Rrule },
            notification: formData.sendByEmail
              ? { email: { to: formData.emailRecipients } }
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
          toasts.addError(error, {
            title: i18n.SCHEDULED_REPORT_FORM_FAILURE_TOAST_TITLE,
            toastMessage: i18n.SCHEDULED_REPORT_FORM_FAILURE_TOAST_MESSAGE,
          });
        }
      },
    });
    const [{ sendByEmail }] = useFormData<FormData>({
      form,
      watch: ['sendByEmail'],
    });

    const submit = async () => {
      const isValid = await form.validate();
      if (!isValid) {
        throw new Error('Form validation failed');
      }
      await form.submit();
    };

    useImperativeHandle(ref, () => ({
      submit,
    }));

    const isRecurring = recurring || false;
    const isEmailActive = sendByEmail || false;

    return (
      <Form form={form} id={SCHEDULED_REPORT_FORM_ID}>
        <ResponsiveFormGroup title={<h3>{i18n.SCHEDULED_REPORT_FORM_DETAILS_SECTION_TITLE}</h3>}>
          <FormField
            path="title"
            componentProps={{
              compressed: true,
              fullWidth: true,
              euiFieldProps: {
                compressed: true,
                fullWidth: true,
                append: i18n.SCHEDULED_REPORT_FORM_FILE_NAME_SUFFIX,
                readOnly,
              },
            }}
          />
          <FormField
            path="reportTypeId"
            componentProps={{
              compressed: true,
              fullWidth: true,
              euiFieldProps: {
                compressed: true,
                fullWidth: true,
                options:
                  availableReportTypes?.map((f) => ({ inputDisplay: f.label, value: f.id })) ?? [],
                readOnly,
              },
            }}
          />
        </ResponsiveFormGroup>
        <ResponsiveFormGroup title={<h3>{i18n.SCHEDULED_REPORT_FORM_SCHEDULE_SECTION_TITLE}</h3>}>
          {isRecurring && (
            <RecurringScheduleFormFields
              startDate={startDate}
              timezone={timezone ? [timezone] : [defaultTimezone]}
              hideTimezone
              readOnly={readOnly}
              supportsEndOptions={false}
            />
          )}
        </ResponsiveFormGroup>
        <ResponsiveFormGroup
          title={<h3>{i18n.SCHEDULED_REPORT_FORM_EXPORTS_SECTION_TITLE}</h3>}
          description={
            <p>
              {i18n.SCHEDULED_REPORT_FORM_EXPORTS_SECTION_DESCRIPTION} {reportingPageLink}.
            </p>
          }
        >
          <FormField
            path="sendByEmail"
            componentProps={{
              euiFieldProps: {
                disabled: readOnly || !hasEmailConnector,
              },
            }}
          />
          {hasEmailConnector ? (
            isEmailActive && (
              <>
                <EuiSpacer size="m" />
                <EuiFlexGroup direction="column" gutterSize="s">
                  <FormField
                    path="emailRecipients"
                    componentProps={{
                      compressed: true,
                      fullWidth: true,
                      helpText: i18n.SCHEDULED_REPORT_FORM_EMAIL_RECIPIENTS_HINT,
                      euiFieldProps: {
                        compressed: true,
                        fullWidth: true,
                        readOnly,
                      },
                    }}
                  />
                  <EuiCallOut
                    title={i18n.SCHEDULED_REPORT_FORM_EMAIL_SENSITIVE_INFO_TITLE}
                    iconType="iInCircle"
                    size="s"
                  >
                    <p>{i18n.SCHEDULED_REPORT_FORM_EMAIL_SENSITIVE_INFO_MESSAGE}</p>
                  </EuiCallOut>
                </EuiFlexGroup>
              </>
            )
          ) : (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                title={i18n.SCHEDULED_REPORT_FORM_MISSING_EMAIL_CONNECTOR_TITLE}
                iconType="iInCircle"
                size="s"
                color="warning"
              >
                <p>{i18n.SCHEDULED_REPORT_FORM_MISSING_EMAIL_CONNECTOR_MESSAGE}</p>
              </EuiCallOut>
            </>
          )}
        </ResponsiveFormGroup>
      </Form>
    );
  }
);
