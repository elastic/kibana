/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import moment from 'moment';
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { ReportingAPIClient, useKibana } from '@kbn/reporting-public';
import type { ReportingSharingData } from '@kbn/reporting-public/share/share_context_menu';
import { REPORTING_MANAGEMENT_SCHEDULES } from '@kbn/reporting-common';
import {
  FIELD_TYPES,
  Form,
  FormSchema,
  getUseField,
  useForm,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { convertToRRule } from '@kbn/response-ops-recurring-schedule-form/utils/convert_to_rrule';
import type { Rrule } from '@kbn/task-manager-plugin/server/task';
import { mountReactNode } from '@kbn/core-mount-utils-browser-internal';
import { RecurringScheduleFormFields } from '@kbn/response-ops-recurring-schedule-form/components/recurring_schedule_form_fields';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { Frequency } from '@kbn/rrule';
import { useGetUserProfileQuery } from '../hooks/use_get_user_profile_query';
import { ResponsiveFormGroup } from './responsive_form_group';
import { getReportParams } from '../report_params';
import { getScheduledReportFormSchema } from '../schemas/scheduled_report_form_schema';
import { useDefaultTimezone } from '../hooks/use_default_timezone';
import { useScheduleReport } from '../hooks/use_schedule_report';
import { useGetReportingHealthQuery } from '../hooks/use_get_reporting_health_query';
import { ReportTypeData, ScheduledReport } from '../../types';
import * as i18n from '../translations';
import { SCHEDULED_REPORT_FORM_ID } from '../constants';

const FormField = getUseField({
  component: Field,
});

export type FormData = Pick<
  ScheduledReport,
  | 'title'
  | 'reportTypeId'
  | 'recurringSchedule'
  | 'sendByEmail'
  | 'emailRecipients'
  | 'optimizedForPrinting'
>;

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
  if (!readOnly && (!objectType || !sharingData)) {
    throw new Error('Cannot schedule an export without an objectType or sharingData');
  }
  const {
    application: { capabilities },
    http,
    actions: { validateEmailAddresses },
    notifications: { toasts },
    userProfile: userProfileService,
  } = useKibana().services;
  const { data: userProfile, isLoading: isUserProfileLoading } = useGetUserProfileQuery({
    userProfileService,
  });
  const {
    data: reportingHealth,
    isLoading: isReportingHealthLoading,
    isError: isReportingHealthError,
  } = useGetReportingHealthQuery({ http });
  const hasManageReportingPrivilege = useMemo(() => {
    if (!capabilities) {
      return false;
    }
    return capabilities.manageReporting.show === true;
  }, [capabilities]);
  const reportingPageLink = useMemo(
    () => (
      <EuiLink href={http.basePath.prepend(REPORTING_MANAGEMENT_SCHEDULES)}>
        {i18n.REPORTING_PAGE_LINK_TEXT}
      </EuiLink>
    ),
    [http.basePath]
  );
  const { mutateAsync: scheduleReport, isLoading: isScheduleExportLoading } = useScheduleReport({
    http,
  });
  const { defaultTimezone } = useDefaultTimezone();
  const now = useMemo(() => moment().tz(defaultTimezone), [defaultTimezone]);
  const defaultStartDateValue = useMemo(() => now.toISOString(), [now]);
  const schema = useMemo(
    () =>
      getScheduledReportFormSchema(
        validateEmailAddresses,
        availableReportTypes
      ) as FormSchema<FormData>,
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
        const {
          title,
          reportTypeId,
          recurringSchedule,
          optimizedForPrinting,
          sendByEmail,
          emailRecipients,
        } = formData;
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
            title,
            reportTypeId,
            ...(reportTypeId === 'printablePdfV2' ? { optimizedForPrinting } : {}),
          }),
          schedule: { rrule: rrule as Rrule },
          notification: sendByEmail ? { email: { to: emailRecipients } } : undefined,
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
    },
  });
  const [{ reportTypeId, sendByEmail }] = useFormData<FormData>({
    form,
    watch: ['reportTypeId', 'sendByEmail'],
  });

  useEffect(() => {
    if (!readOnly && !hasManageReportingPrivilege && userProfile?.user.email) {
      form.setFieldValue('emailRecipients', [userProfile.user.email]);
    }
  }, [form, hasManageReportingPrivilege, readOnly, userProfile?.user.email]);

  const isRecurring = recurring || false;
  const isEmailActive = sendByEmail || false;

  const onSubmit = async () => {
    try {
      if (await form.validate()) {
        await form.submit();
        onClose();
      }
    } catch (e) {
      // Keep the flyout open in case of schedule error
    }
  };

  const hasUnmetPrerequisites =
    !reportingHealth?.isSufficientlySecure || !reportingHealth?.hasPermanentEncryptionKey;

  return (
    <>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="s">
          <h2>
            {i18n.SCHEDULED_REPORT_FLYOUT_TITLE}{' '}
            <EuiBetaBadge
              className="eui-alignMiddle"
              iconType="flask"
              label={i18n.TECH_PREVIEW_LABEL}
              tooltipContent={i18n.TECH_PREVIEW_DESCRIPTION}
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {!readOnly && (isReportingHealthLoading || isUserProfileLoading) ? (
          <EuiLoadingSpinner size="l" />
        ) : isReportingHealthError ? (
          <EuiCallOut
            title={i18n.CANNOT_LOAD_REPORTING_HEALTH_TITLE}
            iconType="error"
            color="danger"
          >
            <p>{i18n.CANNOT_LOAD_REPORTING_HEALTH_MESSAGE}</p>
          </EuiCallOut>
        ) : hasUnmetPrerequisites ? (
          <EuiCallOut
            title={i18n.UNMET_REPORTING_PREREQUISITES_TITLE}
            iconType="error"
            color="danger"
          >
            <p>{i18n.UNMET_REPORTING_PREREQUISITES_MESSAGE}</p>
          </EuiCallOut>
        ) : (
          <Form form={form} id={SCHEDULED_REPORT_FORM_ID}>
            <ResponsiveFormGroup
              title={<h3>{i18n.SCHEDULED_REPORT_FORM_DETAILS_SECTION_TITLE}</h3>}
            >
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
                      availableReportTypes?.map((f) => ({ inputDisplay: f.label, value: f.id })) ??
                      [],
                    readOnly,
                  },
                }}
              />
              {reportTypeId === 'printablePdfV2' && (
                <FormField
                  path="optimizedForPrinting"
                  config={{
                    type: FIELD_TYPES.TOGGLE,
                    label: i18n.SCHEDULED_REPORT_FORM_OPTIMIZED_FOR_PRINTING_LABEL,
                  }}
                  componentProps={{
                    helpText: i18n.SCHEDULED_REPORT_FORM_OPTIMIZED_FOR_PRINTING_DESCRIPTION,
                    euiFieldProps: {
                      compressed: true,
                      disabled: readOnly,
                    },
                  }}
                />
              )}
            </ResponsiveFormGroup>
            <ResponsiveFormGroup
              title={<h3>{i18n.SCHEDULED_REPORT_FORM_SCHEDULE_SECTION_TITLE}</h3>}
            >
              {isRecurring && (
                <RecurringScheduleFormFields
                  startDate={!readOnly ? startDate : undefined}
                  timezone={!readOnly ? (timezone ? [timezone] : [defaultTimezone]) : undefined}
                  hideTimezone
                  readOnly={readOnly}
                  supportsEndOptions={false}
                  minFrequency={Frequency.MONTHLY}
                  showTimeInSummary
                  compressed
                />
              )}
            </ResponsiveFormGroup>
            <ResponsiveFormGroup
              title={<h3>{i18n.SCHEDULED_REPORT_FORM_EXPORTS_SECTION_TITLE}</h3>}
              description={
                !readOnly && (
                  <p>
                    {i18n.SCHEDULED_REPORT_FORM_EXPORTS_SECTION_DESCRIPTION} {reportingPageLink}.
                  </p>
                )
              }
            >
              <FormField
                path="sendByEmail"
                componentProps={{
                  helpText:
                    !hasManageReportingPrivilege && !userProfile?.user.email
                      ? i18n.SCHEDULED_REPORT_FORM_NO_USER_EMAIL_HINT
                      : undefined,
                  euiFieldProps: {
                    compressed: true,
                    disabled:
                      readOnly ||
                      !reportingHealth.areNotificationsEnabled ||
                      (!hasManageReportingPrivilege && !userProfile?.user.email),
                  },
                }}
              />
              {reportingHealth.areNotificationsEnabled ? (
                isEmailActive && (
                  <>
                    <EuiSpacer size="m" />
                    <EuiFlexGroup direction="column" gutterSize="s">
                      <FormField
                        path="emailRecipients"
                        componentProps={{
                          compressed: true,
                          fullWidth: true,
                          helpText: !readOnly
                            ? hasManageReportingPrivilege
                              ? i18n.SCHEDULED_REPORT_FORM_EMAIL_RECIPIENTS_HINT
                              : i18n.SCHEDULED_REPORT_FORM_EMAIL_SELF_HINT
                            : undefined,
                          euiFieldProps: {
                            compressed: true,
                            fullWidth: true,
                            isDisabled: readOnly || !hasManageReportingPrivilege,
                            'data-test-subj': 'emailRecipientsCombobox',
                          },
                        }}
                      />
                      {!readOnly && (
                        <EuiCallOut
                          title={i18n.SCHEDULED_REPORT_FORM_EMAIL_SENSITIVE_INFO_TITLE}
                          iconType="info"
                          size="s"
                        >
                          <p>{i18n.SCHEDULED_REPORT_FORM_EMAIL_SENSITIVE_INFO_MESSAGE}</p>
                        </EuiCallOut>
                      )}
                    </EuiFlexGroup>
                  </>
                )
              ) : (
                <>
                  <EuiSpacer size="m" />
                  <EuiCallOut
                    title={i18n.SCHEDULED_REPORT_FORM_MISSING_EMAIL_CONNECTOR_TITLE}
                    iconType="info"
                    size="s"
                    color="warning"
                  >
                    <p>{i18n.SCHEDULED_REPORT_FORM_MISSING_EMAIL_CONNECTOR_MESSAGE}</p>
                  </EuiCallOut>
                </>
              )}
            </ResponsiveFormGroup>
          </Form>
        )}
      </EuiFlyoutBody>
      {!readOnly && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} flush="left">
                {i18n.SCHEDULED_REPORT_FLYOUT_CANCEL_BUTTON_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                type="submit"
                form={SCHEDULED_REPORT_FORM_ID}
                data-test-subj="scheduleExportSubmitButton"
                isDisabled={isReportingHealthLoading || isUserProfileLoading}
                onClick={onSubmit}
                isLoading={isScheduleExportLoading}
                fill
              >
                {i18n.SCHEDULED_REPORT_FLYOUT_SUBMIT_BUTTON_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </>
  );
};
