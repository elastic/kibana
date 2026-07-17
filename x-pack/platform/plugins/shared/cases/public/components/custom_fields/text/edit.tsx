/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  useForm,
  UseField,
  Form,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { CaseCustomFieldText } from '../../../../common/types/domain';
import { CustomFieldTypes } from '../../../../common/types/domain';
import type { CasesConfigurationUICustomField } from '../../../../common/ui';
import type { CustomFieldType } from '../types';
import { POPULATED_WITH_DEFAULT } from '../translations';
import { getTextFieldConfig } from './config';
import { InlineFieldActions } from '../../templates_v2/field_types/controls/inline_field_actions';

interface FormState {
  value: string;
  isValid: boolean | undefined;
  submit: FormHook<{ value: string }>['submit'];
}

interface FormWrapper {
  initialValue: string;
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
      ? String(customFieldConfiguration.defaultValue)
      : initialValue;

  const { form } = useForm<{ value: string }>({
    defaultValue: {
      value: defaultValue,
    },
  });
  const [{ value }] = useFormData({ form });
  const { submit, isValid } = form;
  const formFieldConfig = getTextFieldConfig({
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
        component={TextField}
        label={customFieldConfiguration.label}
        helpText={populatedWithDefault && POPULATED_WITH_DEFAULT}
        componentProps={{
          labelAppend: isLoading ? (
            <EuiLoadingSpinner
              data-test-subj={`case-text-custom-field-loading-${customFieldConfiguration.key}`}
            />
          ) : undefined,
          euiFieldProps: {
            fullWidth: true,
            disabled: isLoading || !canUpdate,
            isLoading,
            'data-test-subj': `case-text-custom-field-form-field-${customFieldConfiguration.key}`,
          },
        }}
      />
    </Form>
  );
};

FormWrapperComponent.displayName = 'FormWrapper';

const EditComponent: CustomFieldType<CaseCustomFieldText>['Edit'] = ({
  customField,
  customFieldConfiguration,
  onSubmit,
  isLoading,
  canUpdate,
}) => {
  const initialValue = customField?.value ?? '';
  const defaultValueAsString =
    customFieldConfiguration.defaultValue != null
      ? String(customFieldConfiguration.defaultValue)
      : undefined;
  const effectiveInitialValue =
    isEmpty(initialValue) && defaultValueAsString != null ? defaultValueAsString : initialValue;
  const [formResetKey, setFormResetKey] = useState(0);
  const [formState, setFormState] = useState<FormState>({
    isValid: undefined,
    submit: async () => ({ isValid: false, data: { value: '' } }),
    value: effectiveInitialValue,
  });

  const onCancel = useCallback(() => {
    setFormResetKey((key) => key + 1);
  }, []);

  const onSubmitCustomField = useCallback(async () => {
    const { isValid, data } = await formState.submit();

    if (isValid) {
      const value = isEmpty(data.value) ? null : data.value;

      onSubmit({
        ...customField,
        key: customField?.key ?? customFieldConfiguration.key,
        type: CustomFieldTypes.TEXT,
        value,
      });
    }
  }, [customField, customFieldConfiguration.key, formState, onSubmit]);

  const hasPendingChange = formState.value !== effectiveInitialValue;
  const isTextFieldValid =
    formState.isValid ||
    (formState.value === customFieldConfiguration.defaultValue && !initialValue);

  return (
    <EuiFlexGroup
      gutterSize="m"
      data-test-subj={`case-text-custom-field-${customFieldConfiguration.key}`}
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
          isDisabled={!isTextFieldValid}
        />
      )}
    </EuiFlexGroup>
  );
};

EditComponent.displayName = 'Edit';

export const Edit = React.memo(EditComponent);
