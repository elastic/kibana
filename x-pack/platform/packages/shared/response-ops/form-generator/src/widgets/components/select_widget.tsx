/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { z } from '@kbn/zod/v4';
import { SelectField as FormSelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { EuiSelectProps } from '@elastic/eui';
import type { BaseWidgetProps } from '../types';

type SelectWidgetProps = BaseWidgetProps<z.ZodEnum<any>, EuiSelectProps>;

export const getOptions = (schema: z.ZodEnum): EuiSelectProps['options'] => {
  return schema.options.map((option) => {
    return {
      value: option,
      text: option,
    };
  });
};

export const SelectWidget: React.FC<SelectWidgetProps> = ({
  path,
  schema,
  fieldProps,
  fieldConfig,
  formConfig,
}) => {
  if (!(schema instanceof z.ZodEnum)) {
    throw new Error('SelectWidget requires a ZodEnum schema');
  }

  const options = getOptions(schema) ?? [];

  const config =
    fieldConfig?.defaultValue !== undefined
      ? { ...fieldConfig, defaultValue: fieldConfig.defaultValue }
      : fieldConfig;

  return (
    <UseField
      path={path}
      component={FormSelectField}
      config={config}
      componentProps={{
        ...fieldProps,
        euiFieldProps: {
          ...fieldProps.euiFieldProps,
          options,
        },
      }}
    />
  );
};
