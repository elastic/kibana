/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';
import {
  EuiComboBox,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
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
import { formFieldToResilientFieldValue } from './utils';

export const AdditionalFormFields = React.memo<{
  field: FieldHook<string, string>;
  connector: ConnectorFieldsProps['connector'];
  isInSidebarForm: boolean;
}>(({ connector, field: additionalFieldsFormField, isInSidebarForm }) => {
  const { http } = useKibana().services;
  const {
    isLoading: isLoadingFields,
    isFetching: isFetchingFields,
    data: fieldsData,
  } = useGetFields({
    http,
    connector,
  });

  // We need to filter out read-only fields and the ones that have dedicated form entries
  const options = useMemo<EuiComboBoxOptionOption<string>[]>(() => {
    const fields = fieldsData?.data?.fields || [];
    return fields.reduce<EuiComboBoxOptionOption<string>[]>((acc, field) => {
      if (
        field.read_only !== true &&
        field.name !== 'incident_type_ids' &&
        field.name !== 'severity_code'
      ) {
        acc.push({
          label: field.text,
          value: field.name,
        });
      }
      return acc;
    }, []);
  }, [fieldsData]);

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
      const fieldMetaData = fieldsMetadataRecord[key];
      if (!fieldMetaData) {
        return acc;
      }
      acc[key] = formFieldToResilientFieldValue(value, fieldMetaData);
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
      <EuiFormRow
        label={i18n.ADDITIONAL_FIELDS_LABEL}
        helpText={i18n.ADDITIONAL_FIELDS_HELP_TEXT}
        isInvalid={isInvalid}
        error={errorMessage}
        fullWidth
      >
        <EuiComboBox
          data-test-subj="resilientAdditionalFieldsComboBox"
          fullWidth
          isClearable={true}
          isDisabled={isLoadingFields}
          isLoading={isFetchingFields || isLoadingFields}
          onChange={setAdditionalFields}
          options={options}
          placeholder={i18n.ADDITIONAL_FIELDS_PLACEHOLDER}
          isInvalid={isInvalid}
          selectedOptions={additionalFields}
        />
      </EuiFormRow>
      {additionalFields.length > 0 ? <EuiSpacer size="m" /> : null}
      <EuiFlexGrid columns={isInSidebarForm ? 1 : 3}>
        {additionalFields.map((field) => {
          const fieldMetaData = fieldsData?.data?.fieldsObj[field.value || ''];
          if (!fieldMetaData) {
            return null;
          }
          return (
            <EuiFlexItem key={fieldMetaData.name}>
              <AdditionalFormField field={fieldMetaData} />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
    </Form>
  );
});

AdditionalFormFields.displayName = 'AdditionalFormFields';
