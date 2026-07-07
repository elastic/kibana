/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateEditorLayout } from './template_editor_layout';
import { renderWithTestingProviders } from '../../../common/mock';

const SAVING_TEXT = 'Saving...';
const SAVED_TEXT = 'Saved';
const PREVIEW_TEXT = 'Preview';

jest.mock('./template_form', () => ({
  TemplateYamlEditor: ({
    value,
    onChange,
    isSaving,
    isSaved,
  }: {
    value: string;
    onChange: (val: string) => void;
    isSaving: boolean;
    isSaved: boolean;
  }) => (
    <div data-test-subj="mockYamlEditor">
      <textarea value={value} onChange={(e) => onChange(e.target.value)} />
      {isSaving && <span>{SAVING_TEXT}</span>}
      {isSaved && <span>{SAVED_TEXT}</span>}
    </div>
  ),
}));

jest.mock('./template_preview', () => ({
  TemplatePreview: () => <div data-test-subj="mockTemplatePreview">{PREVIEW_TEXT}</div>,
}));

describe('TemplateEditorLayout', () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  const defaultProps = {
    isLoading: false,
    yamlValue: 'name: Test\nfields: []',
    onYamlChange: jest.fn(),
    isYamlSaving: false,
    isYamlSaved: false,
    previewWidth: 400,
    onPreviewWidthChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading spinner when isLoading is true', () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('mockYamlEditor')).not.toBeInTheDocument();
  });

  it('renders editor and preview when not loading', () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} />);

    expect(screen.getByTestId('mockYamlEditor')).toBeInTheDocument();
    expect(screen.getByTestId('mockTemplatePreview')).toBeInTheDocument();
  });

  it('renders resizable layout with correct test subject', () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} />);

    expect(
      screen.getByTestId('templateEditorWithPreviewLayoutResizableContainer')
    ).toBeInTheDocument();
  });

  it('passes yamlValue to editor', () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('name: Test\nfields: []');
  });

  it('calls onYamlChange when editor value changes', async () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'new value');

    expect(defaultProps.onYamlChange).toHaveBeenCalled();
  });

  it('shows saving indicator when isYamlSaving is true', () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} isYamlSaving={true} />);

    expect(screen.getByText(SAVING_TEXT)).toBeInTheDocument();
  });

  it('shows saved indicator when isYamlSaved is true', () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} isYamlSaved={true} />);

    expect(screen.getByText(SAVED_TEXT)).toBeInTheDocument();
  });

  it('does not render editor when loading', () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} isLoading={true} />);

    expect(screen.queryByTestId('mockYamlEditor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockTemplatePreview')).not.toBeInTheDocument();
  });
});
