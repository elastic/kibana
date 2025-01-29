/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { CaseFormFieldsSchemaProps } from './schema';

import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import userEvent from '@testing-library/user-event';

import { Title } from './title';
import { schema } from '../create/schema';

describe('Title', () => {
  let globalForm: FormHook;

  const MockHookWrapperComponent: FC<PropsWithChildren<unknown>> = ({ children }) => {
    const { form } = useForm<CaseFormFieldsSchemaProps>({
      defaultValue: { title: 'My title' },
      schema: {
        title: schema.title,
      },
    });

    globalForm = form;

    return <Form form={form}>{children}</Form>;
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('it renders', async () => {
    render(
      <MockHookWrapperComponent>
        <Title isLoading={false} />
      </MockHookWrapperComponent>
    );

    expect(await screen.findByTestId('caseTitle')).toBeInTheDocument();
  });

  it('it disables the input when loading', async () => {
    render(
      <MockHookWrapperComponent>
        <Title isLoading={true} />
      </MockHookWrapperComponent>
    );
    expect(await screen.findByTestId('input')).toBeDisabled();
  });

  it('it changes the title', async () => {
    render(
      <MockHookWrapperComponent>
        <Title isLoading={false} />
      </MockHookWrapperComponent>
    );

    await userEvent.click(await screen.findByTestId('input'));
    await userEvent.paste(' is updated');

    expect(globalForm.getFormData()).toEqual({ title: 'My title is updated' });
  });
});
