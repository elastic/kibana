/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
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
import { View } from './view';
import {
  CANCEL,
  EDIT_CUSTOM_FIELDS_ARIA_LABEL,
  NO_CUSTOM_FIELD_SET,
  SAVE,
  POPULATED_WITH_DEFAULT,
} from '../translations';
import { getTextFieldConfig } from './config';
import { InlineFieldActions } from '../../templates_v2/field_types/controls/inline_field_actions';
import { OptionalFieldLabel } from '../../optional_field_label';

interface FormState {
  value: string;
  isValid: boolean | undefined;
  submit: FormHook<{ value: string }>['submit'];
}

interface FormWrapper {
  initialValue: string;
  isLoading: boolean;
  canUpdate?: boolean;
  showFormLabel?: boolean;
  customFieldConfiguration: CasesConfigurationUICustomField;
  onChange: (state: FormState) => void;
}

const FormWrapperComponent: React.FC<FormWrapper> = ({
  initialValue,
  customFieldConfiguration,
  isLoading,
  canUpdate = true,
  showFormLabel = false,
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
        label={showFormLabel ? customFieldConfiguration.label : undefined}
        helpText={populatedWithDefault && POPULATED_WITH_DEFAULT}
        componentProps={{
          labelAppend: showFormLabel ? (
            !customFieldConfiguration.required || isLoading ? (
              <>
                {!customFieldConfiguration.required ? OptionalFieldLabel : null}
                {isLoading ? (
                  <EuiLoadingSpinner
                    data-test-subj={`case-text-custom-field-loading-${customFieldConfiguration.key}`}
                  />
                ) : null}
              </>
            ) : undefined
          ) : undefined,
          euiFieldProps: {
            fullWidth: true,
            disabled: isLoading || (showFormLabel && !canUpdate),
            isLoading,
            'data-test-subj': `case-text-custom-field-form-field-${customFieldConfiguration.key}`,
          },
        }}
      />
    </Form>
  );
};

FormWrapperComponent.displayName = 'FormWrapper';

const ClassicEdit: CustomFieldType<CaseCustomFieldText>['Edit'] = ({
  customField,
  customFieldConfiguration,
  onSubmit,
  isLoading,
  canUpdate,
}) => {
  const initialValue = customField?.value ?? '';
  const [isEdit, setIsEdit] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    isValid: undefined,
    submit: async () => ({ isValid: false, data: { value: '' } }),
    value: initialValue,
  });

  const onEdit = () => {
    setIsEdit(true);
  };

  const onCancel = () => {
    setIsEdit(false);
  };

  const onSubmitCustomField = async () => {
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

    setIsEdit(false);
  };

  const title = customFieldConfiguration.label;
  const isTextFieldValid =
    formState.isValid ||
    (formState.value === customFieldConfiguration.defaultValue && !initialValue);
  const isCustomFieldValueDefined = !isEmpty(customField?.value);

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="none"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiText>
            <h4>{title}</h4>
          </EuiText>
        </EuiFlexItem>
        {isLoading && (
          <EuiLoadingSpinner
            data-test-subj={`case-text-custom-field-loading-${customFieldConfiguration.key}`}
          />
        )}
        {!isLoading && canUpdate && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={EDIT_CUSTOM_FIELDS_ARIA_LABEL(title)} disableScreenReaderOutput>
              <EuiButtonIcon
                data-test-subj={`case-text-custom-field-edit-button-${customFieldConfiguration.key}`}
                aria-label={EDIT_CUSTOM_FIELDS_ARIA_LABEL(title)}
                iconType={'pencil'}
                onClick={onEdit}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      <EuiFlexGroup
        gutterSize="m"
        data-test-subj={`case-text-custom-field-${customFieldConfiguration.key}`}
        direction="column"
      >
        {!isCustomFieldValueDefined && !isEdit && (
          <p data-test-subj="no-custom-field-value">{NO_CUSTOM_FIELD_SET}</p>
        )}
        {!isEdit && isCustomFieldValueDefined && (
          <EuiFlexItem>
            <View customField={customField} />
          </EuiFlexItem>
        )}
        {isEdit && canUpdate && (
          <EuiFlexGroup gutterSize="m" direction="column">
            <EuiFlexItem>
              <FormWrapperComponent
                initialValue={initialValue}
                isLoading={isLoading}
                onChange={setFormState}
                customFieldConfiguration={customFieldConfiguration}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="primary"
                    data-test-subj={`case-text-custom-field-submit-button-${customFieldConfiguration.key}`}
                    fill
                    iconType="save"
                    onClick={onSubmitCustomField}
                    size="s"
                    disabled={!isTextFieldValid || isLoading}
                  >
                    {SAVE}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj={`case-text-custom-field-cancel-button-${customFieldConfiguration.key}`}
                    iconType="cross"
                    onClick={onCancel}
                    size="s"
                  >
                    {CANCEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexGroup>
    </>
  );
};

ClassicEdit.displayName = 'ClassicEdit';

const InlineEdit: CustomFieldType<CaseCustomFieldText>['Edit'] = ({
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
      gutterSize="xs"
      data-test-subj={`case-text-custom-field-${customFieldConfiguration.key}`}
      direction="column"
    >
      <EuiFlexItem>
        <FormWrapperComponent
          key={formResetKey}
          initialValue={initialValue}
          isLoading={isLoading}
          canUpdate={canUpdate}
          showFormLabel
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

InlineEdit.displayName = 'InlineEdit';

const EditComponent: CustomFieldType<CaseCustomFieldText>['Edit'] = ({
  editVariant = 'classic',
  ...props
}) => {
  if (editVariant === 'inline') {
    return <InlineEdit {...props} />;
  }

  return <ClassicEdit {...props} />;
};

EditComponent.displayName = 'Edit';

export const Edit = React.memo(EditComponent);
