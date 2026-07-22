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
  TemplatePreview: () => <div data-test-subj="mockTemplatePreview">{'Preview'}</div>,
}));

jest.mock('./template_configuration_tab', () => ({
  TemplateConfigurationTab: () => (
    <div data-test-subj="mockConfigurationTab">{'Configuration'}</div>
  ),
}));

describe('TemplateEditorLayout', () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  const defaultProps = {
    isLoading: false,
    yamlValue: 'fields: []',
    onYamlChange: jest.fn(),
    isYamlSaving: false,
    isYamlSaved: false,
    previewWidth: 400,
    onPreviewWidthChange: jest.fn(),
    onSettingsChange: jest.fn(),
    onConnectorChange: jest.fn(),
    metadata: { name: 'Template', description: '', tags: [] },
    metadataErrors: {},
    onMetadataChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading spinner when isLoading is true', () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('mockYamlEditor')).not.toBeInTheDocument();
  });

  it('defaults to the Fields tab, showing the editor + preview and not mounting configuration', () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} />);

    expect(screen.getByTestId('mockYamlEditor')).toBeVisible();
    expect(screen.getByTestId('mockTemplatePreview')).toBeVisible();
    // Configuration is lazy-mounted on first visit (so its Monaco editors never initialize while
    // hidden), so it is not in the DOM until the tab is opened.
    expect(screen.queryByTestId('mockConfigurationTab')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Fields/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to the Configuration tab, showing config and hiding the YAML editor', async () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} />);

    await user.click(screen.getByRole('tab', { name: /Configuration/ }));

    expect(screen.getByTestId('mockConfigurationTab')).toBeVisible();
    // The YAML editor stays mounted but hidden — never shown beside the (unbound) configuration.
    expect(screen.getByTestId('mockYamlEditor')).not.toBeVisible();
  });

  it('keeps the Configuration tab mounted (hidden) after switching away, so it does not refetch', async () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} />);

    await user.click(screen.getByRole('tab', { name: /Configuration/ }));
    await user.click(screen.getByRole('tab', { name: /Fields/ }));

    // Once visited, the Configuration body stays in the DOM (just hidden) rather than remounting.
    expect(screen.getByTestId('mockConfigurationTab')).toBeInTheDocument();
    expect(screen.getByTestId('mockConfigurationTab')).not.toBeVisible();
  });

  it('renders resizable layout on the Fields tab', () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} />);

    expect(
      screen.getByTestId('templateEditorWithPreviewLayoutResizableContainer')
    ).toBeInTheDocument();
  });

  it('passes yamlValue to editor and calls onYamlChange on edit', async () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('fields: []');
    await user.type(textarea, 'x');
    expect(defaultProps.onYamlChange).toHaveBeenCalled();
  });

  it('shows saving / saved indicators', () => {
    const { rerender } = renderWithTestingProviders(
      <TemplateEditorLayout {...defaultProps} isYamlSaving={true} />
    );
    expect(screen.getByText(SAVING_TEXT)).toBeInTheDocument();

    rerender(<TemplateEditorLayout {...defaultProps} isYamlSaved={true} />);
    expect(screen.getByText(SAVED_TEXT)).toBeInTheDocument();
  });

  it('keeps the preview mounted on the Fields tab (it renders its own empty/invalid states)', () => {
    // Regression guard: the preview must never be conditionally unmounted based on YAML validity —
    // remounting on recovery leaves it stale until a tab switch (see TemplatePreview's own states).
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} yamlValue="name: [" />);

    expect(screen.getByTestId('mockTemplatePreview')).toBeInTheDocument();
  });

  it('shows a required-name indicator on the Configuration tab when the name is invalid', () => {
    renderWithTestingProviders(
      <TemplateEditorLayout
        {...defaultProps}
        metadata={{ name: '', description: '', tags: [] }}
        metadataErrors={{ name: 'Template name is required.' }}
      />
    );

    expect(screen.getByTestId('templateConfigTabRequiredIndicator')).toBeInTheDocument();
  });

  it('does not show the required-name indicator when the name is valid', () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} />);

    expect(screen.queryByTestId('templateConfigTabRequiredIndicator')).not.toBeInTheDocument();
  });

  it('shows an error indicator on the Fields tab when the fields definition is invalid', () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} fieldsHaveErrors={true} />);

    expect(screen.getByTestId('templateFieldsTabErrorIndicator')).toBeInTheDocument();
  });

  it('does not show the Fields tab error indicator when the fields definition is valid', () => {
    renderWithTestingProviders(<TemplateEditorLayout {...defaultProps} fieldsHaveErrors={false} />);

    expect(screen.queryByTestId('templateFieldsTabErrorIndicator')).not.toBeInTheDocument();
  });
});
