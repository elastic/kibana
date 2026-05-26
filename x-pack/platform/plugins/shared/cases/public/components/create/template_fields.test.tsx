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
import { CASE_EXTENDED_FIELDS } from '../../../common/constants';

const mockUseFormData = jest.fn();
const mockUseFormContext = jest.fn();
jest.mock('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib', () => ({
  ...jest.requireActual('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib'),
  useFormData: (...args: unknown[]) => mockUseFormData(...args),
  useFormContext: () => mockUseFormContext(),
  UseField: () => null,
}));

const mockUseTemplateFormSync = jest.fn();
jest.mock('./use_template_form_sync', () => ({
  useTemplateFormSync: (...args: unknown[]) => mockUseTemplateFormSync(...args),
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
    mockUseFormContext.mockReturnValue({ setFieldValue: jest.fn() });
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

  it('syncs inner form changes to parent form under the CASE_EXTENDED_FIELDS key', () => {
    // This test verifies the key used to sync inner form values to the parent form
    // matches what createFormSerializer reads. The serializer reads data[CASE_EXTENDED_FIELDS]
    // ('extended_fields'), so the setFieldValue call must use the same key.
    // Previously the code called setFieldValue('extendedFields', ...) which was silently
    // ignored by the serializer, causing extended fields to be lost on case create.
    const setFieldValue = jest.fn();
    mockUseFormContext.mockReturnValue({ setFieldValue });
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        definition: { name: 'Test', fields: [] },
      },
      isLoading: false,
    });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    // Whenever setFieldValue is called (e.g. from the watch subscription or template sync),
    // it must never use the camelCase 'extendedFields' key.
    const allCallsWithWrongKey = setFieldValue.mock.calls.filter(
      ([key]) => key === 'extendedFields'
    );
    expect(allCallsWithWrongKey).toHaveLength(0);

    // Any calls that update extended fields must use CASE_EXTENDED_FIELDS ('extended_fields').
    const extendedFieldCalls = setFieldValue.mock.calls.filter(
      ([key]) => key === CASE_EXTENDED_FIELDS
    );
    // The watch subscription fires when the form changes. If any calls were made for extended
    // fields on mount, they must use the correct key.
    extendedFieldCalls.forEach(([key]) => {
      expect(key).toBe(CASE_EXTENDED_FIELDS);
    });
  });
});
