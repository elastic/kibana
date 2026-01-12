/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect, useRef, useState } from 'react';
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
import { getFailureStorePeriodOptions } from '../constants';
import { splitSizeAndUnits } from '../utils';
import { RetentionPeriodField } from '../retention_period_field/retention_period_field';
import { editFailureStoreFormSchema } from './schema';

const PERIOD_TYPE = {
  CUSTOM: 'custom',
  DEFAULT: 'default',
  DISABLED_LIFECYCLE: 'disabledLifecycle',
} as const;

export interface FailureStoreFormProps {
  failureStoreEnabled: boolean;
  defaultRetentionPeriod?: string;
  customRetentionPeriod?: string;
  retentionDisabled?: boolean;
}

export type FailureStoreFormData = { failureStoreEnabled: boolean } & (
  | { inherit: boolean }
  | { customRetentionPeriod?: string }
  | { retentionDisabled?: boolean }
);

interface Props {
  onCloseModal: () => void;
  onSaveModal: (data: FailureStoreFormData) => Promise<void> | void;
  failureStoreProps: FailureStoreFormProps;
  inheritOptions?: {
    canShowInherit: boolean;
    isWired: boolean;
    isCurrentlyInherited: boolean;
  };
  showIlmDescription?: boolean;
  canShowDisableLifecycle?: boolean;
  disableButtonLabel?: string;
}

