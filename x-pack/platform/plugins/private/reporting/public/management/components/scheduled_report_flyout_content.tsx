/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiDescribedFormGroupProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFormLabel,
  EuiSpacer,
} from '@elastic/eui';
import moment from 'moment';
import type { Moment } from 'moment';
import { useKibana } from '@kbn/reporting-public';
import {
  FIELD_TYPES,
  useForm,
  getUseField,
  Form,
  useFormData,
  type FormSchema,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { css } from '@emotion/react';
import { TIMEZONE_OPTIONS as UI_TIMEZONE_OPTIONS } from '@kbn/core-ui-settings-common';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { RecurringScheduleField } from '@kbn/response-ops-recurring-schedule-form/components/recurring_schedule_field';
import { SetRequired } from 'type-fest';
import { getStartDateValidator } from '../validators/start_date_validator';
import {
  SCHEDULED_REPORT_FLYOUT_CANCEL_BUTTON_LABEL,
  SCHEDULED_REPORT_FLYOUT_SUBMIT_BUTTON_LABEL,
  SCHEDULED_REPORT_FORM_EXPORTS_SECTION_DESCRIPTION,
  SCHEDULED_REPORT_FORM_FILE_NAME_LABEL,
  SCHEDULED_REPORT_FORM_FILE_TYPE_LABEL,
  SCHEDULED_REPORT_FORM_FILE_NAME_REQUIRED_MESSAGE,
  SCHEDULED_REPORT_FORM_FILE_NAME_SUFFIX,
  SCHEDULED_REPORT_FORM_RECURRING_LABEL,
  SCHEDULED_REPORT_FORM_SEND_BY_EMAIL_LABEL,
  SCHEDULED_REPORT_FORM_START_DATE_LABEL,
  SCHEDULED_REPORT_FORM_TIMEZONE_LABEL,
  SCHEDULED_REPORT_FORM_EMAIL_RECIPIENTS_LABEL,
  SCHEDULED_REPORT_FORM_EMAIL_RECIPIENTS_HINT,
  SCHEDULED_REPORT_FORM_EMAIL_SENSITIVE_INFO_TITLE,
  SCHEDULED_REPORT_FORM_FILE_TYPE_REQUIRED_MESSAGE,
  SCHEDULED_REPORT_FORM_START_DATE_REQUIRED_MESSAGE,
  SCHEDULED_REPORT_FORM_EMAIL_RECIPIENTS_REQUIRED_MESSAGE,
  SCHEDULED_REPORT_FORM_EXPORTS_SECTION_TITLE,
  SCHEDULED_REPORT_FORM_SCHEDULE_SECTION_TITLE,
  SCHEDULED_REPORT_FORM_DETAILS_SECTION_TITLE,
  SCHEDULED_REPORT_FORM_MISSING_EMAIL_CONNECTOR_TITLE,
} from '../translations';
import { ReportFormat, ScheduledReport } from '../../types';
import { getEmailsValidator } from '../validators/emails_validator';

export const toMoment = (value: string): Moment => moment(value);
export const toString = (value: Moment): string => value.toISOString();

const FormField = getUseField({
  component: Field,
});

const { emptyField } = fieldValidators;

export interface ScheduledReportFormProps {
  scheduledReport: SetRequired<Partial<ScheduledReport>, 'jobParams'>;
  availableFormats: ReportFormat[];
  onClose: () => void;
  readOnly?: boolean;
  hasEmailConnector?: boolean;
}

const TIMEZONE_OPTIONS = UI_TIMEZONE_OPTIONS.map((tz) => ({
  inputDisplay: tz,
  value: tz,
})) ?? [{ text: 'UTC', value: 'UTC' }];

const ResponsiveFormGroup = ({
  narrow = true,
  ...rest
}: EuiDescribedFormGroupProps & { narrow?: boolean }) => {
  const props: EuiDescribedFormGroupProps = {
    ...rest,
    ...(narrow
      ? {
          fullWidth: true,
          css: css`
            flex-direction: column;
            align-items: stretch;
          `,
          gutterSize: 's',
        }
      : {}),
  };
  return <EuiDescribedFormGroup {...props} />;
};

const useDefaultTimezone = () => {
  const kibanaTz: string = useUiSetting('dateFormat:tz');
  if (!kibanaTz || kibanaTz === 'Browser') {
    return { defaultTimezone: moment.tz?.guess() ?? 'UTC', isBrowser: true };
  }
  return { defaultTimezone: kibanaTz, isBrowser: false };
};

const formId = 'scheduledReportForm.recurringScheduleForm';

export const ScheduledReportForm = ({
  scheduledReport,
  availableFormats,
  onClose,
  hasEmailConnector,
  readOnly = false,
}: ScheduledReportFormProps) => {
  const {
    services: {
      actions: { validateEmailAddresses },
    },
  } = useKibana();

  const { defaultTimezone } = useDefaultTimezone();
  const today = useMemo(() => moment().tz(defaultTimezone), [defaultTimezone]);
  const defaultStartDateValue = useMemo(() => today.toISOString(), [today]);
  const schema = useMemo<FormSchema<ScheduledReport>>(
    () => ({
      fileName: {
        type: FIELD_TYPES.TEXT,
        label: SCHEDULED_REPORT_FORM_FILE_NAME_LABEL,
        validations: [
          {
            validator: emptyField(SCHEDULED_REPORT_FORM_FILE_NAME_REQUIRED_MESSAGE),
          },
        ],
      },
      fileType: {
        type: FIELD_TYPES.SUPER_SELECT,
        label: SCHEDULED_REPORT_FORM_FILE_TYPE_LABEL,
        defaultValue: availableFormats[0].id,
        validations: [
          {
            validator: emptyField(SCHEDULED_REPORT_FORM_FILE_TYPE_REQUIRED_MESSAGE),
          },
        ],
      },
      startDate: {
        type: FIELD_TYPES.DATE_PICKER,
        label: SCHEDULED_REPORT_FORM_START_DATE_LABEL,
        defaultValue: defaultStartDateValue,
        serializer: toString,
        deserializer: toMoment,
        validations: [
          {
            validator: emptyField(SCHEDULED_REPORT_FORM_START_DATE_REQUIRED_MESSAGE),
          },
          {
            validator: getStartDateValidator(today),
          },
        ],
      },
      timezone: {
        type: FIELD_TYPES.SUPER_SELECT,
        defaultValue: defaultTimezone,
        validations: [
          {
            validator: emptyField(SCHEDULED_REPORT_FORM_START_DATE_REQUIRED_MESSAGE),
          },
        ],
      },
      recurring: {
        type: FIELD_TYPES.TOGGLE,
        label: SCHEDULED_REPORT_FORM_RECURRING_LABEL,
        defaultValue: false,
      },
      recurringSchedule: {},
      sendByEmail: {
        type: FIELD_TYPES.TOGGLE,
        label: SCHEDULED_REPORT_FORM_SEND_BY_EMAIL_LABEL,
        defaultValue: false,
      },
      emailRecipients: {
        type: FIELD_TYPES.COMBO_BOX,
        label: SCHEDULED_REPORT_FORM_EMAIL_RECIPIENTS_LABEL,
        defaultValue: [],
        validations: [
          {
            validator: emptyField(SCHEDULED_REPORT_FORM_EMAIL_RECIPIENTS_REQUIRED_MESSAGE),
          },
          {
            isBlocking: false,
            validator: getEmailsValidator(validateEmailAddresses),
          },
        ],
      },
    }),
    [availableFormats, defaultStartDateValue, defaultTimezone, today, validateEmailAddresses]
  );
  const { form } = useForm<ScheduledReport>({
    defaultValue: scheduledReport,
    options: { stripEmptyFields: true },
    schema,
    onSubmit: async () => {
      // TODO create schedule
      onClose();
    },
  });
  const [{ recurring, startDate, timezone, sendByEmail }] = useFormData<ScheduledReport>({
    form,
    watch: ['recurring', 'startDate', 'timezone', 'sendByEmail'],
  });

  const submitForm = async () => {
    if (await form.validate()) {
      await form.submit();
    }
  };

  const isRecurring = recurring || false;
  const isEmailActive = sendByEmail || false;

  return (
    <>
      <EuiFlyoutBody>
        <Form form={form} id={formId}>
          <ResponsiveFormGroup title={<h3>{SCHEDULED_REPORT_FORM_DETAILS_SECTION_TITLE}</h3>}>
            <FormField
              path="fileName"
              componentProps={{
                compressed: true,
                fullWidth: true,
                euiFieldProps: {
                  compressed: true,
                  fullWidth: true,
                  append: SCHEDULED_REPORT_FORM_FILE_NAME_SUFFIX,
                  readOnly,
                },
              }}
            />
            <FormField
              path="fileType"
              componentProps={{
                compressed: true,
                fullWidth: true,
                euiFieldProps: {
                  compressed: true,
                  fullWidth: true,
                  options: availableFormats.map((f) => ({ inputDisplay: f.label, value: f.id })),
                  readOnly,
                },
              }}
            />
          </ResponsiveFormGroup>
          <ResponsiveFormGroup title={<h3>{SCHEDULED_REPORT_FORM_SCHEDULE_SECTION_TITLE}</h3>}>
            <FormField
              path="startDate"
              componentProps={{
                compressed: true,
                fullWidth: true,
                euiFieldProps: {
                  compressed: true,
                  fullWidth: true,
                  showTimeSelect: true,
                  minDate: today,
                  readOnly,
                },
              }}
            />
            <FormField
              path="timezone"
              componentProps={{
                id: 'timezone',
                compressed: true,
                fullWidth: true,
                euiFieldProps: {
                  compressed: true,
                  fullWidth: true,
                  options: TIMEZONE_OPTIONS,
                  prepend: (
                    <EuiFormLabel htmlFor="timezone">
                      {SCHEDULED_REPORT_FORM_TIMEZONE_LABEL}
                    </EuiFormLabel>
                  ),
                  readOnly,
                },
              }}
            />
            <FormField
              path="recurring"
              componentProps={{
                euiFieldProps: {
                  disabled: readOnly,
                },
              }}
            />
            {isRecurring && (
              <>
                <EuiSpacer size="m" />
                <RecurringScheduleField
                  startDate={startDate}
                  timezone={timezone ? [timezone] : [defaultTimezone]}
                  hideTimezone
                  readOnly={readOnly}
                  allowInfiniteRecurrence={false}
                />
              </>
            )}
          </ResponsiveFormGroup>
          <ResponsiveFormGroup
            title={<h3>{SCHEDULED_REPORT_FORM_EXPORTS_SECTION_TITLE}</h3>}
            description={<p>{SCHEDULED_REPORT_FORM_EXPORTS_SECTION_DESCRIPTION}</p>}
          >
            <FormField
              path="sendByEmail"
              componentProps={{
                euiFieldProps: {
                  disabled: readOnly || !hasEmailConnector,
                },
              }}
            />
            {!hasEmailConnector && (
              <>
                <EuiSpacer size="m" />
                <EuiCallOut
                  title={SCHEDULED_REPORT_FORM_MISSING_EMAIL_CONNECTOR_TITLE}
                  iconType="iInCircle"
                  size="s"
                  color="warning"
                >
                  <p>Missing email connector message</p>
                </EuiCallOut>
              </>
            )}
            {isEmailActive && (
              <>
                <EuiSpacer size="m" />
                <EuiFlexGroup direction="column" gutterSize="s">
                  <FormField
                    path="emailRecipients"
                    componentProps={{
                      compressed: true,
                      fullWidth: true,
                      helpText: SCHEDULED_REPORT_FORM_EMAIL_RECIPIENTS_HINT,
                      euiFieldProps: {
                        compressed: true,
                        fullWidth: true,
                        readOnly,
                      },
                    }}
                  />
                  <EuiCallOut
                    title={SCHEDULED_REPORT_FORM_EMAIL_SENSITIVE_INFO_TITLE}
                    iconType="iInCircle"
                    size="s"
                  >
                    <p>Sensitive info warning text</p>
                  </EuiCallOut>
                </EuiFlexGroup>
              </>
            )}
          </ResponsiveFormGroup>
        </Form>
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
              <EuiButton type="submit" form={formId} isDisabled={false} onClick={submitForm} fill>
                {SCHEDULED_REPORT_FLYOUT_SUBMIT_BUTTON_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </>
  );
};
