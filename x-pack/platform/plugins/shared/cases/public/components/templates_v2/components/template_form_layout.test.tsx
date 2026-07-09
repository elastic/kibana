/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createEvent, fireEvent, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import type { YamlEditorFormValues } from './template_form';
import { TemplateFormLayout } from './template_form_layout';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { renderWithTestingProviders } from '../../../common/mock';
import * as i18n from '../translations';

jest.mock('./template_form', () => ({
  TemplateYamlEditor: () => <div data-test-subj="template-yaml-editor" />,
}));

jest.mock('./template_preview', () => ({
  TemplatePreview: () => <div data-test-subj="template-preview" />,
}));

const capturedEditorLayoutProps: {
  onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
  onSettingsChange?: (settings: unknown) => void;
  onConnectorChange?: (connector: unknown) => void;
} = {};

jest.mock('./template_editor_layout', () => ({
  TemplateEditorLayout: (props: {
    onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
    onSettingsChange?: (settings: unknown) => void;
    onConnectorChange?: (connector: unknown) => void;
    [key: string]: unknown;
  }) => {
    capturedEditorLayoutProps.onFieldDefaultChange = props.onFieldDefaultChange;
    capturedEditorLayoutProps.onSettingsChange = props.onSettingsChange;
    capturedEditorLayoutProps.onConnectorChange = props.onConnectorChange;
    return (
      <>
        <div data-test-subj="template-yaml-editor" />
        <div data-test-subj="template-preview" />
      </>
    );
  },
}));

const mockNavigateToCasesTemplates = jest.fn();

jest.mock('../../../common/navigation', () => ({
  useCasesTemplatesNavigation: () => ({
    getCasesTemplatesUrl: jest.fn().mockReturnValue('/templates'),
    navigateToCasesTemplates: mockNavigateToCasesTemplates,
  }),
}));

