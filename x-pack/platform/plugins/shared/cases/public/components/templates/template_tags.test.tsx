/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithTestingProviders } from '../../common/mock';
import { FormTestComponent } from '../../common/test_utils';
import { TemplateTags } from './template_tags';
import { showEuiComboBoxOptions } from '@elastic/eui/lib/test/rtl';

describe('TemplateTags', () => {
  const onSubmit = jest.fn();
  const formDefaultValue = { templateTags: [] };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders template tags', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <TemplateTags isLoading={false} tagOptions={[]} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-tags')).toBeInTheDocument();
  });

  it('renders loading state', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <TemplateTags isLoading={true} tagOptions={[]} />
      </FormTestComponent>
    );

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByLabelText('Loading')).toBeInTheDocument();
  });

  it('shows template tags options', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <TemplateTags isLoading={false} tagOptions={['foo', 'bar', 'test']} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-tags')).toBeInTheDocument();

    await showEuiComboBoxOptions();

    expect(await screen.findByText('foo')).toBeInTheDocument();
  });

  it('shows template tags with current values', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={{ templateTags: ['foo', 'bar'] }} onSubmit={onSubmit}>
        <TemplateTags isLoading={false} tagOptions={[]} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-tags')).toBeInTheDocument();

    expect(await screen.findByText('foo')).toBeInTheDocument();

    expect(await screen.findByText('bar')).toBeInTheDocument();
  });

  it('adds template tag ', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <TemplateTags isLoading={false} tagOptions={[]} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-tags')).toBeInTheDocument();

    const comboBoxEle = await screen.findByRole('combobox');
    await userEvent.click(comboBoxEle);
    await userEvent.paste('test');
    await userEvent.keyboard('{enter}');
    await userEvent.click(comboBoxEle);
    await userEvent.paste('template');
    await userEvent.keyboard('{enter}');

    await userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          templateTags: ['test', 'template'],
        },
        true
      );
    });
  });

  it('adds new template tag to existing tags', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={{ templateTags: ['foo', 'bar'] }} onSubmit={onSubmit}>
        <TemplateTags isLoading={false} tagOptions={[]} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-tags')).toBeInTheDocument();

    const comboBoxEle = await screen.findByRole('combobox');
    await userEvent.click(comboBoxEle);
    await userEvent.paste('test');
    await userEvent.keyboard('{enter}');

    await userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          templateTags: ['foo', 'bar', 'test'],
        },
        true
      );
    });
  });
});
