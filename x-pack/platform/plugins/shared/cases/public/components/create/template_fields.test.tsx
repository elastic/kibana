/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { CreateCaseTemplateFields } from './template_fields';
import { renderWithTestingProviders } from '../../common/mock';

const mockUseFormData = jest.fn();
const mockUseFormContext = jest.fn();
jest.mock('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib', () => ({
  ...jest.requireActual('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib'),
  useFormData: (...args: unknown[]) => mockUseFormData(...args),
  useFormContext: () => mockUseFormContext(),
}));

const mockUseTemplateFormSync = jest.fn();
jest.mock('./use_template_form_sync', () => ({
  useTemplateFormSync: () => mockUseTemplateFormSync(),
}));

jest.mock('../templates_v2/field_types/field_types_registry', () => ({
  controlRegistry: {
    INPUT_TEXT: ({ name, label }: { name: string; label?: string }) => (
      <div data-test-subj={`control-${name}`}>{label ?? name}</div>
    ),
    INPUT_NUMBER: ({ name, label }: { name: string; label?: string }) => (
      <div data-test-subj={`control-${name}`}>{label ?? name}</div>
    ),
  },
}));

jest.mock('../field_library/hooks/use_resolved_fields', () => ({
  useResolvedFields: (fields: unknown[]) => ({
    resolvedFields: fields,
    isLoading: false,
  }),
}));

describe('CreateCaseTemplateFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFormContext.mockReturnValue({});
  });

  it('shows callout when no template is selected', () => {
    mockUseFormData.mockReturnValue([{ templateId: '' }]);
    mockUseTemplateFormSync.mockReturnValue({ template: undefined, isLoading: false });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(screen.getByText('Template not selected')).toBeInTheDocument();
    expect(
      screen.getByText('Select a template in the first step above to edit extended fields.')
    ).toBeInTheDocument();
  });

  it('renders extended fields header when template has empty fields array', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        definition: { name: 'Empty', fields: [] },
      },
      isLoading: false,
    });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(screen.getByText('Extended fields')).toBeInTheDocument();
  });

  it('shows callout when template definition has no fields property', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        definition: { name: 'No Fields' },
      },
      isLoading: false,
    });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(screen.getByText('Template not selected')).toBeInTheDocument();
  });

  it('returns null when loading', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({ template: undefined, isLoading: true });

    const { container } = renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(container.textContent).toBe('');
  });

  it('renders template fields when template is loaded with fields', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        definition: {
          name: 'Test Template',
          fields: [
            { name: 'hostname', control: 'INPUT_TEXT', type: 'keyword', label: 'Host Name' },
            { name: 'effort', control: 'INPUT_NUMBER', type: 'integer', label: 'Effort Level' },
          ],
        },
      },
      isLoading: false,
    });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(screen.getByText('Extended fields')).toBeInTheDocument();
    expect(screen.getByTestId('control-hostname')).toHaveTextContent('Host Name');
    expect(screen.getByTestId('control-effort')).toHaveTextContent('Effort Level');
  });

  it('skips fields with unregistered control types', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        definition: {
          name: 'Test Template',
          fields: [
            { name: 'known', control: 'INPUT_TEXT', type: 'keyword', label: 'Known' },
            { name: 'unknown', control: 'UNKNOWN_TYPE', type: 'keyword', label: 'Unknown' },
          ],
        },
      },
      isLoading: false,
    });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(screen.getByTestId('control-known')).toBeInTheDocument();
    expect(screen.queryByTestId('control-unknown')).not.toBeInTheDocument();
  });

  it('shows callout when templateId is undefined', () => {
    mockUseFormData.mockReturnValue([{ templateId: undefined }]);
    mockUseTemplateFormSync.mockReturnValue({ template: undefined, isLoading: false });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(screen.getByText('Template not selected')).toBeInTheDocument();
  });
});
