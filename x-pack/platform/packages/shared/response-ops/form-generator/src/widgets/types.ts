/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { z } from '@kbn/zod/v4';
import type { FormConfig } from '../form';

export enum WidgetType {
  Text = 'text',
  Password = 'password',
  Select = 'select',
  FormFieldset = 'formFieldset',
  Hidden = 'hidden',
  Object = 'object',
}

export interface BaseWidgetProps<
  TSchema extends z.ZodType = z.ZodType,
  TEuiFieldProps = Record<string, unknown>,
  TOption = unknown
> {
  /* The dot-notated path to the field within the form data */
  path: string;
  /* The Zod schema for the field */
  schema: TSchema;
  /* Global form configuration */
  formConfig: FormConfig;
  /* Configuration specific to the field */
  fieldConfig: {
    label?: string;
    validations: [
      {
        validator: (...args: Parameters<ValidationFunc>) => ReturnType<ValidationFunc<any>>;
      }
    ];
    defaultValue?: z.infer<TSchema>;
  } & Record<string, unknown>;
  /* Props to be passed to the underlying EUI field component */
  fieldProps: { euiFieldProps: TEuiFieldProps } & Record<string, unknown>;
  /* Options for fields like select dropdowns */
  options?: TOption[];
}

export type BaseWidgetPropsWithOptions<
  TSchema extends z.ZodType = z.ZodType,
  TEuiFieldProps = Record<string, unknown>,
  TOption = Record<string, unknown>
> = BaseWidgetProps<TSchema, TEuiFieldProps, TOption> & {
  options: TOption[];
};
