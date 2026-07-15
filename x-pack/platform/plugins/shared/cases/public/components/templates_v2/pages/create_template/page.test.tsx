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
import * as i18n from '../../translations';

// Template identity is no longer written into the YAML, and the example already contains every
// required block, so the seeded initial editor value is the example definition verbatim.
const createPageInitialEditorYaml = exampleTemplateDefinition;

// A complete definition (all required blocks present) so save is not blocked by the completeness
// check. `name` here is the case-default title, not the template name.
const MODIFIED_TEMPLATE = `name: Modified Template
description: ""
severity: low
category: ""
tags: []
assignees: []
settings:
  syncAlerts: false
  extractObservables: false
connector:
  type: .none
  id: none
  fields: null
fields: []
`;

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
    getCasesTemplatesUrl: jest.fn().mockReturnValue('/app/security/cases/configure/templates'),
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

  it('renders the layout with header and sections', async () => {
    render(
      <TestProviders>
        <CreateTemplatePage />
      </TestProviders>
    );

    expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent(i18n.ADD_TEMPLATE_TITLE);
    expect(screen.getByTestId('appHeaderBack')).toHaveAttribute(
      'aria-label',
      `Back to ${i18n.TEMPLATE_TITLE}`
    );
    // AppMenu resolves its contents via a dynamic import, so the save button isn't available
    // in the very first render tick.
    expect(await screen.findByTestId('saveTemplateHeaderButton')).toBeInTheDocument();
    expect(screen.getByTestId('template-yaml-editor')).toBeInTheDocument();
    expect(screen.getByTestId('create-template-preview')).toBeInTheDocument();
  });

  it('clears localStorage when template is successfully created', async () => {
    const modifiedTemplate = MODIFIED_TEMPLATE;
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
    // The template name is panel-owned and lives on the Configuration tab under the Fields/
    // Configuration split, so switch to it before setting the name.
    await userEvent.click(screen.getByRole('tab', { name: /Configuration/ }));
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
    const modifiedTemplate = MODIFIED_TEMPLATE;
    const storageKey = `securitySolution.${LOCAL_STORAGE_KEYS.templatesYamlEditorCreateState}`;
    localStorage.setItem(storageKey, JSON.stringify(modifiedTemplate));

    // Mock mutation to fail
    mockMutateAsync.mockRejectedValueOnce(new Error('Creation failed'));

    render(
      <TestProviders>
        <CreateTemplatePage />
      </TestProviders>
    );

    // The template name is panel-owned and lives on the Configuration tab under the Fields/
    // Configuration split, so switch to it before setting the name.
    await userEvent.click(screen.getByRole('tab', { name: /Configuration/ }));
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

    // The template name is panel-owned and lives on the Configuration tab under the Fields/
    // Configuration split, so switch to it before setting the name.
    await userEvent.click(screen.getByRole('tab', { name: /Configuration/ }));
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

  it('defaults a new template to sync alerts + extract observables on (Security) in the saved definition', async () => {
    render(
      <TestProviders>
        <CreateTemplatePage />
      </TestProviders>
    );

    // Save without touching the settings toggles — the solution defaults must still be persisted.
    await userEvent.click(screen.getByRole('tab', { name: /Configuration/ }));
    await userEvent.type(screen.getByTestId('templateMetadataNameInput'), 'My template');
    await userEvent.click(screen.getByTestId('saveTemplateHeaderButton'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    const { definition } = (
      mockMutateAsync.mock.calls[0][0] as { template: { definition: string } }
    ).template;
    const parsed = yamlParse(definition) as { settings?: Record<string, boolean> };
    expect(parsed.settings).toEqual({ syncAlerts: true, extractObservables: true });
  });

  it('resets the panel config (settings/connector) draft to the defaults on successful creation', async () => {
    const storageKey = `securitySolution.${LOCAL_STORAGE_KEYS.templatesYamlEditorCreateState}`;
    const configKey = `${storageKey}.config`;
    // Simulate an in-progress create that toggled both settings off; it must not leak into the next
    // create — the draft must reset to the solution defaults.
    localStorage.setItem(
      configKey,
      JSON.stringify({ settings: { syncAlerts: false, extractObservables: false } })
    );

    render(
      <TestProviders>
        <CreateTemplatePage />
      </TestProviders>
    );

    await userEvent.click(screen.getByRole('tab', { name: /Configuration/ }));
    await userEvent.type(screen.getByTestId('templateMetadataNameInput'), 'My template');
    await userEvent.click(screen.getByTestId('saveTemplateHeaderButton'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    // The config draft is reset to the create defaults (Security test context → both on), not the
    // stale in-progress `{ false, false }`.
    const storedConfig = localStorage.getItem(configKey);
    const parsedConfig = storedConfig ? JSON.parse(storedConfig) : {};
    expect(parsedConfig.settings).toEqual({ syncAlerts: true, extractObservables: true });
  });
});
