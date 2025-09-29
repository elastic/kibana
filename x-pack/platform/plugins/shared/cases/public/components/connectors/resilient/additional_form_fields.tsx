/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';
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
import type { ResilientFieldMetadata } from './types';

export const AdditionalFormFields = React.memo<{
  field: FieldHook<string, string>;
  connector: ConnectorFieldsProps['connector'];
}>(({ connector, field: superFormField }) => {
  const { http } = useKibana().services;
  const {
    isLoading: isLoadingFields,
    isFetching: isFetchingFields,
    data: fieldsData,
  } = useGetFields({
    http,
    connector,
  });
  const fieldsMetadataRecord = useMemo(() => {
    return (fieldsData?.data ?? []).reduce((acc, field) => {
      acc[field.name] = field;
      return acc;
    }, {} as Record<string, ResilientFieldMetadata>);
  }, [fieldsData]);

  const fieldComboOptions: EuiComboBoxOptionOption<string>[] = useMemo(() => {
    return (
      fieldsData?.data?.map((field) => ({
        label: field.text,
        value: field.name,
      })) ?? []
    );
  }, [fieldsData?.data]);

  // todo: make this a memo of the superFormField value
  const [additionalFields, setAdditionalFields] = React.useState<EuiComboBoxOptionOption<string>[]>(
    () => {
      const a = superFormField.value ? JSON.parse(superFormField.value) : {};
      return Object.keys(a).map((key) => ({
        label: fieldsMetadataRecord[key]?.text ?? key,
        value: key,
      }));
    }
  );

  const { form } = useForm<Record<string, unknown>>({
    // todo: make this use a memo of the superFormField value instead of parsing each time
    defaultValue: superFormField.value ? JSON.parse(superFormField.value) : {},
    options: { stripUnsetFields: false, stripEmptyFields: false, valueChangeDebounceTime: 500 },
  });

  const [fields] = useFormData<Record<string, unknown>>({
    form,
  });

  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(superFormField);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const transformedFields = Object.entries(fields ?? {}).reduce((acc, [key, value]) => {
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

      superFormField.setValue(JSON.stringify(transformedFields));
    }, 500);
    return () => clearTimeout(timeout);
  }, [superFormField, fields, fieldsMetadataRecord]);

  return (
    <Form form={form}>
      <EuiFormRow
        label={i18n.ADDITIONAL_FIELDS_LABEL}
        helpText={i18n.ADDITIONAL_FIELDS_HELP_TEXT}
        isInvalid={isInvalid}
        error={errorMessage}
      >
        <EuiComboBox
          data-test-subj="incidentTypeComboBox"
          fullWidth
          isClearable={true}
          isDisabled={isLoadingFields}
          isLoading={isFetchingFields || isLoadingFields}
          onChange={setAdditionalFields}
          options={fieldComboOptions}
          placeholder={i18n.ADDITIONAL_FIELDS_PLACEHOLDER}
          isInvalid={isInvalid}
          selectedOptions={additionalFields}
        />
      </EuiFormRow>

      <div>
        {additionalFields.map((field) => {
          const fieldMetaData = fieldsMetadataRecord[field.value || ''];
          if (!fieldMetaData) {
            return null;
          }
          return (
            <>
              <EuiSpacer size="m" />
              <AdditionalFormField key={fieldMetaData.name} field={fieldMetaData} />
            </>
          );
        })}
      </div>
    </Form>
  );
});

AdditionalFormFields.displayName = 'AdditionalFormFields';
