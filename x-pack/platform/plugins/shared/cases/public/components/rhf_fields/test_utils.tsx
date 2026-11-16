/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { z } from '@kbn/zod/v4';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import type { FieldValues, UseFormProps, UseFormReturn } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '../../utils/zod_resolver';

interface RenderWithFormOptions<T extends FieldValues> {
  schema: z.ZodType;
  defaultValues?: UseFormProps<T>['defaultValues'];
  mode?: UseFormProps<T>['mode'];
  children: React.ReactNode;
  /** Providers the children need, e.g. `TestProviders`. */
  wrapper?: RenderOptions['wrapper'];
}

interface RenderWithFormResult<T extends FieldValues> extends RenderResult {
  /** Latest form instance, e.g. `form.getValues()` or `form.formState.errors`. */
  form: () => UseFormReturn<T>;
  /** Called with the parsed values when the submit button passes validation. */
  onValid: jest.Mock;
  /** Called with the errors when the submit button fails validation. */
  onInvalid: jest.Mock;
}

/**
 * Renders `children` inside a react-hook-form provider validated by `schema` through `zodResolver`,
 * followed by a "Submit" button wired to `handleSubmit`.
 */
export const renderWithForm = <T extends FieldValues = FieldValues>({
  schema,
  defaultValues,
  mode = 'onChange',
  children,
  wrapper,
}: RenderWithFormOptions<T>): RenderWithFormResult<T> => {
  const onValid = jest.fn();
  const onInvalid = jest.fn();
  let latestForm: UseFormReturn<T>;

  const Wrapper: React.FC = () => {
    const methods = useForm<T>({ defaultValues, mode, resolver: zodResolver<T>(schema) });
    latestForm = methods;

    return (
      <FormProvider {...methods}>
        {children}
        <button type="button" onClick={methods.handleSubmit(onValid, onInvalid)}>
          {'Submit'}
        </button>
      </FormProvider>
    );
  };

  Wrapper.displayName = 'FormWrapper';

  const result = render(<Wrapper />, { wrapper });

  return { ...result, form: () => latestForm, onValid, onInvalid };
};
