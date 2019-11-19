/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import {
  useForm,
  Form,
  UseField,
  SelectField,
  SuperSelectField,
  FieldConfig,
  FieldHook,
  FormDataProvider,
} from '../../../shared_imports';
import { SelectOption, SuperSelectOption } from '../../../types';
import { PARAMETERS_OPTIONS } from '../../../constants';

const areOptionsSuperSelect = (options: SuperSelectOption[] | SelectOption[]): boolean => {
  if (!options || !Boolean(options.length)) {
    return false;
  }
  // `Select` options have a "text" property, `SuperSelect` options don't have it.
  return {}.hasOwnProperty.call(options[0], 'text') === false;
};

const fieldOptions = PARAMETERS_OPTIONS.analyzer!;

export const mapOptionsToSubOptions: {
  [key: string]: { label: string; options: SuperSelectOption[] | SelectOption[] };
} = {
  language: {
    label: 'Language',
    options: PARAMETERS_OPTIONS.languageAnalyzer!,
  },
};

interface Props {
  onChange(value: unknown): void;
  mainDefaultValue: string | undefined;
  subDefaultValue: string | undefined;
  config: FieldConfig;
}

export const AnalyzerParameterSelects = ({
  onChange,
  mainDefaultValue,
  subDefaultValue,
  config,
}: Props) => {
  const { form } = useForm({ defaultValue: { main: mainDefaultValue, sub: subDefaultValue } });

  useEffect(() => {
    const subscription = form.subscribe(updateData => {
      const formData = updateData.data.raw;
      const value = formData.sub ? formData.sub : formData.main;
      onChange(value);
    });

    return subscription.unsubscribe;
  }, [form]);

  const renderSelect = (field: FieldHook, options: SuperSelectOption[] | SelectOption[]) => {
    const isSuperSelect = areOptionsSuperSelect(options);

    return isSuperSelect ? (
      <SuperSelectField field={field} euiFieldProps={{ options }} />
    ) : (
      <SelectField
        field={field}
        euiFieldProps={{ options: options as any, hasNoInitialSelection: false }}
      />
    );
  };

  return (
    <Form form={form}>
      <FormDataProvider pathsToWatch="main">
        {({ main }) => {
          const subOptions =
            mapOptionsToSubOptions !== undefined ? mapOptionsToSubOptions[main] : undefined;

          return (
            <EuiFlexGroup>
              <EuiFlexItem>
                <UseField path="main" config={config}>
                  {field => renderSelect(field, fieldOptions)}
                </UseField>
              </EuiFlexItem>
              {subOptions && (
                <EuiFlexItem>
                  <UseField
                    path="sub"
                    config={{
                      ...config,
                      label: subOptions.label,
                      defaultValue: subOptions.options[0].value,
                    }}
                  >
                    {field => renderSelect(field, subOptions.options)}
                  </UseField>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        }}
      </FormDataProvider>
    </Form>
  );
};
