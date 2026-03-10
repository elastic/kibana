/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { CreateTemplateForm } from './template_form';
import { useCreateTemplate } from '../hooks/use_create_template';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useAvailableCasesOwners } from '../../app/use_available_owners';
import { TestProviders } from '../../../common/mock';
import * as i18n from '../translations';

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({ value, onChange }: { value: string; onChange: (code: string) => void }) => (
    <textarea
      data-test-subj="code-editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

jest.mock('../hooks/use_create_template');
jest.mock('../../cases_context/use_cases_context');
jest.mock('../../app/use_available_owners');

describe('CreateTemplateForm', () => {
  const mutateAsync = jest.fn();

  const renderForm = (definition: string) => {
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
            <CreateTemplateForm />
          </FormProvider>
        </TestProviders>
      );
    };

    return render(<Wrapper />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useCreateTemplate as jest.Mock).mockReturnValue({ mutateAsync, isLoading: false });
    (useCasesContext as jest.Mock).mockReturnValue({ owner: ['securitySolution'] });
    (useAvailableCasesOwners as jest.Mock).mockReturnValue(['securitySolution', 'observability']);
  });

  it('submits the template with the default owner and definition', async () => {
    renderForm('fields:\n  - name: test_field\n    type: keyword');

    fireEvent.click(screen.getByRole('button', { name: i18n.SAVE_TEMPLATE }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        template: {
          owner: 'securitySolution',
          definition: 'fields:\n  - name: test_field\n    type: keyword',
        },
      })
    );
  });
});
