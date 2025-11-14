/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { Moment } from 'moment';
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
  EuiFormLabel,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { useKibana } from '@kbn/reporting-public';
import { REPORTING_MANAGEMENT_SCHEDULES } from '@kbn/reporting-common';
import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  FIELD_TYPES,
  Form,
  getUseField,
  useForm,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { RecurringScheduleFormFields } from '@kbn/response-ops-recurring-schedule-form/components/recurring_schedule_form_fields';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { Frequency } from '@kbn/rrule';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { TIMEZONE_OPTIONS as UI_TIMEZONE_OPTIONS } from '@kbn/core-ui-settings-common';
import {
  convertStringToMoment,
  convertMomentToString,
} from '@kbn/response-ops-recurring-schedule-form/converters/moment';
import { useGetUserProfileQuery } from '../hooks/use_get_user_profile_query';
import { ResponsiveFormGroup } from './responsive_form_group';
import { getScheduledReportFormSchema } from '../schemas/scheduled_report_form_schema';
import { useDefaultTimezone } from '../hooks/use_default_timezone';
import { useGetReportingHealthQuery } from '../hooks/use_get_reporting_health_query';
import type { ReportTypeData, ScheduledReport } from '../../types';
import * as i18n from '../translations';
import { SCHEDULED_REPORT_FORM_ID } from '../constants';
import { getStartDateValidator } from '../validators/start_date_validator';

const { emptyField } = fieldValidators;

const FormField = getUseField({
  component: Field,
});

const TIMEZONE_OPTIONS = UI_TIMEZONE_OPTIONS.map((tz) => ({
  inputDisplay: tz,
  value: tz,
})) ?? [{ text: 'UTC', value: 'UTC' }];

export type FormData = Pick<
  ScheduledReport,
  | 'title'
  | 'reportTypeId'
  | 'startDate'
  | 'timezone'
  | 'recurringSchedule'
  | 'sendByEmail'
  | 'emailRecipients'
  | 'optimizedForPrinting'
>;

export interface ScheduledReportFormProps {
  scheduledReport: Partial<ScheduledReport>;
  availableReportTypes?: ReportTypeData[];
  onClose: () => void;
  onSubmitForm?: (params: FormData) => Promise<void>;
  isSubmitLoading?: boolean;
  defaultEmail?: string;
  editMode?: boolean;
  readOnly?: boolean;
}

