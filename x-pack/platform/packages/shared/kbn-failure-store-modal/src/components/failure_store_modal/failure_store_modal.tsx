/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
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
import {
  useForm,
  Form,
  useFormIsModified,
  UseField,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ButtonGroupField, ToggleField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { failureStorePeriodOptions } from '../constants';
import { splitSizeAndUnits } from '../utils';
import { RetentionPeriodField } from '../retention_period_field/retention_period_field';
import { editFailureStoreFormSchema } from './schema';

export interface FailureStoreFormProps {
  failureStoreEnabled: boolean;
  defaultRetentionPeriod?: string;
  customRetentionPeriod?: string;
}

interface FailureStoreFormData {
  failureStoreEnabled: boolean;
  customRetentionPeriod?: string;
}

interface Props {
  onCloseModal: () => void;
  onSaveModal: (data: FailureStoreFormData) => Promise<void> | void;
  failureStoreProps: FailureStoreFormProps;
}

export const FailureStoreModal: FunctionComponent<Props> = ({
  onCloseModal,
  onSaveModal,
  failureStoreProps,
}) => {
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);
  const onSubmitForm = async () => {
    setIsSaveInProgress(true);
    const { isValid, data } = await form.submit();

    if (!isValid) {
      setIsSaveInProgress(false);
      return;
    }

    // The new failure store configuration has to include the enabled state and, if the custom retention type is enabled, the retention period.
    const newFailureStoreConfig: FailureStoreFormData = { failureStoreEnabled: data.failureStore };
    if (data.failureStore) {
      if (data.periodType === 'custom') {
        newFailureStoreConfig.customRetentionPeriod = `${data.retentionPeriodValue}${data.retentionPeriodUnit}`;
      }
    }
    await onSaveModal(newFailureStoreConfig);
    setIsSaveInProgress(false);
  };

  const modalTitleId = useGeneratedHtmlId();

  const defaultRetentionPeriod = failureStoreProps.defaultRetentionPeriod
    ? splitSizeAndUnits(failureStoreProps.defaultRetentionPeriod)
    : null;
  const customRetentionPeriod = failureStoreProps.customRetentionPeriod
    ? splitSizeAndUnits(failureStoreProps.customRetentionPeriod)
    : null;
  const retentionPeriodUnit = customRetentionPeriod
    ? customRetentionPeriod.unit
    : defaultRetentionPeriod
    ? defaultRetentionPeriod.unit
    : 'd';

  const retentionPeriodValue = customRetentionPeriod
    ? customRetentionPeriod.size
    : defaultRetentionPeriod
    ? defaultRetentionPeriod.size
    : '30';

  const { form } = useForm({
    defaultValue: {
      failureStore: failureStoreProps.failureStoreEnabled ?? false,
      periodType: failureStoreProps.customRetentionPeriod ? 'custom' : 'default',
      retentionPeriodValue,
      retentionPeriodUnit,
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
        : defaultRetentionPeriod
        ? defaultRetentionPeriod.size
        : '30'
    );
    form.setFieldValue(
      'retentionPeriodUnit',
      isCustomPeriod && customRetentionPeriod
        ? customRetentionPeriod.unit
        : defaultRetentionPeriod
        ? defaultRetentionPeriod.unit
        : 'd'
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
                {isCustomPeriod || defaultRetentionPeriod ? (
                  <RetentionPeriodField disabled={!isCustomPeriod} />
                ) : (
                  <EuiCallOut
                    announceOnMount
                    typeof="info"
                    size="m"
                    data-test-subj="defaultRetentionCallout"
                  >
                    <FormattedMessage
                      id="xpack.failureStoreModal.form.defaultRetentionAvailableText"
                      defaultMessage="This will pull the default value set at the cluster level."
                    />
                  </EuiCallOut>
                )}
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
          aria-label={i18n.translate('xpack.failureStoreModal.cancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
        >
          <FormattedMessage
            id="xpack.failureStoreModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          fill
          type="submit"
          isLoading={isSaveInProgress}
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
