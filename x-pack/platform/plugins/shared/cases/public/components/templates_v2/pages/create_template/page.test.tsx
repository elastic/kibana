/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateTemplatePage } from './page';
import { TestProviders } from '../../../../common/mock';
import { LOCAL_STORAGE_KEYS } from '../../../../../common/constants';
import { exampleTemplateDefinition } from '../../field_types/constants';
import * as i18n from '../../translations';

jest.mock('../../components/template_form', () => ({
  TemplateYamlEditor: () => <div data-test-subj="template-yaml-editor" />,
}));

jest.mock('../../components/template_preview', () => ({
  TemplatePreview: () => <div data-test-subj="create-template-preview" />,
}));

const mockMutateAsync = jest.fn();
const mockNavigateToCasesTemplates = jest.fn();

jest.mock('../../hooks/use_create_template', () => ({
  useCreateTemplate: () => ({ mutateAsync: mockMutateAsync, isLoading: false }),
}));

jest.mock('../../../../common/navigation', () => ({
  useCasesTemplatesNavigation: () => ({
    navigateToCasesTemplates: mockNavigateToCasesTemplates,
  }),
}));

jest.mock('../../../use_breadcrumbs', () => ({
  useCasesTemplatesBreadcrumbs: jest.fn(),
}));

describe('CreateTemplatePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockMutateAsync.mockResolvedValue(undefined);
  });

  it('renders the layout with header and sections', () => {
    render(
      <TestProviders>
        <CreateTemplatePage />
      </TestProviders>
    );

    expect(screen.getByText(i18n.ADD_TEMPLATE_TITLE)).toBeInTheDocument();
    expect(screen.getByText(i18n.BACK_TO_TEMPLATES)).toBeInTheDocument();
    expect(screen.getByTestId('saveTemplateHeaderButton')).toBeInTheDocument();
    expect(screen.getByTestId('template-yaml-editor')).toBeInTheDocument();
    expect(screen.getByTestId('create-template-preview')).toBeInTheDocument();
  });

  it('clears localStorage when template is successfully created', async () => {
    const modifiedTemplate = 'name: Modified Template\nfields: []';
    // Set up localStorage with modified content
    const storageKey = `securitySolution.${LOCAL_STORAGE_KEYS.templatesYamlEditorCreateState}`;
    localStorage.setItem(storageKey, JSON.stringify(modifiedTemplate));

    render(
      <TestProviders>
        <CreateTemplatePage />
      </TestProviders>
    );

    // Verify localStorage has the modified content
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(modifiedTemplate));

    // Click the save button
    const saveButton = screen.getByTestId('saveTemplateHeaderButton');
    await userEvent.click(saveButton);

    // Wait for the mutation to complete
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    // Verify localStorage was reset to default template
    await waitFor(() => {
      expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(exampleTemplateDefinition));
    });

    // Verify navigation was called
    expect(mockNavigateToCasesTemplates).toHaveBeenCalledTimes(1);
  });

  it('does not clear localStorage if template creation fails', async () => {
    const modifiedTemplate = 'name: Modified Template\nfields: []';
    const storageKey = `securitySolution.${LOCAL_STORAGE_KEYS.templatesYamlEditorCreateState}`;
    localStorage.setItem(storageKey, JSON.stringify(modifiedTemplate));

    // Mock mutation to fail
    mockMutateAsync.mockRejectedValueOnce(new Error('Creation failed'));

    render(
      <TestProviders>
        <CreateTemplatePage />
      </TestProviders>
    );

    const saveButton = screen.getByTestId('saveTemplateHeaderButton');
    await userEvent.click(saveButton);

    // Wait for the mutation to be called
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    // Verify localStorage was NOT cleared (still has modified content)
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(modifiedTemplate));

    // Verify navigation was NOT called
    expect(mockNavigateToCasesTemplates).not.toHaveBeenCalled();
  });

  it('resets localStorage to default template on successful creation', async () => {
    const storageKey = `securitySolution.${LOCAL_STORAGE_KEYS.templatesYamlEditorCreateState}`;
    render(
      <TestProviders>
        <CreateTemplatePage />
      </TestProviders>
    );

    const saveButton = screen.getByTestId('saveTemplateHeaderButton');
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    // Verify the localStorage value is the default example template
    const storedValue = localStorage.getItem(storageKey);
    expect(storedValue).toBe(JSON.stringify(exampleTemplateDefinition));
  });
});
