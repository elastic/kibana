/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CaseUI } from '../../../../common';
import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';
import { FieldType } from '../../templates_v2/field_types/constants';
import { TemplateFields } from './template_fields';
import { renderWithTestingProviders } from '../../../common/mock';

const mockUseGetTemplate = jest.fn();
jest.mock('../../templates_v2/hooks/use_get_template', () => ({
  useGetTemplate: (...args: unknown[]) => mockUseGetTemplate(...args),
}));

const mockTemplate: ParsedTemplate = {
  templateId: 'template-1',
  name: 'Test Template',
  owner: 'securitySolution',
  templateVersion: 1,
  deletedAt: null,
  isLatest: true,
  latestVersion: 1,
  definition: {
    name: 'Test Template',
    fields: [
      { name: 'summary', control: FieldType.INPUT_TEXT, type: 'keyword', label: 'Summary' },
      { name: 'effort', control: FieldType.INPUT_NUMBER, type: 'integer', label: 'Effort' },
      { name: 'notes', control: FieldType.TEXTAREA, type: 'keyword', label: 'Notes' },
      {
        name: 'priority',
        control: FieldType.SELECT_BASIC,
        type: 'keyword',
        label: 'Priority',
        metadata: { options: ['low', 'medium', 'high'] },
      },
    ],
  },
};

const defaultCaseData = {
  template: { id: 'template-1', version: 1 },
  extendedFields: {
    summaryAsKeyword: 'test summary',
    effortAsInteger: 5,
    notesAsKeyword: 'some notes',
    priorityAsKeyword: 'medium',
  },
} as unknown as CaseUI;

const onUpdateField = jest.fn();

const defaultProps = {
  caseData: defaultCaseData,
  onUpdateField,
  isLoading: false,
  loadingKey: null,
};

describe('TemplateFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetTemplate.mockReturnValue({ data: mockTemplate, isLoading: false });
  });

  it('renders fields for each template definition field', () => {
    renderWithTestingProviders(<TemplateFields {...defaultProps} />);

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Effort')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
  });

  it('fetches the template with the correct id and version', () => {
    renderWithTestingProviders(<TemplateFields {...defaultProps} />);

    expect(mockUseGetTemplate).toHaveBeenCalledWith('template-1', 1);
  });

  it('renders nothing when template is loading', () => {
    mockUseGetTemplate.mockReturnValue({ data: undefined, isLoading: true });

    const { container } = renderWithTestingProviders(<TemplateFields {...defaultProps} />);

    expect(container.textContent).toBe('');
  });

  it('renders nothing when template has no fields', () => {
    mockUseGetTemplate.mockReturnValue({
      data: { ...mockTemplate, definition: { name: 'Empty', fields: [] } },
      isLoading: false,
    });

    const { container } = renderWithTestingProviders(<TemplateFields {...defaultProps} />);

    expect(container.textContent).toBe('');
  });

  it('falls back to field.name when label is not provided', () => {
    const templateWithoutLabels: ParsedTemplate = {
      ...mockTemplate,
      definition: {
        name: 'Test',
        fields: [{ name: 'hostname', control: FieldType.INPUT_TEXT, type: 'keyword' }],
      },
    };
    mockUseGetTemplate.mockReturnValue({ data: templateWithoutLabels, isLoading: false });

    renderWithTestingProviders(<TemplateFields {...defaultProps} />);

    expect(screen.getByText('hostname')).toBeInTheDocument();
  });

  it('returns null for unknown field control types', () => {
    const templateWithUnknown: ParsedTemplate = {
      ...mockTemplate,
      definition: {
        name: 'Test',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fields: [{ name: 'unknownField', control: 'UNKNOWN_TYPE' as any, type: 'keyword' }],
      },
    };
    mockUseGetTemplate.mockReturnValue({ data: templateWithUnknown, isLoading: false });

    renderWithTestingProviders(<TemplateFields {...defaultProps} />);

    expect(screen.queryByTestId('template-field-unknownField')).not.toBeInTheDocument();
  });

  it('uses data-test-subj based on field name', () => {
    renderWithTestingProviders(<TemplateFields {...defaultProps} />);

    expect(screen.getByTestId('template-field-summary')).toBeInTheDocument();
    expect(screen.getByTestId('template-field-effort')).toBeInTheDocument();
    expect(screen.getByTestId('template-field-notes')).toBeInTheDocument();
    expect(screen.getByTestId('template-field-priority')).toBeInTheDocument();
  });

  it('renders fields with empty inputs when extended field values are absent', () => {
    const caseWithNoExtended = {
      ...defaultCaseData,
      extendedFields: {},
    } as unknown as CaseUI;

    renderWithTestingProviders(<TemplateFields {...defaultProps} caseData={caseWithNoExtended} />);

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Effort')).toBeInTheDocument();
  });

  it('renders the Save button', () => {
    renderWithTestingProviders(<TemplateFields {...defaultProps} />);

    expect(screen.getByTestId('template-fields-save')).toBeInTheDocument();
  });

  it('calls onUpdateField with all field values when Save is clicked', async () => {
    renderWithTestingProviders(<TemplateFields {...defaultProps} />);

    await userEvent.click(screen.getByTestId('template-fields-save'));

    await waitFor(() => {
      expect(onUpdateField).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'extended_fields' })
      );
    });
  });

  it('shows loading state on Save button when isLoading is true', () => {
    renderWithTestingProviders(<TemplateFields {...defaultProps} isLoading={true} />);

    const saveButton = screen.getByTestId('template-fields-save');
    expect(saveButton).toBeDisabled();
  });
});
