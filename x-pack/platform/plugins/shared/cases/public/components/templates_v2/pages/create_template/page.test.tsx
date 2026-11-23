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
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { CreateTemplatePage } from './page';
import { mockedTestProvidersOwner, TestProviders } from '../../../../common/mock';
import {
  CASES_TEMPLATE_CREATED_EVENT_TYPE,
  LOCAL_STORAGE_KEYS,
} from '../../../../../common/constants';
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

/**
 * The template name is the editable page title, so naming a template is a header interaction rather
 * than a trip to the Configuration tab.
 */
const nameTemplateFromPageTitle = async (name: string) => {
  await userEvent.click(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.titleButton));
  await userEvent.type(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.titleInput), name);
  await userEvent.keyboard('{enter}');
};

describe('CreateTemplatePage', () => {
  let coreStart: CoreStart;

  beforeEach(() => {
    jest.clearAllMocks();
    coreStart = coreMock.createStart() as unknown as CoreStart;
    localStorage.clear();
    // Create resolves to the new template; the page then switches to edit mode for that id.
    mockMutateAsync.mockResolvedValue({ templateId: 'new-tpl-id' });
  });

  it('renders the layout with header and sections', async () => {
    render(
      <TestProviders>
        <CreateTemplatePage />
      </TestProviders>
    );

    // A new template opens unnamed, with the placeholder standing in for the name.
    expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent(i18n.UNTITLED_TEMPLATE);
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
    await nameTemplateFromPageTitle('My template');
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

    render(
      <TestProviders>
        <CreateTemplatePage />
      </TestProviders>
    );

    await nameTemplateFromPageTitle('My template');
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
    render(
      <TestProviders>
        <CreateTemplatePage />
      </TestProviders>
    );

    await nameTemplateFromPageTitle('My template');
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
    await nameTemplateFromPageTitle('My template');
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
    render(
      <TestProviders owner={['observability']}>
        <CreateTemplatePage />
      </TestProviders>
    );

    await nameTemplateFromPageTitle('My template');
    await userEvent.click(screen.getByTestId('saveTemplateHeaderButton'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    const { definition } = (
      mockMutateAsync.mock.calls[0][0] as { template: { definition: string } }
    ).template;
    const parsed = yamlParse(definition) as { settings?: Record<string, boolean> };
    expect(parsed.settings).toEqual({ syncAlerts: false, extractObservables: false });
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

    await nameTemplateFromPageTitle('My template');
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

  describe('telemetry', () => {
    it('reports one created event with the blank mode when the save succeeds', async () => {
      render(
        <TestProviders coreStart={coreStart}>
          <CreateTemplatePage />
        </TestProviders>
      );

      // Opening the editor is not a confirmed action.
      expect(coreStart.analytics.reportEvent).not.toHaveBeenCalled();

      await nameTemplateFromPageTitle('My template');
      await userEvent.click(screen.getByTestId('saveTemplateHeaderButton'));

      await waitFor(() => {
        expect(coreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
      });
      expect(coreStart.analytics.reportEvent).toHaveBeenCalledWith(
        CASES_TEMPLATE_CREATED_EVENT_TYPE,
        {
          owner: mockedTestProvidersOwner[0],
          entry_point: 'template_editor',
          creation_mode: 'blank',
        }
      );
    });

    it('reports nothing when the save fails', async () => {
      mockMutateAsync.mockRejectedValueOnce(new Error('Creation failed'));

      render(
        <TestProviders coreStart={coreStart}>
          <CreateTemplatePage />
        </TestProviders>
      );

      await nameTemplateFromPageTitle('My template');
      await userEvent.click(screen.getByTestId('saveTemplateHeaderButton'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });

      expect(coreStart.analytics.reportEvent).not.toHaveBeenCalled();
    });
  });
});
