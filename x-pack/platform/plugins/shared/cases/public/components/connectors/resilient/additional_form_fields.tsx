/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';
import { EuiComboBox, EuiFormRow, type EuiComboBoxOptionOption } from '@elastic/eui';
import {
  type FieldHook,
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
  const fieldComboOptions: EuiComboBoxOptionOption<string>[] = useMemo(() => {
    return (
      fieldsData?.data?.map((field) => ({
        label: field.text,
        value: field.name,
      })) ?? []
    );
  }, [fieldsData?.data]);

  const [additionalFields, setAdditionalFields] = React.useState<EuiComboBoxOptionOption<string>[]>(
    []
  );

  const { form } = useForm<Record<string, unknown>>({
    defaultValue: { fields: {} },
    options: { stripEmptyFields: false, valueChangeDebounceTime: 500 },

    // todo
    // - Allow dates to be set as strings but then be sent to the resilient API as numbers
    // serializer: getConnectorsFormSerializer,
    // deserializer: getConnectorsFormDeserializer,
  });

  const [{ fields }] = useFormData<Record<string, unknown>>({
    form,
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      superFormField.setValue(JSON.stringify(fields ?? {}));
    }, 500);
    return () => clearTimeout(timeout);
  }, [superFormField, fields]);

  return (
    <Form form={form}>
      <EuiFormRow label={i18n.ADDITIONAL_FIELDS_LABEL} helpText={i18n.ADDITIONAL_FIELDS_HELP_TEXT}>
        <EuiComboBox
          data-test-subj="incidentTypeComboBox"
          fullWidth
          isClearable={true}
          isDisabled={isLoadingFields}
          isLoading={isFetchingFields || isLoadingFields}
          onChange={setAdditionalFields}
          options={fieldComboOptions}
          placeholder={i18n.ADDITIONAL_FIELDS_PLACEHOLDER}
          selectedOptions={additionalFields}
        />
      </EuiFormRow>

      <div>
        {additionalFields.map((field) => {
          const fieldMetaData = fieldsData?.data?.find((f) => f.name === field.value);
          if (!fieldMetaData) {
            return null;
          }
          return <AdditionalFormField key={fieldMetaData.name} field={fieldMetaData} />;
        })}
      </div>
    </Form>
  );
});

AdditionalFormFields.displayName = 'AdditionalFormFields';
