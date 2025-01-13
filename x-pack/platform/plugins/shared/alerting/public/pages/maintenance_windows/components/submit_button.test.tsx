/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { fireEvent, waitFor } from '@testing-library/react';

import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { SubmitButton } from './submit_button';
import type { FormProps } from './schema';
import { schema } from './schema';
import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';

describe('SubmitButton', () => {
  const onSubmit = jest.fn();

  const MockHookWrapperComponent: FC<PropsWithChildren<unknown>> = ({ children }) => {
    const { form } = useForm<FormProps>({
      defaultValue: { title: 'title' },
      schema: {
        title: schema.title,
      },
      onSubmit,
    });

    return <Form form={form}>{children}</Form>;
  };

  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('it renders', async () => {
    const result = appMockRenderer.render(
      <MockHookWrapperComponent>
        <SubmitButton isLoading={false} />
      </MockHookWrapperComponent>
    );

    expect(result.getByTestId('create-submit')).toBeInTheDocument();
  });

  it('it submits', async () => {
    const result = appMockRenderer.render(
      <MockHookWrapperComponent>
        <SubmitButton isLoading={false} />
      </MockHookWrapperComponent>
    );

    fireEvent.click(result.getByTestId('create-submit'));
    await waitFor(() => expect(onSubmit).toBeCalled());
  });

  it('it disables when submitting', async () => {
    const result = appMockRenderer.render(
      <MockHookWrapperComponent>
        <SubmitButton isLoading={false} />
      </MockHookWrapperComponent>
    );

    fireEvent.click(result.getByTestId('create-submit'));
    await waitFor(() => expect(result.getByTestId('create-submit')).toBeDisabled());
  });
});