const mockUseCasesLocalStorage = jest.fn(
  (..._args: unknown[]): [unknown, (value: unknown) => void] => [undefined, jest.fn()]
);
jest.mock('../../../common/use_cases_local_storage', () => ({
  useCasesLocalStorage: (...args: unknown[]) => mockUseCasesLocalStorage(...args),
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
  const mockSetStoredFormState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnCreate.mockResolvedValue(undefined);
    mockUseCasesLocalStorage.mockReturnValue([undefined, mockSetStoredFormState]);
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Test',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
  });

  it('renders the layout with title', () => {
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      i18n.ADD_TEMPLATE_TITLE
    );
  });

  it('renders the YAML editor', () => {
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.getByTestId('template-yaml-editor')).toBeInTheDocument();
  });

  it('renders the preview panel', () => {
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.getByTestId('template-preview')).toBeInTheDocument();
  });

  it('renders create button for new template', () => {
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.getByTestId('saveTemplateHeaderButton')).toHaveTextContent(i18n.CREATE_TEMPLATE);
  });

  it('renders save button for edit template', () => {
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} isEdit />);

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

    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.queryByTestId('resetTemplateButton')).not.toBeInTheDocument();
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('renders reset button when there are changes', async () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Modified',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      isSaving: false,
      isSaved: false,
    });

    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    await openAppMenuOverflow();

    expect(await screen.findByTestId('resetTemplateButton')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('renders reset button when only the Settings tab has changes', async () => {
    // YAML buffer is unchanged (matches initialValue), but a persisted Settings-tab draft differs
    // from the template's defaults — this should still count as unsaved changes.
    mockUseCasesLocalStorage.mockReturnValue([
      { templateId: undefined, settings: { syncAlerts: false }, connector: undefined },
      jest.fn(),
    ]);

    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    await openAppMenuOverflow();

    expect(await screen.findByTestId('resetTemplateButton')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('persists Settings-tab changes to the draft', () => {
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onSettingsChange?.({ syncAlerts: false });
    });

    expect(mockSetStoredFormState).toHaveBeenCalledWith({
      templateId: undefined,
      settings: { syncAlerts: false },
      connector: undefined,
    });
  });

  it('reverts the Settings-tab draft when reset is confirmed', async () => {
    // A differing persisted draft makes the reset button available.
    mockUseCasesLocalStorage.mockReturnValue([
      { templateId: undefined, settings: { syncAlerts: false }, connector: undefined },
      mockSetStoredFormState,
    ]);

    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    await openAppMenuOverflow();
    await userEvent.click(await screen.findByTestId('resetTemplateButton'));
    await userEvent.click(screen.getByText(i18n.REVERT_MODAL_CONFIRM));

    expect(mockHandleReset).toHaveBeenCalled();
    expect(mockSetStoredFormState).toHaveBeenCalledWith({
      templateId: undefined,
      settings: undefined,
      connector: undefined,
    });
  });

  it('resets the Settings-tab draft on successful create', async () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Test\nfields: []',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });

    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    await userEvent.click(screen.getByTestId('saveTemplateHeaderButton'));

    await waitFor(() => expect(mockOnCreate).toHaveBeenCalled());
    expect(mockSetStoredFormState).toHaveBeenCalledWith({
      templateId: undefined,
      settings: undefined,
      connector: undefined,
    });
  });

  it('shows revert action in create mode', async () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Modified',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      isSaving: false,
      isSaved: false,
    });

    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    await openAppMenuOverflow();

    expect(await screen.findByTestId('resetTemplateButton')).toHaveTextContent(
      i18n.REVERT_TO_DEFAULT
    );
  });

  it('shows revert action in edit mode', async () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Modified',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      isSaving: false,
      isSaved: false,
    });

    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} isEdit />);

    await openAppMenuOverflow();

    expect(await screen.findByTestId('resetTemplateButton')).toHaveTextContent(
      i18n.REVERT_TO_LAST_SAVED
    );
  });

  it('shows confirmation modal when reset button is clicked', async () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Modified',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      isSaving: false,
      isSaved: false,
    });

    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    await openAppMenuOverflow();
    await userEvent.click(await screen.findByTestId('resetTemplateButton'));

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

    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    await openAppMenuOverflow();
    await userEvent.click(await screen.findByTestId('resetTemplateButton'));
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

    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    await openAppMenuOverflow();
    await userEvent.click(await screen.findByTestId('resetTemplateButton'));
    await userEvent.click(screen.getByText(i18n.REVERT_MODAL_CANCEL));

    expect(mockHandleReset).not.toHaveBeenCalled();
    expect(screen.queryByText(i18n.REVERT_MODAL_TITLE)).not.toBeInTheDocument();
  });

  it('disables reset button when saving', async () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Modified',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      isSaving: true,
      isSaved: false,
    });

    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} isSaving />);

    expect(screen.getByTestId('saveTemplateHeaderButton')).toBeDisabled();
    await openAppMenuOverflow();
    expect(await screen.findByTestId('resetTemplateButton')).toBeDisabled();
  });

  it('disables save button when template definition is invalid', () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: `name: Test
fields:
  - name: effort
    control: INPUT_NUMBER
    label: Effort
    type: keyword
`,
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      isSaving: false,
      isSaved: false,
    });

    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.getByTestId('saveTemplateHeaderButton')).toBeDisabled();
  });

  it('renders back to templates button', () => {
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toBeInTheDocument();
  });

  it('navigates to templates and prevents the anchor default navigation on back click', () => {
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    const backButton = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back);
    const clickEvent = createEvent.click(backButton);
    fireEvent(backButton, clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(mockNavigateToCasesTemplates).toHaveBeenCalled();
  });
});

