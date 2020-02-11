/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useCallback } from 'react';
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
import { MapOptionsToSubOptions } from './analyzer_parameter';

type Options = SuperSelectOption[] | SelectOption[];

const areOptionsSuperSelect = (options: Options): boolean => {
  if (!options || !Boolean(options.length)) {
    return false;
  }
  // `Select` options have a "text" property, `SuperSelect` options don't have it.
  return {}.hasOwnProperty.call(options[0], 'text') === false;
};

interface Props {
  onChange(value: unknown): void;
  mainDefaultValue: string | undefined;
  subDefaultValue: string | undefined;
  config: FieldConfig;
  options: Options;
  mapOptionsToSubOptions: MapOptionsToSubOptions;
}

export const AnalyzerParameterSelects = ({
  onChange,
  mainDefaultValue,
  subDefaultValue,
  config,
  options,
  mapOptionsToSubOptions,
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

  const getSubOptionsMeta = (mainValue: string) =>
    mapOptionsToSubOptions !== undefined ? mapOptionsToSubOptions[mainValue] : undefined;

  const onMainValueChange = useCallback((mainValue: unknown) => {
    const subOptionsMeta = getSubOptionsMeta(mainValue as string);
    form.setFieldValue('sub', subOptionsMeta ? subOptionsMeta.options[0].value : undefined);
  }, []);

  const renderSelect = (field: FieldHook, opts: Options) => {
    const isSuperSelect = areOptionsSuperSelect(opts);

    return isSuperSelect ? (
      <SuperSelectField field={field} euiFieldProps={{ options: opts }} />
    ) : (
      <SelectField
        field={field}
        euiFieldProps={{ options: opts as any, hasNoInitialSelection: false }}
      />
    );
  };

  return (
    <Form form={form}>
      <FormDataProvider pathsToWatch="main">
        {({ main }) => {
          const subOptions = getSubOptionsMeta(main);

          return (
            <EuiFlexGroup>
              <EuiFlexItem>
                <UseField path="main" config={config} onChange={onMainValueChange}>
                  {field => renderSelect(field, options)}
                </UseField>
              </EuiFlexItem>
              {subOptions && (
                <EuiFlexItem>
                  <UseField
                    path="sub"
                    defaultValue={subOptions.options[0].value}
                    config={{
                      ...config,
                      label: subOptions.label,
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
