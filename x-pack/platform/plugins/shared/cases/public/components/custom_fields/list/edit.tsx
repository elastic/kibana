/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import React, { useEffect, useState, useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  useForm,
  UseField,
  Form,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type {
  CaseCustomFieldList,
  ListCustomFieldConfiguration,
} from '../../../../common/types/domain';
import { CustomFieldTypes } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';
import { View } from './view';
import {
  CANCEL,
  EDIT_CUSTOM_FIELDS_ARIA_LABEL,
  NO_CUSTOM_FIELD_SET,
  SAVE,
  POPULATED_WITH_DEFAULT,
} from '../translations';
import { getListFieldConfig } from './config';
import { listCustomFieldOptionsToEuiSelectOptions } from './helpers/list_custom_field_options_to_eui_select_options';
import { ClearableSelectField } from './components/clearable_select_field';

interface FormState {
  value: string;
  isValid: boolean | undefined;
  submit: FormHook<{ value: string }>['submit'];
}

interface FormWrapper {
  initialValue: string;
  isLoading: boolean;
  customFieldConfiguration: ListCustomFieldConfiguration;
  onChange: (state: FormState) => void;
}

const FormWrapperComponent: React.FC<FormWrapper> = ({
  initialValue,
  customFieldConfiguration,
  isLoading,
  onChange,
}) => {
  const { form } = useForm<{ value: string }>({
    defaultValue: {
      value:
        customFieldConfiguration?.defaultValue != null && isEmpty(initialValue)
          ? customFieldConfiguration.defaultValue
          : initialValue,
    },
  });
  const [{ value }] = useFormData({ form });
  const { submit, isValid } = form;
  const formFieldConfig = getListFieldConfig({
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

  const selectOptions = useMemo(
    () => listCustomFieldOptionsToEuiSelectOptions(customFieldConfiguration.options),
    [customFieldConfiguration.options]
  );

  return (
    <Form form={form}>
      <UseField
        path="value"
        config={formFieldConfig}
        component={ClearableSelectField}
        helpText={populatedWithDefault && POPULATED_WITH_DEFAULT}
        componentProps={{
          isClearable: !customFieldConfiguration.required,
          euiFieldProps: {
            fullWidth: true,
            disabled: isLoading,
            isLoading,
            'data-test-subj': `case-list-custom-field-form-field-${customFieldConfiguration.key}`,
            options: selectOptions,
          },
        }}
      />
    </Form>
  );
};

FormWrapperComponent.displayName = 'FormWrapper';

const EditComponent: CustomFieldType<CaseCustomFieldList, ListCustomFieldConfiguration>['Edit'] = ({
  customField,
  customFieldConfiguration,
  onSubmit,
  isLoading,
  canUpdate,
}) => {
  const selectedKey = customField?.value ? Object.keys(customField.value)[0] : null;
  const selectedOptionExists = customFieldConfiguration.options.find(
    (option) => option.key === selectedKey
  );
  const initialValue = selectedOptionExists ? selectedKey ?? '' : '';

  const [isEdit, setIsEdit] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    isValid: undefined,
    submit: async () => ({ isValid: false, data: { value: '' } }),
    value: initialValue,
  });

  // When updating the field, store the selected value while waiting for the response
  // Display the selected value in the view component while waiting, and only switch it back to the
  // previous value if the response fails
  const [optimisticDisplayField, setOptimisticDisplayField] = useState<CaseCustomFieldList | null>(
    null
  );
  const displayCustomField = useMemo(
    () => (!isLoading || !optimisticDisplayField ? customField : optimisticDisplayField),
    [isLoading, customField, optimisticDisplayField]
  );

  const onEdit = () => {
    setIsEdit(true);
  };

  const onCancel = () => {
    setIsEdit(false);
  };

  const onSubmitCustomField = async () => {
    const { isValid, data } = await formState.submit();

    if (isValid) {
      const keyToSubmit = isEmpty(data.value) ? null : data.value;
      const value =
        keyToSubmit === null
          ? null
          : {
              [keyToSubmit]:
                customFieldConfiguration.options.find((option) => option.key === keyToSubmit)
                  ?.label ?? '',
            };
      const fieldToSubmit: CaseCustomFieldList = {
        ...customField,
        key: customField?.key ?? customFieldConfiguration.key,
        type: CustomFieldTypes.LIST,
        value,
      };
      setOptimisticDisplayField(fieldToSubmit);
      onSubmit(fieldToSubmit);
    }

    setIsEdit(false);
  };

  const title = customFieldConfiguration.label;

  const isListFieldValid =
    formState.isValid ||
    (formState.value === customFieldConfiguration.defaultValue && !initialValue);
  const isCustomFieldValueDefined = !isEmpty(customField?.value) && selectedOptionExists;

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
            data-test-subj={`case-list-custom-field-loading-${customFieldConfiguration.key}`}
          />
        )}
        {!isLoading && canUpdate && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj={`case-list-custom-field-edit-button-${customFieldConfiguration.key}`}
              aria-label={EDIT_CUSTOM_FIELDS_ARIA_LABEL(title)}
              iconType={'pencil'}
              onClick={onEdit}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      <EuiFlexGroup
        gutterSize="m"
        data-test-subj={`case-list-custom-field-${customFieldConfiguration.key}`}
        direction="column"
      >
        {!isCustomFieldValueDefined && !isEdit && (
          <p data-test-subj="no-custom-field-value">{NO_CUSTOM_FIELD_SET}</p>
        )}
        {!isEdit && isCustomFieldValueDefined && (
          <EuiFlexItem>
            <View customField={displayCustomField} configuration={customFieldConfiguration} />
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
                    color="success"
                    data-test-subj={`case-list-custom-field-submit-button-${customFieldConfiguration.key}`}
                    fill
                    iconType="save"
                    onClick={onSubmitCustomField}
                    size="s"
                    disabled={!isListFieldValid || isLoading}
                  >
                    {SAVE}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj={`case-list-custom-field-cancel-button-${customFieldConfiguration.key}`}
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

EditComponent.displayName = 'Edit';

export const Edit = React.memo(EditComponent);
