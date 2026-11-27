/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import type { EuiFieldTextProps } from '@elastic/eui';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { z } from '@kbn/zod/v4';
import { TextField as FormTextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { BaseWidgetProps } from '../types';
import { FormGeneratorFieldContext } from '../../field_context';

type TextWidgetProps = BaseWidgetProps<z.ZodString, EuiFieldTextProps>;

const TextFieldWithLabelAppend = ({
  field,
  labelAppend,
  ...rest
}: {
  field: FieldHook;
  labelAppend?: React.ReactNode;
  euiFieldProps?: EuiFieldTextProps;
  [key: string]: unknown;
}) => {
  const { renderLabelAppend } = useContext(FormGeneratorFieldContext);
  const contextAppend = renderLabelAppend?.({
    path: field.path,
    currentValue: field.value,
    setValue: (value: string) => field.setValue(value),
  });

  return (
    <FormTextField
      field={field}
      {...rest}
      labelAppend={
        <>
          {labelAppend}
          {contextAppend}
        </>
      }
    />
  );
};

export const TextWidget: React.FC<TextWidgetProps> = ({ path, fieldProps, fieldConfig }) => {
  return (
    <UseField
      path={path}
      component={TextFieldWithLabelAppend}
      config={fieldConfig}
      componentProps={fieldProps}
    />
  );
};
