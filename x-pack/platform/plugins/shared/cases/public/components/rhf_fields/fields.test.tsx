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
import {
  ComboBoxField,
  HiddenField,
  NumberField,
  SelectField,
  TextareaField,
  TextField,
  ToggleField,
} from '.';
import { renderWithForm } from './test_utils';

const submit = () => userEvent.click(screen.getByText('Submit'));

describe('rhf_fields', () => {
  describe('TextField', () => {
    const schema = z.object({ title: z.string().min(1, 'Title is required') });

    it('shows the resolver error on submit and clears it once valid', async () => {
      const { onValid, onInvalid } = renderWithForm({
        schema,
        defaultValues: { title: '' },
        children: <TextField name="title" label="Title" data-test-subj="title" />,
      });

      await submit();
      expect(await screen.findByText('Title is required')).toBeInTheDocument();
      expect(onInvalid).toHaveBeenCalled();

      await userEvent.type(screen.getByTestId('title'), 'abc');
      await waitFor(() => expect(screen.queryByText('Title is required')).not.toBeInTheDocument());

      await submit();
      await waitFor(() =>
        expect(onValid).toHaveBeenCalledWith({ title: 'abc' }, expect.anything())
      );
    });

    it('reflects form resets', async () => {
      const { form } = renderWithForm({
        schema,
        defaultValues: { title: 'initial' },
        children: <TextField name="title" label="Title" data-test-subj="title" />,
      });

      await userEvent.type(screen.getByTestId('title'), '!');
      expect(screen.getByTestId('title')).toHaveValue('initial!');

      act(() => form().reset());
      await waitFor(() => expect(screen.getByTestId('title')).toHaveValue('initial'));
    });
  });

  describe('TextareaField', () => {
    it('validates through the schema', async () => {
      renderWithForm({
        schema: z.object({ text: z.string().max(3, 'Too long') }),
        defaultValues: { text: '' },
        children: <TextareaField name="text" label="Text" data-test-subj="text" />,
      });

      await userEvent.type(screen.getByTestId('text'), 'abcd');
      expect(await screen.findByText('Too long')).toBeInTheDocument();
    });
  });

  describe('SelectField', () => {
    it('stores the selected value', async () => {
      const { form } = renderWithForm({
        schema: z.object({ severity: z.string() }),
        defaultValues: { severity: 'low' },
        children: (
          <SelectField
            name="severity"
            label="Severity"
            euiFieldProps={{
              'data-test-subj': 'severity',
              options: [
                { value: 'low', text: 'Low' },
                { value: 'high', text: 'High' },
              ],
            }}
          />
        ),
      });

      await userEvent.selectOptions(screen.getByTestId('severity'), 'high');
      expect(form().getValues('severity')).toBe('high');
    });

    it('does not preselect the first option when the form value is empty', () => {
      renderWithForm({
        schema: z.object({ severity: z.string().optional() }),
        children: (
          <SelectField
            name="severity"
            label="Severity"
            euiFieldProps={{
              'data-test-subj': 'severity',
              options: [{ value: 'low', text: 'Low' }],
            }}
          />
        ),
      });

      expect(screen.getByTestId('severity')).toHaveValue('');
    });
  });

  describe('ComboBoxField', () => {
    const schema = z.object({ tags: z.array(z.string()).min(1, 'Add a tag') });

    it('renders selected labels and shows errors', async () => {
      renderWithForm({
        schema,
        defaultValues: { tags: [] },
        children: <ComboBoxField name="tags" label="Tags" />,
      });

      await submit();
      expect(await screen.findByText('Add a tag')).toBeInTheDocument();
    });

    it('creates values when creatable', async () => {
      const { form } = renderWithForm({
        schema,
        defaultValues: { tags: ['a'] },
        children: (
          <ComboBoxField
            name="tags"
            label="Tags"
            isCreatable
            euiFieldProps={{ 'data-test-subj': 'tags' }}
          />
        ),
      });

      expect(screen.getByText('a')).toBeInTheDocument();
      await userEvent.type(screen.getByTestId('comboBoxSearchInput'), 'b{enter}');
      expect(form().getValues('tags')).toEqual(['a', 'b']);
    });
  });

  describe('ComboBoxField single selection', () => {
    it('replaces the value when creating', async () => {
      const { form } = renderWithForm({
        schema: z.object({ category: z.array(z.string()) }),
        defaultValues: { category: ['a'] },
        children: (
          <ComboBoxField
            name="category"
            label="Category"
            isCreatable
            euiFieldProps={{ singleSelection: true }}
          />
        ),
      });

      await userEvent.type(screen.getByTestId('comboBoxSearchInput'), 'b{enter}');
      expect(form().getValues('category')).toEqual(['b']);
    });
  });

  describe('ToggleField', () => {
    it('stores a boolean', async () => {
      const { form } = renderWithForm({
        schema: z.object({ sync: z.boolean() }),
        defaultValues: { sync: false },
        children: <ToggleField name="sync" label="Sync" data-test-subj="sync" />,
      });

      await userEvent.click(screen.getByTestId('sync'));
      expect(form().getValues('sync')).toBe(true);
    });
  });

  describe('NumberField', () => {
    const schema = z.object({ count: z.number().min(1, 'At least 1').optional() });

    it('stores numbers, and undefined when empty', async () => {
      const { form } = renderWithForm({
        schema,
        children: <NumberField name="count" label="Count" data-test-subj="count" />,
      });

      await userEvent.type(screen.getByTestId('count'), '5');
      expect(form().getValues('count')).toBe(5);

      await userEvent.clear(screen.getByTestId('count'));
      expect(form().getValues('count')).toBeUndefined();
    });

    it('shows the schema error', async () => {
      renderWithForm({
        schema,
        children: <NumberField name="count" label="Count" data-test-subj="count" />,
      });

      await userEvent.type(screen.getByTestId('count'), '0');
      expect(await screen.findByText('At least 1')).toBeInTheDocument();
    });
  });

  describe('HiddenField', () => {
    it('submits its value without rendering a visible control', async () => {
      const { onValid } = renderWithForm({
        schema: z.object({ owner: z.string() }),
        defaultValues: { owner: 'cases' },
        children: <HiddenField name="owner" data-test-subj="owner" />,
      });

      expect(screen.getByTestId('owner')).toHaveAttribute('type', 'hidden');
      await submit();
      await waitFor(() =>
        expect(onValid).toHaveBeenCalledWith({ owner: 'cases' }, expect.anything())
      );
    });
  });
});
