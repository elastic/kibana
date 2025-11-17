/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import { isObject } from 'lodash';
import { EuiComboBox, EuiFormRow, EuiSpacer, type EuiComboBoxOptionOption } from '@elastic/eui';
import {
  type FieldHook,
  getFieldValidityAndErrorMessage,
  Form,
  useForm,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useKibana } from '../../../common/lib/kibana';
import { AdditionalFormField } from './additional_form_field';
import type { ConnectorFieldsProps } from '../types';
import { useGetFields } from './use_get_fields';
import * as i18n from './translations';

export const AdditionalFormFields = React.memo<{
  field: FieldHook<string, string>;
  connector: ConnectorFieldsProps['connector'];
}>(({ connector, field: additionalFieldsFormField }) => {
  const { http } = useKibana().services;
  const {
    isLoading: isLoadingFields,
    isFetching: isFetchingFields,
    data: fieldsData,
  } = useGetFields({
    http,
    connector,
  });

  const [additionalFields, setAdditionalFields] = React.useState<EuiComboBoxOptionOption<string>[]>(
    () => {
      const parsed = additionalFieldsFormField.value
        ? JSON.parse(additionalFieldsFormField.value)
        : {};
      return Object.keys(parsed).map((key) => ({
        label: fieldsData?.data?.fieldsObj[key]?.text ?? key,
        value: key,
      }));
    }
  );

  const onRemoveField = useCallback((fieldName: string) => {
    setAdditionalFields((fields) => {
      return fields.filter((field) => field.value !== fieldName);
    });
  }, []);

  const defaultAdditionalFields = useMemo(() => {
    return additionalFieldsFormField.value ? JSON.parse(additionalFieldsFormField.value) : {};
  }, [additionalFieldsFormField.value]);

  const { form } = useForm<Record<string, unknown>>({
    defaultValue: defaultAdditionalFields,
    options: { stripUnsetFields: false, stripEmptyFields: false, valueChangeDebounceTime: 500 },
  });

  const [fields] = useFormData<Record<string, unknown>>({
    form,
  });

  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(additionalFieldsFormField);

  useEffect(() => {
    const fieldsMetadataRecord = fieldsData?.data?.fieldsObj || {};
    const transformedFields = additionalFields.reduce((acc, field) => {
      const key = field.value;
      const value = fields[key || ''];
      if (key === undefined) {
        return acc;
      }
      // Dates need to be sent to the resilient API as numbers
      if (
        isObject(value) &&
        'toDate' in value &&
        typeof value.toDate === 'function' &&
        (fieldsMetadataRecord[key].input_type === 'datetimepicker' ||
          fieldsMetadataRecord[key].input_type === 'datepicker')
      ) {
        // DatePickerFields return Moment objects but resilient expects numbers
        acc[key] = value.toDate().getTime();
      } else if (typeof value === 'string' && fieldsMetadataRecord[key].input_type === 'select') {
        // SelectFields return strings but resilient expects numbers
        acc[key] = Number(value);
      } else if (Array.isArray(value) && fieldsMetadataRecord[key].input_type === 'multiselect') {
        // MultiSelectFields return string[] but resilient expects number[]
        acc[key] = value.map((v) => Number(v));
      } else if (typeof value === 'string' && fieldsMetadataRecord[key].input_type === 'number') {
        acc[key] = Number(value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);
    const newValue = JSON.stringify(transformedFields);
    if (newValue !== additionalFieldsFormField.value) {
      if (newValue === '{}') {
        additionalFieldsFormField.setValue('');
      } else {
        additionalFieldsFormField.setValue(newValue);
      }
    }
  }, [additionalFields, additionalFieldsFormField, fields, fieldsData]);

  return (
    <Form form={form}>
      <div>
        {additionalFields.map((field) => {
          const fieldMetaData = fieldsData?.data?.fieldsObj[field.value || ''];
          if (!fieldMetaData) {
            return null;
          }
          return (
            <React.Fragment key={fieldMetaData.name}>
              <EuiSpacer size="m" />
              <AdditionalFormField field={fieldMetaData} onRemoveField={onRemoveField} />
            </React.Fragment>
          );
        })}
      </div>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.ADDITIONAL_FIELDS_LABEL}
        helpText={i18n.ADDITIONAL_FIELDS_HELP_TEXT}
        isInvalid={isInvalid}
        error={errorMessage}
      >
        <EuiComboBox
          data-test-subj="resilientAdditionalFieldsComboBox"
          fullWidth
          isClearable={true}
          isDisabled={isLoadingFields}
          isLoading={isFetchingFields || isLoadingFields}
          onChange={setAdditionalFields}
          options={(fieldsData?.data?.fields as EuiComboBoxOptionOption<string>[]) || []}
          placeholder={i18n.ADDITIONAL_FIELDS_PLACEHOLDER}
          isInvalid={isInvalid}
          selectedOptions={additionalFields}
        />
      </EuiFormRow>
    </Form>
  );
});

AdditionalFormFields.displayName = 'AdditionalFormFields';
