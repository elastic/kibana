/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  useForm,
  FIELD_TYPES,
  Form,
  useFormIsModified,
  UseField,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import {
  ButtonGroupField,
  NumericField,
  SelectField,
  ToggleField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import { timeUnits, failureStorePeriodOptions } from '../constants';
import { splitSizeAndUnits } from '../utils';

const editFailureStoreFormSchema: FormSchema = {
  failureStore: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
  },
  periodType: {
    type: FIELD_TYPES.SUPER_SELECT,
    defaultValue: 'default',
  },
  retentionPeriodValue: {
    type: FIELD_TYPES.NUMBER,
    defaultValue: 30,
    validations: [
      {
        validator: ({ value, formData }) => {
          // Only validate when failure store is enabled AND period type is custom
          if (formData.failureStore && formData.periodType === 'custom') {
            if (!value || value <= 0) {
              return {
                message: i18n.translate(
                  'xpack.failureStoreModal.form.retentionPeriodValue.required',
                  {
                    defaultMessage:
                      'Retention period value is required when failure store is enabled.',
                  }
                ),
              };
            }
          }
          // Explicitly return undefined when validation doesn't apply to clear any previous errors
          return undefined;
        },
      },
    ],
    fieldsToValidateOnChange: ['failureStore', 'periodType', 'retentionPeriodValue'],
  },
  retentionPeriodUnit: {
    type: FIELD_TYPES.SELECT,
    defaultValue: 'd',
  },
};

export interface FailureStoreFormProps {
  failureStoreEnabled: boolean;
  defaultRetentionPeriod: string;
  customRetentionPeriod?: string;
}

interface FailureStoreFormData {
  failureStoreEnabled: boolean;
  customRetentionPeriod?: string;
}

interface Props {
  onCloseModal: () => void;
  onSaveModal: (data: FailureStoreFormData) => void;
  failureStoreProps: FailureStoreFormProps;
  isSaveButtonLoading: boolean;
}

export const FailureStoreModal: FunctionComponent<Props> = ({
  onCloseModal,
  onSaveModal,
  failureStoreProps,
  isSaveButtonLoading,
}) => {
  const onSubmitForm = async () => {
    const { isValid, data } = await form.submit();

    if (!isValid) {
      return;
    }

    // The new failure store configuration has to include the enabled state and, if the custom retention type is enabled, the retention period.
    const newFailureStoreConfig: FailureStoreFormData = { failureStoreEnabled: data.failureStore };
    if (data.failureStore) {
      if (data.periodType === 'custom') {
        newFailureStoreConfig.customRetentionPeriod = `${data.retentionPeriodValue}${data.retentionPeriodUnit}`;
      }
    }
    onSaveModal(newFailureStoreConfig);
  };

  const modalTitleId = useGeneratedHtmlId();

  const defaultRetentionPeriod = splitSizeAndUnits(failureStoreProps.defaultRetentionPeriod);
  const customRetentionPeriod = failureStoreProps.customRetentionPeriod
    ? splitSizeAndUnits(failureStoreProps.customRetentionPeriod)
    : null;

  const { form } = useForm({
    defaultValue: {
      failureStore: failureStoreProps.failureStoreEnabled ?? false,
      periodType: failureStoreProps.customRetentionPeriod ? 'custom' : 'default',
      retentionPeriodValue: customRetentionPeriod?.size ?? defaultRetentionPeriod.size,
      retentionPeriodUnit: customRetentionPeriod?.unit ?? defaultRetentionPeriod.unit,
    },
    schema: editFailureStoreFormSchema,
    id: 'editFailureStoreForm',
  });

  const [{ failureStore, periodType }] = useFormData({
    form,
    watch: ['failureStore', 'periodType'],
  });

  const isDirty = useFormIsModified({ form });

  const isCustomPeriod = periodType === 'custom';

  // Synchronize form values when period type changes
  useEffect(() => {
    form.setFieldValue(
      'retentionPeriodValue',
      isCustomPeriod && customRetentionPeriod
        ? customRetentionPeriod.size
        : defaultRetentionPeriod.size
    );
    form.setFieldValue(
      'retentionPeriodUnit',
      isCustomPeriod && customRetentionPeriod
        ? customRetentionPeriod.unit
        : defaultRetentionPeriod.unit
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType]);

  // Clear validation errors when failureStore or periodType changes
  useEffect(() => {
    const retentionField = form.getFields().retentionPeriodValue;
    if (retentionField) {
      // Trigger validation to clear/set errors based on current state
      retentionField.validate();
    }
  }, [failureStore, periodType, form]);

  const formHasErrors = form.getErrors().length > 0;
  const disableSubmit = formHasErrors || !isDirty || form.isValid === false;

  return (
    <EuiModal
      onClose={() => onCloseModal()}
      data-test-subj="editFailureStoreModal"
      aria-labelledby={modalTitleId}
      style={{ width: 450 }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.failureStoreModal.titleText"
            defaultMessage="Edit failure store"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <Form form={form} data-test-subj="editFailureStoreForm">
          <UseField
            path="failureStore"
            component={ToggleField}
            label={
              <FormattedMessage
                id="xpack.failureStoreModal.form.failureStoreLabel"
                defaultMessage="Failure store"
              />
            }
            euiFieldProps={{
              label: i18n.translate('xpack.failureStoreModal.form.switchLabel', {
                defaultMessage: 'Store failed documents in a secondary index',
              }),
              'data-test-subj': 'enableFailureStoreToggle',
            }}
          />
          {failureStore && (
            <>
              <UseField
                path="periodType"
                component={ButtonGroupField}
                label={i18n.translate('xpack.failureStoreModal.form.failureStoreRetentionLabel', {
                  defaultMessage: 'Failure store retention',
                })}
                euiFieldProps={{
                  options: failureStorePeriodOptions,
                  'data-test-subj': 'selectFailureStorePeriodType',
                }}
              />

              <EuiFormRow>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem>
                    <UseField
                      path={'retentionPeriodValue'}
                      component={NumericField}
                      euiFieldProps={{
                        options: failureStorePeriodOptions,
                        disabled: !isCustomPeriod,
                        min: 0,
                        placeholder: defaultRetentionPeriod.size,
                        'data-test-subj': 'selectFailureStorePeriodValue',
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <UseField
                      path={'retentionPeriodUnit'}
                      component={SelectField}
                      euiFieldProps={{
                        options: timeUnits,
                        disabled: !isCustomPeriod,
                        placeholder: defaultRetentionPeriod.unit,
                        'data-test-subj': 'selectFailureStoreRetentionPeriodUnit',
                      }}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
              <EuiFormRow>
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.failureStoreModal.form.retentionPeriodInfoText"
                    defaultMessage="This retention period stores data in the hot tier for best indexing and search performance."
                  />
                </EuiText>
              </EuiFormRow>
            </>
          )}
        </Form>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="failureStoreModalCancelButton"
          onClick={() => onCloseModal()}
        >
          <FormattedMessage
            id="xpack.failureStoreModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          fill
          type="submit"
          isLoading={isSaveButtonLoading}
          data-test-subj="failureStoreModalSaveButton"
          onClick={onSubmitForm}
          disabled={disableSubmit}
        >
          <FormattedMessage id="xpack.failureStoreModal.saveButtonLabel" defaultMessage="Save" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
