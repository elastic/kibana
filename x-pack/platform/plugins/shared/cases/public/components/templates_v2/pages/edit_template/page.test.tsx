/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { EditTemplatePage } from './page';
import { mockedTestProvidersOwner, TestProviders } from '../../../../common/mock';
import { CASES_TEMPLATE_UPDATED_EVENT_TYPE } from '../../../../../common/constants';

const mockUseTemplateViewParams = jest.fn();
const mockNavigateToCasesTemplates = jest.fn();
jest.mock('../../../../common/navigation', () => ({
  ...jest.requireActual('../../../../common/navigation'),
  useTemplateViewParams: () => mockUseTemplateViewParams(),
  useCasesTemplatesNavigation: () => ({
    navigateToCasesTemplates: mockNavigateToCasesTemplates,
    getCasesTemplatesUrl: jest.fn().mockReturnValue('/app/security/cases/configure/templates'),
  }),
}));

const mockMutateAsync = jest.fn();
const mockUseGetTemplate = jest.fn();
jest.mock('../../hooks/use_get_template', () => ({
  useGetTemplate: () => mockUseGetTemplate(),
}));

jest.mock('../../hooks/use_update_template', () => ({
  useUpdateTemplate: () => ({ mutateAsync: mockMutateAsync, isLoading: false }),
}));

jest.mock('../../components/template_form', () => ({
  TemplateYamlEditor: () => <div data-test-subj="template-yaml-editor" />,
}));

jest.mock('../../components/template_preview', () => ({
  TemplatePreview: () => <div data-test-subj="template-preview" />,
}));

jest.mock('../../../../common/use_cases_local_storage', () => ({
  useCasesLocalStorage: () => ['', jest.fn(), jest.fn()],
}));

jest.mock('../../../use_breadcrumbs', () => ({
  useCasesTemplatesBreadcrumbs: jest.fn(),
}));

const capturedTemplateFormLayoutProps: {
  onCreate?: (
    data: { definition: string },
    metadata: { name: string; description: string; tags: string[] },
    isEnabled: boolean
  ) => Promise<void>;
} = {};
const mockTemplateFormLayout = jest.fn();
jest.mock('../../components/template_form_layout', () => ({
  TemplateFormLayout: (props: {
    title: string;
    isLoading?: boolean;
    onCreate: (
      data: { definition: string },
      metadata: { name: string; description: string; tags: string[] },
      isEnabled: boolean
    ) => Promise<void>;
  }) => {
    capturedTemplateFormLayoutProps.onCreate = props.onCreate;
    return mockTemplateFormLayout(props);
  },
}));