export const ScheduledReportForm = ({
  onSubmitForm,
  isSubmitLoading,
  scheduledReport,
  availableReportTypes,
  onClose,
  editMode,
  readOnly,
}: ScheduledReportFormProps) => {
  const {
    application: { capabilities },
    http,
    actions: { validateEmailAddresses },
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
  const { defaultTimezone } = useDefaultTimezone();
  const schema = useMemo(
    () =>
      getScheduledReportFormSchema(
        validateEmailAddresses,
        availableReportTypes
      ) as FormSchema<FormData>,
    [availableReportTypes, validateEmailAddresses]
  );
  const { form } = useForm<FormData>({
    defaultValue: scheduledReport,
    options: { stripEmptyFields: true },
    schema,
    onSubmit: onSubmitForm,
  });
  const [{ reportTypeId, startDate, timezone, sendByEmail }] = useFormData<FormData>({
    form,
    watch: ['reportTypeId', 'startDate', 'timezone', 'sendByEmail'],
  });
  const now = useMemo(() => moment().set({ second: 0, millisecond: 0 }), []);
  const defaultStartDateValue = useMemo(() => now.toISOString(), [now]);

  useEffect(() => {
    if (!editMode && !readOnly && !hasManageReportingPrivilege && userProfile?.user.email) {
      form.setFieldValue('emailRecipients', [userProfile?.user.email]);
    }
  }, [form, editMode, readOnly, hasManageReportingPrivilege, userProfile?.user.email]);

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

  const isLoadingDependencies = isReportingHealthLoading || isUserProfileLoading;
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
        {isLoadingDependencies ? (
          <EuiLoadingSpinner size="l" />
        ) : isReportingHealthError ? (
          <EuiCallOut
            announceOnMount
            title={i18n.CANNOT_LOAD_REPORTING_HEALTH_TITLE}
            iconType="error"
            color="danger"
          >
            <p>{i18n.CANNOT_LOAD_REPORTING_HEALTH_MESSAGE}</p>
          </EuiCallOut>
        ) : hasUnmetPrerequisites ? (
          <EuiCallOut
            announceOnMount
            title={i18n.UNMET_REPORTING_PREREQUISITES_TITLE}
            iconType="error"
            color="danger"
          >
            <p>{i18n.UNMET_REPORTING_PREREQUISITES_MESSAGE}</p>
          </EuiCallOut>
        ) : (
          <Form form={form} id={SCHEDULED_REPORT_FORM_ID} data-test-subj="scheduleExportForm">
            <ResponsiveFormGroup
              title={<h3>{i18n.SCHEDULED_REPORT_FORM_DETAILS_SECTION_TITLE}</h3>}
            >
              <FormField
                path="title"
                componentProps={{
                  fullWidth: true,
                  euiFieldProps: {
                    compressed: true,
                    fullWidth: true,
                    append: i18n.SCHEDULED_REPORT_FORM_FILE_NAME_SUFFIX,
                    readOnly,
                    'data-test-subj': 'reportTitleInput',
                  },
                }}
              />
              <FormField
                path="reportTypeId"
                componentProps={{
                  fullWidth: true,
                  euiFieldProps: {
                    compressed: true,
                    fullWidth: true,
                    options:
                      availableReportTypes?.map((f) => ({ inputDisplay: f.label, value: f.id })) ??
                      [],
                    readOnly: editMode || readOnly,
                    'data-test-subj': 'reportTypeIdSelect',
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
                      readOnly: editMode || readOnly,
                    },
                  }}
                />
              )}
            </ResponsiveFormGroup>
            <ResponsiveFormGroup
              title={<h3>{i18n.SCHEDULED_REPORT_FORM_SCHEDULE_SECTION_TITLE}</h3>}
            >
              <FormField<string, FormData, Moment>
                path="startDate"
                config={{
                  type: FIELD_TYPES.DATE_PICKER,
                  label: i18n.SCHEDULED_REPORT_FORM_START_DATE_LABEL,
                  defaultValue: defaultStartDateValue,
                  serializer: convertMomentToString,
                  deserializer: convertStringToMoment,
                  validations: [
                    {
                      validator: emptyField(i18n.SCHEDULED_REPORT_FORM_START_DATE_REQUIRED_MESSAGE),
                    },
                    {
                      validator: getStartDateValidator(now, timezone ?? defaultTimezone, startDate),
                    },
                  ],
                }}
                componentProps={{
                  fullWidth: true,
                  euiFieldProps: {
                    compressed: true,
                    fullWidth: true,
                    showTimeSelect: true,
                    minDate: now,
                    readOnly,
                    'data-test-subj': 'startDatePicker',
                  },
                }}
              />
              <FormField
                path="timezone"
                config={{
                  type: FIELD_TYPES.SUPER_SELECT,
                  defaultValue: defaultTimezone,
                  validations: [
                    {
                      validator: emptyField(i18n.SCHEDULED_REPORT_FORM_START_DATE_REQUIRED_MESSAGE),
                    },
                  ],
                }}
                componentProps={{
                  id: 'timezone',
                  fullWidth: true,
                  euiFieldProps: {
                    compressed: true,
                    fullWidth: true,
                    options: TIMEZONE_OPTIONS,
                    readOnly,
                    'data-test-subj': 'timezoneCombobox',
                    prepend: (
                      <EuiFormLabel htmlFor="timezone">
                        {i18n.SCHEDULED_REPORT_FORM_TIMEZONE_LABEL}
                      </EuiFormLabel>
                    ),
                  },
                }}
              />
              <EuiSpacer size="m" />
              <RecurringScheduleFormFields
                startDate={startDate}
                timezone={timezone ? [timezone] : [defaultTimezone]}
                hideTimezone
                supportsEndOptions={false}
                minFrequency={Frequency.MONTHLY}
                showTimeInSummary
                compressed
                readOnly={readOnly}
              />
            </ResponsiveFormGroup>
            <ResponsiveFormGroup
              title={<h3>{i18n.SCHEDULED_REPORT_FORM_EXPORTS_SECTION_TITLE}</h3>}
              description={
                !editMode && (
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
                    'data-test-subj': 'sendByEmailToggle',
                    disabled:
                      readOnly ||
                      editMode ||
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
                          fullWidth: true,
                          helpText: !editMode
                            ? hasManageReportingPrivilege
                              ? i18n.SCHEDULED_REPORT_FORM_EMAIL_RECIPIENTS_HINT
                              : i18n.SCHEDULED_REPORT_FORM_EMAIL_SELF_HINT
                            : undefined,
                          euiFieldProps: {
                            compressed: true,
                            fullWidth: true,
                            isDisabled: editMode || !hasManageReportingPrivilege,
                            'data-test-subj': 'emailRecipientsCombobox',
                            readOnly,
                          },
                        }}
                      />
                      {!editMode && (
                        <EuiCallOut
                          announceOnMount
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
                    announceOnMount
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
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="scheduleExportCancelButton"
              onClick={onClose}
              flush="left"
              aria-label={i18n.SCHEDULED_REPORT_FLYOUT_CANCEL_BUTTON_LABEL}
            >
              {i18n.SCHEDULED_REPORT_FLYOUT_CANCEL_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              type="submit"
              form={SCHEDULED_REPORT_FORM_ID}
              data-test-subj="scheduleExportSubmitButton"
              isDisabled={isReportingHealthLoading || isUserProfileLoading || readOnly}
              onClick={onSubmit}
              isLoading={isSubmitLoading}
              fill
            >
              {i18n.SCHEDULED_REPORT_FLYOUT_SUBMIT_BUTTON_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
