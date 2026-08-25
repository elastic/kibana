/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText } from '@elastic/eui';
import { useField } from 'formik';
import type { FieldValidator } from 'formik';
import type { ComponentPropsWithoutRef, ElementType } from 'react';
import React from 'react';

export interface FormFieldProps<T extends ElementType> {
  as?: T;
  name: string;
  validate?: FieldValidator | ValidateOptions;
}

/**
 * Polymorphic component that renders a form field with all state required for inline validation.
 *
 * @example Text field with validation rule:
 * ```typescript
 * <Formik>
 *   <FormField name="initials" validate={{ required: 'Enter initials.' }} />
 * </Formik>
 * ```
 *
 * @example Color picker using non-standard value prop and change handler:
 * ```typescript
 * <Formik>
 *   <FormField
 *     as={EuiColorPicker}
 *     name="color"
 *     color={formik.values.color}
 *     onChange={(value) => formik.setFieldValue('color', value)}
 *   />
 * </Formik>
 * ```
 *
 * @throws Error if not a child of a `<Formik>` component.
 */
export function FormField<T extends ElementType = typeof EuiFieldText>({
  as,
  validate,
  onBlur,
  ...rest
}: FormFieldProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof FormFieldProps<T>>) {
  const Component = as || EuiFieldText;

  const [field, meta, helpers] = useField({
    name: rest.name,
    validate: typeof validate === 'object' ? createFieldValidator(validate) : validate,
  });

  return (
    <Component
      isInvalid={meta.touched && !!meta.error}
      {...field}
      {...rest}
      onBlur={(event) => {
        helpers.setTouched(true); // Marking as touched manually here since some EUI components don't pass on the native blur event which is required by `field.onBlur()`.
        onBlur?.(event);
      }}
    />
  );
}

export interface ValidateOptions {
  required?: string;
  pattern?: {
    value: RegExp;
    message: string;
  };
  minLength?: {
    value: number;
    message: string;
  };
  maxLength?: {
    value: number;
    message: string;
  };
  min?: {
    value: number;
    message: string;
  };
  max?: {
    value: number;
    message: string;
  };
}

export function createFieldValidator(options: ValidateOptions): FieldValidator {
  return (value: any) => {
    if (options.required && typeof value !== 'number' && !value) {
      return options.required;
    }
    if (options.pattern && !options.pattern.value.test(value)) {
      return options.pattern.message;
    }
    if (
      options.minLength &&
      (!value ||
        ((typeof value === 'object' || typeof value === 'string') &&
          value.length < options.minLength.value))
    ) {
      return options.minLength.message;
    }
    if (
      options.maxLength &&
      value &&
      (typeof value === 'object' || typeof value === 'string') &&
      value.length > options.maxLength.value
    ) {
      return options.maxLength.message;
    }
    if (options.min && (isNaN(value) || value < options.min.value)) {
      return options.min.message;
    }
    if (options.max && (isNaN(value) || value > options.max.value)) {
      return options.max.message;
    }
  };
}