describe('EditTemplatePage', () => {
  let coreStart: CoreStart;

  const renderEditTemplatePage = () =>
    render(
      <TestProviders coreStart={coreStart}>
        <EditTemplatePage />
      </TestProviders>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    coreStart = coreMock.createStart() as unknown as CoreStart;
    mockMutateAsync.mockResolvedValue(undefined);
    mockTemplateFormLayout.mockImplementation(({ initialMetadata, isLoading }) => (
      <div>
        {/* The editor renders the template's own name as an editable page title, so the layout is
            handed the metadata rather than a static heading. */}
        <div data-test-subj="layout-title">{initialMetadata?.name}</div>
        <div data-test-subj={isLoading ? 'layout-loading' : 'layout-loaded'} />
        <div data-test-subj="template-yaml-editor" />
      </div>
    ));
  });

  it('renders the edit layout with form fields', () => {
    mockUseTemplateViewParams.mockReturnValue({ templateId: 'template-123' });
    mockUseGetTemplate.mockReturnValue({
      data: {
        templateId: 'template-123',
        name: 'Test Template',
        owner: 'cases',
        definition: { name: 'Test Template', fields: [] },
        definitionString: 'name: Test Template\nfields: []',
        templateVersion: 2,
        deletedAt: null,
        isLatest: true,
        latestVersion: 2,
      },
      isLoading: false,
    });

    renderEditTemplatePage();

    expect(screen.getByTestId('layout-title')).toHaveTextContent('Test Template');
    expect(screen.getByTestId('layout-loaded')).toBeInTheDocument();
    expect(screen.getByTestId('template-yaml-editor')).toBeInTheDocument();
  });

  it('renders nothing when template is loading and not yet available', () => {
    mockUseTemplateViewParams.mockReturnValue({ templateId: 'template-123' });
    mockUseGetTemplate.mockReturnValue({ data: undefined, isLoading: true });

    // Scoped to a slot of its own, because the surrounding providers render markup into the
    // container and would defeat an assertion made on the container itself.
    render(
      <TestProviders coreStart={coreStart}>
        <div data-test-subj="edit-page-slot">
          <EditTemplatePage />
        </div>
      </TestProviders>
    );

    expect(screen.getByTestId('edit-page-slot')).toBeEmptyDOMElement();
  });

  it('sends empty description and empty tags when metadata is cleared', async () => {
    mockUseTemplateViewParams.mockReturnValue({ templateId: 'template-123' });
    mockUseGetTemplate.mockReturnValue({
      data: {
        templateId: 'template-123',
        name: 'Test Template',
        description: 'Existing template description',
        tags: ['existing-tag'],
        owner: 'cases',
        definition: { name: 'Test Template', fields: [] },
        definitionString: 'name: Test Template\nfields: []',
        templateVersion: 2,
        deletedAt: null,
        isLatest: true,
        latestVersion: 2,
        isEnabled: true,
      },
      isLoading: false,
    });

    renderEditTemplatePage();

    await capturedTemplateFormLayoutProps.onCreate?.(
      { definition: 'name: Updated\nfields: []' },
      { name: 'Test Template', description: '', tags: [] },
      true
    );

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        templateId: 'template-123',
        template: {
          name: 'Test Template',
          description: '',
          tags: [],
          definition: 'name: Updated\nfields: []',
          isEnabled: true,
        },
      });
    });
  });

  it('sends undefined description/tags on a no-op save of a template that never had them', async () => {
    mockUseTemplateViewParams.mockReturnValue({ templateId: 'template-123' });
    mockUseGetTemplate.mockReturnValue({
      data: {
        templateId: 'template-123',
        name: 'Test Template',
        // No description / tags on the stored template.
        owner: 'cases',
        definition: { name: 'Test Template', fields: [] },
        definitionString: 'name: Test Template\nfields: []',
        templateVersion: 2,
        deletedAt: null,
        isLatest: true,
        latestVersion: 2,
        isEnabled: true,
      },
      isLoading: false,
    });

    renderEditTemplatePage();

    // The metadata form folds undefined identity fields to '' / []. A no-op Save must NOT coerce
    // those into a persisted '' / [] via the PATCH `?? existing` fallback.
    await capturedTemplateFormLayoutProps.onCreate?.(
      { definition: 'name: Test Template\nfields: []' },
      { name: 'Test Template', description: '', tags: [] },
      true
    );

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        templateId: 'template-123',
        template: {
          name: 'Test Template',
          description: undefined,
          tags: undefined,
          definition: 'name: Test Template\nfields: []',
          isEnabled: true,
        },
      });
    });
  });

  describe('telemetry', () => {
    const loadedTemplate = {
      data: {
        templateId: 'template-123',
        name: 'Test Template',
        owner: 'cases',
        definition: { name: 'Test Template', fields: [] },
        definitionString: 'name: Test Template\nfields: []',
        templateVersion: 2,
        deletedAt: null,
        isLatest: true,
        latestVersion: 2,
        isEnabled: true,
      },
      isLoading: false,
    };

    beforeEach(() => {
      mockUseTemplateViewParams.mockReturnValue({ templateId: 'template-123' });
      mockUseGetTemplate.mockReturnValue(loadedTemplate);
    });

    it('reports one updated event with the editor entry point when the save succeeds', async () => {
      renderEditTemplatePage();

      // Opening an existing template is not a confirmed action.
      expect(coreStart.analytics.reportEvent).not.toHaveBeenCalled();

      await capturedTemplateFormLayoutProps.onCreate?.(
        { definition: 'name: Updated\nfields: []' },
        { name: 'Test Template', description: '', tags: [] },
        true
      );

      await waitFor(() => {
        expect(coreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
      });
      expect(coreStart.analytics.reportEvent).toHaveBeenCalledWith(
        CASES_TEMPLATE_UPDATED_EVENT_TYPE,
        { owner: mockedTestProvidersOwner[0], entry_point: 'template_editor' }
      );
    });

    it('reports nothing when the save fails', async () => {
      mockMutateAsync.mockRejectedValueOnce(new Error('Update failed'));

      renderEditTemplatePage();

      await expect(
        capturedTemplateFormLayoutProps.onCreate?.(
          { definition: 'name: Updated\nfields: []' },
          { name: 'Test Template', description: '', tags: [] },
          true
        )
      ).rejects.toThrow('Update failed');

      expect(coreStart.analytics.reportEvent).not.toHaveBeenCalled();
    });
  });
});
