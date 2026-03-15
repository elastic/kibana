/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EditTemplatePage } from './page';
import * as i18n from '../../translations';

const mockUseTemplateViewParams = jest.fn();
const mockNavigateToCasesTemplates = jest.fn();
jest.mock('../../../../common/navigation', () => ({
  useTemplateViewParams: () => mockUseTemplateViewParams(),
  useCasesTemplatesNavigation: () => ({
    navigateToCasesTemplates: mockNavigateToCasesTemplates,
  }),
}));

const mockUseGetTemplate = jest.fn();
jest.mock('../../hooks/use_get_template', () => ({
  useGetTemplate: () => mockUseGetTemplate(),
}));

jest.mock('../../hooks/use_update_template', () => ({
  useUpdateTemplate: () => ({ mutateAsync: jest.fn(), isLoading: false }),
}));

jest.mock('../../components/template_form', () => ({
  TemplateYamlEditor: () => <div data-test-subj="template-yaml-editor" />,
}));

jest.mock('../../components/template_preview', () => ({
  TemplatePreview: () => <div data-test-subj="template-preview" />,
}));

jest.mock('../../../../common/use_cases_local_storage', () => ({
  useCasesLocalStorage: () => ['', jest.fn()],
}));

jest.mock('../../../use_breadcrumbs', () => ({
  useCasesTemplatesBreadcrumbs: jest.fn(),
}));

const mockTemplateFormLayout = jest.fn();
jest.mock('../../components/template_form_layout', () => ({
  TemplateFormLayout: (props: { title: string; isLoading?: boolean }) =>
    mockTemplateFormLayout(props),
}));

describe('EditTemplatePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTemplateFormLayout.mockImplementation(({ title, isLoading }) => (
      <div>
        <div data-test-subj="layout-title">{title}</div>
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
        templateVersion: 2,
        deletedAt: null,
        isLatest: true,
        latestVersion: 2,
      },
      isLoading: false,
    });

    render(<EditTemplatePage />);

    expect(screen.getByTestId('layout-title')).toHaveTextContent(i18n.EDIT_TEMPLATE_TITLE);
    expect(screen.getByTestId('layout-loaded')).toBeInTheDocument();
    expect(screen.getByTestId('template-yaml-editor')).toBeInTheDocument();
  });

  it('shows loading state when template is not yet available', () => {
    mockUseTemplateViewParams.mockReturnValue({ templateId: 'template-123' });
    mockUseGetTemplate.mockReturnValue({ data: undefined, isLoading: true });

    render(<EditTemplatePage />);

    expect(screen.getByTestId('layout-loading')).toBeInTheDocument();
  });
});
