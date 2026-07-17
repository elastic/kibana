/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  useForm,
  UseField,
  Form,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { NumericField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { CaseCustomFieldNumber } from '../../../../common/types/domain';
import { CustomFieldTypes } from '../../../../common/types/domain';
import type { CasesConfigurationUICustomField } from '../../../../common/ui';
import type { CustomFieldType } from '../types';
import { POPULATED_WITH_DEFAULT } from '../translations';
import { getNumberFieldConfig } from './config';
import { InlineFieldActions } from '../../templates_v2/field_types/controls/inline_field_actions';
import { OptionalFieldLabel } from '../../optional_field_label';

const isEmpty = (value: number | null | undefined) => {
  return value == null;
};

interface FormState {
  value: number | null;
  isValid?: boolean;
  submit: FormHook<{ value: number | null }>['submit'];
}

interface FormWrapper {
  initialValue: number | null;
  isLoading: boolean;
  canUpdate: boolean;
  customFieldConfiguration: CasesConfigurationUICustomField;
  onChange: (state: FormState) => void;
}

const FormWrapperComponent: React.FC<FormWrapper> = ({
  initialValue,
  customFieldConfiguration,
  isLoading,
  canUpdate,
  onChange,
}) => {
  const defaultValue =
    customFieldConfiguration?.defaultValue != null && isEmpty(initialValue)
      ? Number(customFieldConfiguration.defaultValue)
      : initialValue;

  const { form } = useForm<{ value: number | null }>({
    defaultValue: {
      value: defaultValue,
    },
  });

  const [{ value }] = useFormData({ form });
  const { submit, isValid } = form;
  const formFieldConfig = getNumberFieldConfig({
    required: customFieldConfiguration.required,
    label: customFieldConfiguration.label,
  });
  const populatedWithDefault =
    value === customFieldConfiguration?.defaultValue && isEmpty(initialValue);

  useEffect(() => {
    onChange({
      value,
      isValid,
      submit,
    });
  }, [isValid, onChange, submit, value]);

  return (
    <Form form={form}>
      <UseField
        path="value"
        config={formFieldConfig}
        component={NumericField}
        label={customFieldConfiguration.label}
        helpText={populatedWithDefault && POPULATED_WITH_DEFAULT}
        componentProps={{
          labelAppend:
            !customFieldConfiguration.required || isLoading ? (
              <>
                {!customFieldConfiguration.required ? OptionalFieldLabel : null}
                {isLoading ? (
                  <EuiLoadingSpinner
                    data-test-subj={`case-number-custom-field-loading-${customFieldConfiguration.key}`}
                  />
                ) : null}
              </>
            ) : undefined,
          euiFieldProps: {
            fullWidth: true,
            disabled: isLoading || !canUpdate,
            isLoading,
            'data-test-subj': `case-number-custom-field-form-field-${customFieldConfiguration.key}`,
          },
        }}
      />
    </Form>
  );
};

FormWrapperComponent.displayName = 'FormWrapper';

const EditComponent: CustomFieldType<CaseCustomFieldNumber>['Edit'] = ({
  customField,
  customFieldConfiguration,
  onSubmit,
  isLoading,
  canUpdate,
}) => {
  const initialValue = customField?.value ?? null;
  const defaultValueAsNumber =
    customFieldConfiguration.defaultValue != null
      ? Number(customFieldConfiguration.defaultValue)
      : undefined;
  const effectiveInitialValue =
    isEmpty(initialValue) && defaultValueAsNumber != null ? defaultValueAsNumber : initialValue;
  const [formResetKey, setFormResetKey] = useState(0);
  const [formState, setFormState] = useState<FormState>({
    isValid: undefined,
    submit: async () => ({ isValid: false, data: { value: null } }),
    value: effectiveInitialValue,
  });

  const onCancel = useCallback(() => {
    setFormResetKey((key) => key + 1);
  }, []);

  const onSubmitCustomField = useCallback(async () => {
    const { isValid, data } = await formState.submit();

    if (isValid) {
      onSubmit({
        ...customField,
        key: customField?.key ?? customFieldConfiguration.key,
        type: CustomFieldTypes.NUMBER,
        value: data.value ? Number(data.value) : null,
      });
    }
  }, [customField, customFieldConfiguration.key, formState, onSubmit]);

  const normalizeNumber = (value: number | null | undefined) => {
    if (value == null || (value as unknown) === '') {
      return null;
    }
    return Number(value);
  };
  const hasPendingChange =
    normalizeNumber(formState.value) !== normalizeNumber(effectiveInitialValue);

  const isNumberFieldValid =
    formState.isValid ||
    (formState.value === customFieldConfiguration.defaultValue && isEmpty(initialValue));

  return (
    <EuiFlexGroup
      gutterSize="m"
      data-test-subj={`case-number-custom-field-${customFieldConfiguration.key}`}
      direction="column"
    >
      <EuiFlexItem>
        <FormWrapperComponent
          key={formResetKey}
          initialValue={initialValue}
          isLoading={isLoading}
          canUpdate={canUpdate}
          onChange={setFormState}
          customFieldConfiguration={customFieldConfiguration}
        />
      </EuiFlexItem>
      {hasPendingChange && canUpdate && !isLoading && (
        <InlineFieldActions
          name={customFieldConfiguration.key}
          onConfirm={onSubmitCustomField}
          onCancel={onCancel}
          isLoading={isLoading}
          isDisabled={!isNumberFieldValid}
        />
      )}
    </EuiFlexGroup>
  );
};

EditComponent.displayName = 'Edit';

export const Edit = React.memo(EditComponent);
