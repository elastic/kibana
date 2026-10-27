/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from '@kbn/zod/v4';
import { TestProviders } from '../../common/mock';
import { renderWithForm } from '../rhf_fields/test_utils';
import { MarkdownField } from './markdown_field';

const schema = z.object({ description: z.string().min(1, 'Description is required') });

const renderField = (defaultValues = { description: '' }, draftStorageKey?: string) =>
  renderWithForm({
    schema,
    defaultValues,
    wrapper: TestProviders,
    children: (
      <MarkdownField
        name="description"
        id="description"
        dataTestSubj="caseDescription"
        idAria="caseDescription"
        label="Description"
        draftStorageKey={draftStorageKey}
      />
    ),
  });

describe('MarkdownField', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('writes typed markdown into the form', async () => {
    const { form } = renderField();

    await userEvent.type(screen.getByTestId('euiMarkdownEditorTextArea'), 'hello');

    expect(form().getValues('description')).toBe('hello');
  });

  it('renders the initial value', () => {
    renderField({ description: 'initial' });

    expect(screen.getByTestId('euiMarkdownEditorTextArea')).toHaveValue('initial');
  });

  it('shows the resolver error on submit and clears it once valid', async () => {
    const { onValid } = renderField();

    await userEvent.click(screen.getByText('Submit'));
    expect(await screen.findByText('Description is required')).toBeInTheDocument();

    await userEvent.type(screen.getByTestId('euiMarkdownEditorTextArea'), 'hello');
    await waitFor(() =>
      expect(screen.queryByText('Description is required')).not.toBeInTheDocument()
    );

    await userEvent.click(screen.getByText('Submit'));
    await waitFor(() =>
      expect(onValid).toHaveBeenCalledWith({ description: 'hello' }, expect.anything())
    );
  });

  it('reflects form resets in the editor', async () => {
    const { form } = renderField({ description: 'initial' });

    await userEvent.type(screen.getByTestId('euiMarkdownEditorTextArea'), '!');
    expect(screen.getByTestId('euiMarkdownEditorTextArea')).toHaveValue('initial!');

    act(() => form().reset({ description: 'after reset' }));

    await waitFor(() =>
      expect(screen.getByTestId('euiMarkdownEditorTextArea')).toHaveValue('after reset')
    );
  });

  it('restores a draft from session storage', async () => {
    sessionStorage.setItem('draftKey', 'draft text');

    const { form } = renderField({ description: '' }, 'draftKey');

    await waitFor(() => expect(form().getValues('description')).toBe('draft text'));
  });
});