describe('handleFieldDefaultChange', () => {
  const mockOnCreate = jest.fn();
  const mockHandleReset = jest.fn();
  let onYamlChange: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedEditorLayoutProps.onFieldDefaultChange = undefined;
    mockOnCreate.mockResolvedValue(undefined);
    onYamlChange = jest.fn();
  });

  const setupWithYaml = (yaml: string) => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: yaml,
      onChange: onYamlChange,
      handleReset: mockHandleReset,
      isSaving: false,
      isSaved: false,
    });
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);
  };

  const checkboxYaml = `name: Test
fields:
  - name: systems
    control: CHECKBOX_GROUP
    type: keyword
    metadata:
      options:
        - api
        - ui
        - database
`;

  it('writes a YAML array when control is CHECKBOX_GROUP', () => {
    setupWithYaml(checkboxYaml);

    act(() => {
      capturedEditorLayoutProps.onFieldDefaultChange?.(
        'systems',
        '["api","database"]',
        'CHECKBOX_GROUP'
      );
    });

    expect(onYamlChange).toHaveBeenCalledTimes(1);
    const updatedYaml = onYamlChange.mock.calls[0][0] as string;
    expect(updatedYaml).toContain('- api');
    expect(updatedYaml).toContain('- database');
    expect(updatedYaml).not.toContain('["api","database"]');
  });

  it('writes an empty YAML sequence for an empty CHECKBOX_GROUP selection', () => {
    setupWithYaml(checkboxYaml);

    act(() => {
      capturedEditorLayoutProps.onFieldDefaultChange?.('systems', '[]', 'CHECKBOX_GROUP');
    });

    expect(onYamlChange).toHaveBeenCalledTimes(1);
    const updatedYaml = onYamlChange.mock.calls[0][0] as string;
    expect(updatedYaml).toContain('default: []');
  });

  it('falls back to empty array when CHECKBOX_GROUP value is invalid JSON', () => {
    setupWithYaml(checkboxYaml);

    act(() => {
      capturedEditorLayoutProps.onFieldDefaultChange?.('systems', 'not-json', 'CHECKBOX_GROUP');
    });

    expect(onYamlChange).toHaveBeenCalledTimes(1);
    const updatedYaml = onYamlChange.mock.calls[0][0] as string;
    expect(updatedYaml).toContain('default: []');
  });

  it('does not call onYamlChange when the field does not exist in the YAML', () => {
    setupWithYaml(checkboxYaml);

    act(() => {
      capturedEditorLayoutProps.onFieldDefaultChange?.('nonexistent', '["api"]', 'CHECKBOX_GROUP');
    });

    expect(onYamlChange).not.toHaveBeenCalled();
  });

  it('parses the value as a number for INPUT_NUMBER control', () => {
    setupWithYaml(`name: Test
fields:
  - name: score
    control: INPUT_NUMBER
    type: integer
`);

    act(() => {
      capturedEditorLayoutProps.onFieldDefaultChange?.('score', '42', 'INPUT_NUMBER');
    });

    expect(onYamlChange).toHaveBeenCalledTimes(1);
    const updatedYaml = onYamlChange.mock.calls[0][0] as string;
    expect(updatedYaml).toContain('default: 42');
    expect(updatedYaml).not.toContain("default: '42'");
  });

  it('removes the default key when INPUT_NUMBER value is cleared to empty string', () => {
    setupWithYaml(`name: Test
fields:
  - name: score
    control: INPUT_NUMBER
    type: integer
    metadata:
      default: 42
`);

    act(() => {
      capturedEditorLayoutProps.onFieldDefaultChange?.('score', '', 'INPUT_NUMBER');
    });

    expect(onYamlChange).toHaveBeenCalledTimes(1);
    const updatedYaml = onYamlChange.mock.calls[0][0] as string;
    expect(updatedYaml).not.toContain('default');
  });

  it('trims whitespace from INPUT_NUMBER value before parsing', () => {
    setupWithYaml(`name: Test
fields:
  - name: score
    control: INPUT_NUMBER
    type: integer
`);

    act(() => {
      capturedEditorLayoutProps.onFieldDefaultChange?.('score', '  42  ', 'INPUT_NUMBER');
    });

    expect(onYamlChange).toHaveBeenCalledTimes(1);
    const updatedYaml = onYamlChange.mock.calls[0][0] as string;
    expect(updatedYaml).toContain('default: 42');
  });

  it('preserves whitespace in INPUT_TEXT value', () => {
    setupWithYaml(`name: Test
fields:
  - name: summary
    control: INPUT_TEXT
    type: keyword
`);

    act(() => {
      capturedEditorLayoutProps.onFieldDefaultChange?.('summary', '  hello  ', 'INPUT_TEXT');
    });

    expect(onYamlChange).toHaveBeenCalledTimes(1);
    const updatedYaml = onYamlChange.mock.calls[0][0] as string;
    expect(updatedYaml).toContain('default: "  hello  "');
  });

  it('passes the string value unchanged for INPUT_TEXT control', () => {
    setupWithYaml(`name: Test
fields:
  - name: summary
    control: INPUT_TEXT
    type: keyword
`);

    act(() => {
      capturedEditorLayoutProps.onFieldDefaultChange?.('summary', 'my default text', 'INPUT_TEXT');
    });

    expect(onYamlChange).toHaveBeenCalledTimes(1);
    const updatedYaml = onYamlChange.mock.calls[0][0] as string;
    expect(updatedYaml).toContain('default: my default text');
  });

  it('passes the string value unchanged for RADIO_GROUP control', () => {
    setupWithYaml(`name: Test
fields:
  - name: env
    control: RADIO_GROUP
    type: keyword
    metadata:
      options:
        - staging
        - production
`);

    act(() => {
      capturedEditorLayoutProps.onFieldDefaultChange?.('env', 'production', 'RADIO_GROUP');
    });

    expect(onYamlChange).toHaveBeenCalledTimes(1);
    const updatedYaml = onYamlChange.mock.calls[0][0] as string;
    expect(updatedYaml).toContain('default: production');
  });
});
