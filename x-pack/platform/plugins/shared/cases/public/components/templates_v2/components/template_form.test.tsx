/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { TemplateYamlEditor } from './template_form';
import { TestProviders } from '../../../common/mock';
import { LOCAL_STORAGE_KEYS } from '../../../../common/constants';

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({ value, onChange }: { value: string; onChange: (code: string) => void }) => (
    <textarea
      data-test-subj="code-editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

describe('TemplateFormFields', () => {
  const renderFields = (definition: string) => {
    const Wrapper = () => {
      const form = useForm({
        defaultValues: {
          name: '',
          owner: '',
          definition,
        },
      });

      return (
        <TestProviders>
          <FormProvider {...form}>
            <TemplateYamlEditor
              storageKey={LOCAL_STORAGE_KEYS.templatesYamlEditorCreateState}
              initialValue={definition}
            />
          </FormProvider>
        </TestProviders>
      );
    };

    return render(<Wrapper />);
  };

  it('renders the YAML code editor with the provided definition', () => {
    renderFields('fields:\n  - name: test_field\n    type: keyword');

    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
    expect(screen.getByTestId('code-editor')).toHaveValue(
      'fields:\n  - name: test_field\n    type: keyword'
    );
  });

  it('updates the form value when the editor content changes', async () => {
    renderFields('initial: value');

    fireEvent.change(screen.getByTestId('code-editor'), {
      target: { value: 'updated: value' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('code-editor')).toHaveValue('updated: value');
    });
  });
});
