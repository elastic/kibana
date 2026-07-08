/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parse as yamlParse } from 'yaml';
import { CreateTemplatePage } from './page';
import { TestProviders } from '../../../../common/mock';
import { LOCAL_STORAGE_KEYS } from '../../../../../common/constants';
import { exampleTemplateDefinition } from '../../field_types/constants';
import { setTemplateMetadataInYaml } from '../../utils/template_metadata_yaml';
import { mergeTemplateDefinition } from '../../utils/template_settings_yaml';
import * as i18n from '../../translations';

const createPageInitialEditorYaml = mergeTemplateDefinition(
  setTemplateMetadataInYaml(exampleTemplateDefinition, { name: '', description: '', tags: [] }),
  { settings: { syncAlerts: false, extractObservables: false } }
);

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
    await userEvent.type(screen.getByTestId('templateMetadataNameInput'), 'My template');
    const saveButton = screen.getByTestId('saveTemplateHeaderButton');
    await userEvent.click(saveButton);

    // Wait for the mutation to complete
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    // Verify localStorage was reset to the default editor template buffer.
    await waitFor(() => {
      expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(createPageInitialEditorYaml));
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

    await userEvent.type(screen.getByTestId('templateMetadataNameInput'), 'My template');
    const saveButton = screen.getByTestId('saveTemplateHeaderButton');
    await userEvent.click(saveButton);

    // Wait for the mutation to be called
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    // Verify localStorage was NOT cleared; failed save preserves the in-progress draft.
    const storedDraft = localStorage.getItem(storageKey);
    expect(storedDraft).not.toBeNull();
    const parsedDraft = yamlParse(JSON.parse(storedDraft ?? '""') as string) as Record<
      string,
      unknown
    >;
    expect(parsedDraft.name).toEqual('Modified Template');
    expect(localStorage.getItem(storageKey)).not.toBe(JSON.stringify(createPageInitialEditorYaml));

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

    await userEvent.type(screen.getByTestId('templateMetadataNameInput'), 'My template');
    const saveButton = screen.getByTestId('saveTemplateHeaderButton');
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    // Verify the localStorage value is the default example template.
    const storedValue = localStorage.getItem(storageKey);
    expect(storedValue).toBe(JSON.stringify(createPageInitialEditorYaml));
  });
});
