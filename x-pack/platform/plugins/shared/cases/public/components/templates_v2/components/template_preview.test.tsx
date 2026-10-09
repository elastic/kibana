/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { TemplatePreview } from './template_preview';
import { TemplateFieldRenderer } from '../field_types/field_renderer';

const mockCaseDefaultsForm = jest.fn((_props?: unknown) => (
  <div data-test-subj="template-case-defaults-form" />
));

jest.mock('../field_types/field_renderer', () => ({
  TemplateFieldRenderer: jest.fn(() => <div data-test-subj="template-field-renderer" />),
}));
jest.mock('./template_case_defaults_form', () => ({
  TemplateCaseDefaultsForm: (props: unknown) => mockCaseDefaultsForm(props),
}));

jest.mock('../../cases_context/use_cases_context', () => ({
  useCasesContext: () => ({ owner: ['securitySolution'] }),
}));

// TemplatePreview renders TemplateMetadataPreview, which calls useCasesFeatures (sync-alerts gate).
// Mock it so the preview doesn't need the full cases features/permissions context.
jest.mock('../../../common/use_cases_features', () => ({
  useCasesFeatures: () => ({ isSyncAlertsEnabled: true }),
}));

describe('CreateTemplatePreview', () => {
  const renderPreview = (
    definition: string,
    onCaseDefaultChange?: (field: string, value: string | string[] | Array<{ uid: string }>) => void
  ) => {
    const Wrapper = () => {
      const form = useForm({
        defaultValues: {
          definition: '',
        },
      });

      useEffect(() => {
        form.setValue('definition', definition);
      }, [form]);

      return (
        <FormProvider {...form}>
          <TemplatePreview onCaseDefaultChange={onCaseDefaultChange} />
        </FormProvider>
      );
    };

    return render(<Wrapper />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the field renderer for valid YAML', () => {
    renderPreview(
      `name: Preview\nfields:\n  - control: INPUT_TEXT\n    name: field_one\n    type: keyword`
    );

    expect(screen.getByTestId('template-field-renderer')).toBeInTheDocument();
    expect(screen.getByTestId('template-case-defaults-form')).toBeInTheDocument();
    expect(TemplateFieldRenderer).toHaveBeenCalledWith(
      expect.objectContaining({
        parsedTemplate: expect.objectContaining({
          name: 'Preview',
          fields: expect.any(Array),
        }),
      }),
      expect.any(Object)
    );
  });

  it('passes the case-default edit handler to the case defaults form', () => {
    const onCaseDefaultChange = jest.fn();
    renderPreview(
      `name: Preview\nfields:\n  - control: INPUT_TEXT\n    name: field_one\n    type: keyword`,
      onCaseDefaultChange
    );

    expect(mockCaseDefaultsForm).toHaveBeenCalledWith(
      expect.objectContaining({
        onChange: onCaseDefaultChange,
      })
    );
  });
  it('shows an actionable error state when the YAML is invalid', () => {
    renderPreview('name: [');

    expect(screen.getByTestId('templatePreviewError')).toBeInTheDocument();
    expect(screen.getByText("Can't preview this template")).toBeInTheDocument();
    expect(screen.queryByTestId('template-field-renderer')).not.toBeInTheDocument();
    expect(TemplateFieldRenderer).not.toHaveBeenCalled();
  });

  it('shows a neutral empty state when the definition is empty', () => {
    renderPreview('   ');

    expect(screen.getByTestId('templatePreviewEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('templatePreviewError')).not.toBeInTheDocument();
    expect(TemplateFieldRenderer).not.toHaveBeenCalled();
  });
  it('keeps top-level case defaults in the preview model', () => {
    renderPreview(
      `name: Legacy title\ndescription: Legacy description\nseverity: low\nfields:\n  - control: INPUT_TEXT\n    name: field_one\n    type: keyword`
    );

    expect(TemplateFieldRenderer).toHaveBeenCalledWith(
      expect.objectContaining({
        parsedTemplate: expect.objectContaining({
          name: 'Legacy title',
          description: 'Legacy description',
          severity: 'low',
        }),
      }),
      expect.any(Object)
    );
  });
});
