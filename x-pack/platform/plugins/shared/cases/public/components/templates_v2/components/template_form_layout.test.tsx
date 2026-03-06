/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import type { YamlEditorFormValues } from './template_form';
import { TemplateFormLayout } from './template_form_layout';
import * as i18n from '../translations';

jest.mock('./template_form', () => ({
  TemplateYamlEditor: () => <div data-test-subj="template-yaml-editor" />,
}));

jest.mock('./template_preview', () => ({
  TemplatePreview: () => <div data-test-subj="template-preview" />,
}));

jest.mock('../../../common/navigation', () => ({
  useCasesTemplatesNavigation: () => ({
    navigateToCasesTemplates: jest.fn(),
  }),
}));

jest.mock('../../../common/use_cases_local_storage', () => ({
  useCasesLocalStorage: () => [undefined, jest.fn()],
}));

const mockUseDebouncedYamlEdit = jest.fn();
jest.mock('../hooks/use_debounced_yaml_edit', () => ({
  useDebouncedYamlEdit: (...args: unknown[]) => mockUseDebouncedYamlEdit(...args),
}));

const TestWrapper = ({
  onCreate,
  isEdit = false,
  isSaving = false,
  hasChanges = false,
}: {
  onCreate: (data: YamlEditorFormValues) => Promise<void>;
  isEdit?: boolean;
  isSaving?: boolean;
  hasChanges?: boolean;
}) => {
  const form = useForm<YamlEditorFormValues>({
    defaultValues: {
      definition: 'name: Test',
    },
  });

  return (
    <TemplateFormLayout
      form={form}
      title={isEdit ? i18n.EDIT_TEMPLATE_TITLE : i18n.ADD_TEMPLATE_TITLE}
      onCreate={onCreate}
      isEdit={isEdit}
      isSaving={isSaving}
      storageKey="test-storage-key"
      initialValue="name: Test"
    />
  );
};

describe('TemplateFormLayout', () => {
  const mockOnCreate = jest.fn();
  const mockHandleReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnCreate.mockResolvedValue(undefined);
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Test',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      isSaving: false,
      isSaved: false,
    });
  });

  it('renders the layout with title', () => {
    render(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.getByText(i18n.ADD_TEMPLATE_TITLE)).toBeInTheDocument();
  });

  it('renders the YAML editor', () => {
    render(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.getByTestId('template-yaml-editor')).toBeInTheDocument();
  });

  it('renders the preview panel', () => {
    render(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.getByTestId('template-preview')).toBeInTheDocument();
  });

  it('renders create button for new template', () => {
    render(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.getByTestId('saveTemplateHeaderButton')).toHaveTextContent(i18n.CREATE_TEMPLATE);
  });

  it('renders save button for edit template', () => {
    render(<TestWrapper onCreate={mockOnCreate} isEdit />);

    expect(screen.getByTestId('saveTemplateHeaderButton')).toHaveTextContent(i18n.SAVE_TEMPLATE);
  });

  it('does not render reset button when no changes', () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Test',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      isSaving: false,
      isSaved: false,
    });

    render(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.queryByTestId('resetTemplateButton')).not.toBeInTheDocument();
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('renders reset button when there are changes', () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Modified',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      isSaving: false,
      isSaved: false,
    });

    render(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.getByTestId('resetTemplateButton')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('shows correct tooltip for reset button in create mode', async () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Modified',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      isSaving: false,
      isSaved: false,
    });

    render(<TestWrapper onCreate={mockOnCreate} />);

    const resetButton = screen.getByTestId('resetTemplateButton');
    await userEvent.hover(resetButton);

    expect(await screen.findByText(i18n.REVERT_TO_DEFAULT)).toBeInTheDocument();
  });

  it('shows correct tooltip for reset button in edit mode', async () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Modified',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      isSaving: false,
      isSaved: false,
    });

    render(<TestWrapper onCreate={mockOnCreate} isEdit />);

    const resetButton = screen.getByTestId('resetTemplateButton');
    await userEvent.hover(resetButton);

    expect(await screen.findByText(i18n.REVERT_TO_LAST_SAVED)).toBeInTheDocument();
  });

  it('shows confirmation modal when reset button is clicked', async () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Modified',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      isSaving: false,
      isSaved: false,
    });

    render(<TestWrapper onCreate={mockOnCreate} />);

    await userEvent.click(screen.getByTestId('resetTemplateButton'));

    expect(screen.getByText(i18n.REVERT_MODAL_TITLE)).toBeInTheDocument();
    expect(screen.getByText(i18n.REVERT_MODAL_BODY)).toBeInTheDocument();
  });

  it('calls handleReset when user confirms reset', async () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Modified',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      isSaving: false,
      isSaved: false,
    });

    render(<TestWrapper onCreate={mockOnCreate} />);

    await userEvent.click(screen.getByTestId('resetTemplateButton'));
    await userEvent.click(screen.getByText(i18n.REVERT_MODAL_CONFIRM));

    expect(mockHandleReset).toHaveBeenCalled();
  });

  it('closes modal without calling handleReset when user cancels', async () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Modified',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      isSaving: false,
      isSaved: false,
    });

    render(<TestWrapper onCreate={mockOnCreate} />);

    await userEvent.click(screen.getByTestId('resetTemplateButton'));
    await userEvent.click(screen.getByText(i18n.REVERT_MODAL_CANCEL));

    expect(mockHandleReset).not.toHaveBeenCalled();
    expect(screen.queryByText(i18n.REVERT_MODAL_TITLE)).not.toBeInTheDocument();
  });

  it('disables reset button when saving', () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Modified',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      isSaving: true,
      isSaved: false,
    });

    render(<TestWrapper onCreate={mockOnCreate} isSaving />);

    expect(screen.getByTestId('saveTemplateHeaderButton')).toBeDisabled();
    expect(screen.getByTestId('resetTemplateButton')).toBeDisabled();
  });

  it('renders back to templates button', () => {
    render(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.getByText(i18n.BACK_TO_TEMPLATES)).toBeInTheDocument();
  });
});
