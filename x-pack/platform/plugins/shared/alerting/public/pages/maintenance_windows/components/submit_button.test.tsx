/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { fireEvent, waitFor, screen } from '@testing-library/react';

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
  });

  it('it renders', async () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <MockHookWrapperComponent>
        <SubmitButton isLoading={false} />
      </MockHookWrapperComponent>
    );

    expect(screen.getByTestId('create-submit')).toBeInTheDocument();
  });

  it('it submits', async () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <MockHookWrapperComponent>
        <SubmitButton isLoading={false} />
      </MockHookWrapperComponent>
    );

    fireEvent.click(screen.getByTestId('create-submit'));
    await waitFor(() => expect(onSubmit).toBeCalled());
  });

  it('it disables when submitting', async () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <MockHookWrapperComponent>
        <SubmitButton isLoading={false} />
      </MockHookWrapperComponent>
    );

    fireEvent.click(screen.getByTestId('create-submit'));
    await waitFor(() => expect(screen.getByTestId('create-submit')).toBeDisabled());
  });
});
