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
const mockNavigateToEditTemplate = jest.fn();

jest.mock('../../hooks/use_create_template', () => ({
  useCreateTemplate: () => ({ mutateAsync: mockMutateAsync, isLoading: false }),
}));

jest.mock('../../../../common/navigation', () => ({
  useCasesTemplatesNavigation: () => ({
    navigateToCasesTemplates: mockNavigateToCasesTemplates,
    getCasesTemplatesUrl: jest.fn().mockReturnValue('/app/security/cases/configure/templates'),
  }),
  useCasesEditTemplateNavigation: () => ({
    navigateToCasesEditTemplate: mockNavigateToEditTemplate,
  }),
}));

jest.mock('../../../use_breadcrumbs', () => ({
  useCasesTemplatesBreadcrumbs: jest.fn(),
}));

const observablesEnabledFeatures = { observables: { enabled: true, autoExtract: true } };

/**
 * Creating a template now opens a modal for the required name before the editor is reachable, so
 * every editor-level assertion has to walk through it first. Passing a name here also means the
 * Configuration tab already holds a valid name, which is why the tests below no longer set one.
 */
const renderCreatePageAndName = async ({
  name = 'My template',
  features,
}: { name?: string; features?: object } = {}) => {
  const view = render(
    <TestProviders {...(features ? { features } : {})}>
      <CreateTemplatePage />
    </TestProviders>
  );

  await userEvent.type(screen.getByTestId('templateMetadataNameInput'), name);
  await userEvent.click(screen.getByTestId('createTemplateModalConfirm'));

  return view;
};

describe('CreateTemplatePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Create resolves to the new template; the page then switches to edit mode for that id.
    mockMutateAsync.mockResolvedValue({ templateId: 'new-tpl-id' });
  });

  it('asks for the required name before the editor is reachable', () => {
    render(
      <TestProviders>
        <CreateTemplatePage />
      </TestProviders>
    );

    // The name is required but lives on the Configuration tab, which the editor does not open on.
    // Collecting it up front is what stops the only mandatory step from being discoverable solely
    // by failing to save.
    expect(screen.getByTestId('createTemplateModal')).toBeInTheDocument();
    expect(screen.queryByTestId('template-yaml-editor')).not.toBeInTheDocument();
  });

  it('skips the prompt when a named draft is already in progress', () => {
    const metadataKey = `securitySolution.${LOCAL_STORAGE_KEYS.templatesYamlEditorCreateState}.metadata`;
    localStorage.setItem(
      metadataKey,
      JSON.stringify({ name: 'Resumed draft', description: '', tags: [] })
    );

    render(
      <TestProviders>
        <CreateTemplatePage />
      </TestProviders>
    );

    expect(screen.queryByTestId('createTemplateModal')).not.toBeInTheDocument();
    expect(screen.getByTestId('template-yaml-editor')).toBeInTheDocument();
  });

  it('carries the name from the prompt into the editor', async () => {
    await renderCreatePageAndName({ name: 'Ransomware runbook' });

    await userEvent.click(screen.getByRole('tab', { name: /Configuration/ }));

    expect(screen.getByTestId('templateMetadataNameInput')).toHaveValue('Ransomware runbook');
  });

  it('renders the layout with header and sections', async () => {
    await renderCreatePageAndName();

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

    await renderCreatePageAndName();

    // Verify localStorage has the modified content
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(modifiedTemplate));

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

    // After the first save the editor stays open in edit mode for the newly created template.
    expect(mockNavigateToEditTemplate).toHaveBeenCalledWith({ templateId: 'new-tpl-id' });
    expect(mockNavigateToCasesTemplates).not.toHaveBeenCalled();
  });

  it('does not clear localStorage if template creation fails', async () => {
    const modifiedTemplate = MODIFIED_TEMPLATE;
    const storageKey = `securitySolution.${LOCAL_STORAGE_KEYS.templatesYamlEditorCreateState}`;
    localStorage.setItem(storageKey, JSON.stringify(modifiedTemplate));

    // Mock mutation to fail
    mockMutateAsync.mockRejectedValueOnce(new Error('Creation failed'));

    await renderCreatePageAndName();

    // The template name is panel-owned and lives on the Configuration tab under the Fields/
    // Configuration split, so switch to it before setting the name.
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
    expect(mockNavigateToEditTemplate).not.toHaveBeenCalled();
    expect(mockNavigateToCasesTemplates).not.toHaveBeenCalled();
  });

  it('resets localStorage to default template on successful creation', async () => {
    const storageKey = `securitySolution.${LOCAL_STORAGE_KEYS.templatesYamlEditorCreateState}`;
    await renderCreatePageAndName();

    // The template name is panel-owned and lives on the Configuration tab under the Fields/
    // Configuration split, so switch to it before setting the name.
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
    await renderCreatePageAndName({ features: observablesEnabledFeatures });

    // Save without touching the settings toggles — the solution defaults must still be persisted.
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

  it('defaults extract observables off where the feature is unavailable (e.g. Observability/Stack)', async () => {
    // Default test context uses DEFAULT_FEATURES (observables autoExtract off) and a basic license,
    // so the toggle is hidden and the persisted default must be off.
    await renderCreatePageAndName();

    await userEvent.click(screen.getByTestId('saveTemplateHeaderButton'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    const { definition } = (
      mockMutateAsync.mock.calls[0][0] as { template: { definition: string } }
    ).template;
    const parsed = yamlParse(definition) as { settings?: Record<string, boolean> };
    expect(parsed.settings).toEqual({ syncAlerts: true, extractObservables: false });
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

    await renderCreatePageAndName({ features: observablesEnabledFeatures });

    await userEvent.click(screen.getByTestId('saveTemplateHeaderButton'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    // The config draft is reset to the create defaults (Security context → both on), not the
    // stale in-progress `{ false, false }`.
    const storedConfig = localStorage.getItem(configKey);
    const parsedConfig = storedConfig ? JSON.parse(storedConfig) : {};
    expect(parsedConfig.settings).toEqual({ syncAlerts: true, extractObservables: true });
  });
});