export const FailureStoreModal: FunctionComponent<Props> = ({
  onCloseModal,
  onSaveModal,
  failureStoreProps,
  showIlmDescription = true,
  inheritOptions,
  canShowDisableLifecycle = false,
  disableButtonLabel,
}) => {
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);

  const onSubmitForm = async () => {
    setIsSaveInProgress(true);
    try {
      const { isValid, data } = await form.submit();

      if (!isValid) {
        return;
      }

      // If the inherit toggle is on, we need to save the inherit field.
      if (data.inherit) {
        await onSaveModal({
          inherit: data.inherit,
          failureStoreEnabled: data.failureStore,
        });
        return;
      }

      // The failure store configuration has to include the enabled state and, if the custom retention type is enabled, the retention period or disabled flag.
      const newFailureStoreConfig: FailureStoreFormData = {
        failureStoreEnabled: data.failureStore,
        ...(data.failureStore &&
          data.periodType === PERIOD_TYPE.DISABLED_LIFECYCLE && {
            retentionDisabled: true,
          }),
        ...(data.failureStore &&
          data.periodType === PERIOD_TYPE.CUSTOM && {
            customRetentionPeriod: `${data.retentionPeriodValue}${data.retentionPeriodUnit}`,
          }),
      };

      await onSaveModal(newFailureStoreConfig);
    } finally {
      setIsSaveInProgress(false);
    }
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
      periodType: failureStoreProps.retentionDisabled
        ? PERIOD_TYPE.DISABLED_LIFECYCLE
        : failureStoreProps.customRetentionPeriod
        ? PERIOD_TYPE.CUSTOM
        : PERIOD_TYPE.DEFAULT,
      retentionPeriodValue,
      retentionPeriodUnit,
      inherit: (inheritOptions?.isCurrentlyInherited && inheritOptions.canShowInherit) ?? false,
      retentionDisabled: failureStoreProps.retentionDisabled ?? false,
    },
    schema: editFailureStoreFormSchema,
    id: 'editFailureStoreForm',
  });

  const { setFieldValue, getFields } = form;

  const [{ failureStore, periodType, inherit }] = useFormData({
    form,
    watch: ['failureStore', 'periodType', 'inherit'],
  });

  const isDirty = useFormIsModified({ form });

  const isCustomPeriod = periodType === PERIOD_TYPE.CUSTOM;
  const prevPeriodTypeRef = useRef(periodType);

  const periodOptions = getFailureStorePeriodOptions(disableButtonLabel);
  const filteredPeriodOptions = canShowDisableLifecycle
    ? periodOptions
    : periodOptions.filter((option) => option.id !== PERIOD_TYPE.DISABLED_LIFECYCLE);

  // Synchronize form values when period type changes
  useEffect(() => {
    if (prevPeriodTypeRef.current !== periodType) {
      prevPeriodTypeRef.current = periodType;
      setFieldValue(
        'retentionPeriodValue',
        isCustomPeriod && customRetentionPeriod
          ? customRetentionPeriod.size
          : defaultRetentionPeriod
          ? defaultRetentionPeriod.size
          : '30'
      );
      setFieldValue(
        'retentionPeriodUnit',
        isCustomPeriod && customRetentionPeriod
          ? customRetentionPeriod.unit
          : defaultRetentionPeriod
          ? defaultRetentionPeriod.unit
          : 'd'
      );
    }
  }, [periodType, isCustomPeriod, customRetentionPeriod, defaultRetentionPeriod, setFieldValue]);

  // Clear validation errors when failureStore or periodType changes
  useEffect(() => {
    const retentionField = getFields().retentionPeriodValue;
    if (retentionField) {
      // Trigger validation to clear/set errors based on current state
      retentionField.validate();
    }
  }, [failureStore, periodType, getFields]);

  const formHasErrors = form.getErrors().length > 0;
  const disableSubmit = formHasErrors || !isDirty || form.isValid === false;

  return (
    <EuiModal
      onClose={() => onCloseModal()}
      data-test-subj="editFailureStoreModal"
      aria-labelledby={modalTitleId}
      style={{ width: inheritOptions ? 540 : 450 }}
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
          {inheritOptions && inheritOptions.canShowInherit && (
            <UseField
              path="inherit"
              component={ToggleField}
              label={
                inheritOptions.isWired
                  ? i18n.translate('xpack.failureStoreModal.wiredInheritSwitchLabel', {
                      defaultMessage: 'Inherit from parent stream',
                    })
                  : i18n.translate('xpack.failureStoreModal.classicInheritSwitchLabel', {
                      defaultMessage: 'Inherit from index template',
                    })
              }
              euiFieldProps={{
                label: inheritOptions.isWired
                  ? i18n.translate('xpack.failureStoreModal.wiredInheritSwitchDescription', {
                      defaultMessage:
                        "Use the failure retention configuration from this stream's parent",
                    })
                  : i18n.translate('xpack.failureStoreModal.classicInheritSwitchDescription', {
                      defaultMessage:
                        "Use failure retention configuration from this stream's index template",
                    }),
                'data-test-subj': 'inheritFailureStoreSwitch',
                compressed: true,
              }}
            />
          )}

          <UseField
            path="failureStore"
            component={ToggleField}
            label={
              <FormattedMessage
                id="xpack.failureStoreModal.form.failureStoreLabel"
                defaultMessage="Enable failure store"
              />
            }
            euiFieldProps={{
              label: i18n.translate('xpack.failureStoreModal.form.switchLabel', {
                defaultMessage: 'Store failed documents in a secondary index',
              }),
              'data-test-subj': 'enableFailureStoreToggle',
              compressed: true,
              disabled: inherit,
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
                  options: filteredPeriodOptions,
                  'data-test-subj': 'selectFailureStorePeriodType',
                  isDisabled: inherit,
                }}
              />

              {periodType !== PERIOD_TYPE.DISABLED_LIFECYCLE && (
                <>
                  <EuiFormRow fullWidth>
                    {isCustomPeriod || defaultRetentionPeriod ? (
                      <RetentionPeriodField disabled={!isCustomPeriod || inherit} />
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
                  {showIlmDescription && (
                    <EuiFormRow fullWidth>
                      <EuiText size="s" color="subdued">
                        <FormattedMessage
                          id="xpack.failureStoreModal.form.retentionPeriodInfoText"
                          defaultMessage="This retention period stores data in the hot tier for best indexing and search performance."
                        />
                      </EuiText>
                    </EuiFormRow>
                  )}
                </>
              )}
            </>
          )}
        </Form>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="failureStoreModalCancelButton"
          onClick={() => onCloseModal()}
          disabled={isSaveInProgress}
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
