/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { parse as yamlParse } from 'yaml';
import type { YamlEditorFormValues } from './template_form';
import { TemplateFormLayout } from './template_form_layout';
import type { TemplateMetadata } from '../utils/template_metadata';
import type { CaseAssignees } from '../../../../common/types/domain_zod/user/v1';
import * as i18n from '../translations';

jest.mock('./template_form', () => ({
  TemplateYamlEditor: () => <div data-test-subj="template-yaml-editor" />,
}));

jest.mock('./template_preview', () => ({
  TemplatePreview: () => <div data-test-subj="template-preview" />,
}));

const capturedEditorLayoutProps: {
  onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
  onCaseDefaultChange?: (
    field: 'name' | 'description' | 'severity' | 'category' | 'tags' | 'assignees',
    value: string | string[] | CaseAssignees
  ) => void;
  onSettingsChange?: (settings: unknown) => void;
  onConnectorChange?: (connector: unknown) => void;
  metadata?: TemplateMetadata;
  onMetadataChange?: (metadata: TemplateMetadata) => void;
  yamlValue?: string;
} = {};

jest.mock('./template_editor_layout', () => ({
  TemplateEditorLayout: (props: {
    onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
    onCaseDefaultChange?: (
      field: 'name' | 'description' | 'severity' | 'category' | 'tags' | 'assignees',
      value: string | string[] | CaseAssignees
    ) => void;
    onSettingsChange?: (settings: unknown) => void;
    onConnectorChange?: (connector: unknown) => void;
    [key: string]: unknown;
  }) => {
    capturedEditorLayoutProps.onFieldDefaultChange = props.onFieldDefaultChange;
    capturedEditorLayoutProps.onCaseDefaultChange = props.onCaseDefaultChange;
    capturedEditorLayoutProps.onSettingsChange = props.onSettingsChange;
    capturedEditorLayoutProps.onConnectorChange = props.onConnectorChange;
    capturedEditorLayoutProps.metadata = props.metadata as TemplateMetadata;
    capturedEditorLayoutProps.onMetadataChange =
      props.onMetadataChange as typeof capturedEditorLayoutProps.onMetadataChange;
    capturedEditorLayoutProps.yamlValue = props.yamlValue as string;
    return (
      <>
        <div data-test-subj="template-yaml-editor" />
        <div data-test-subj="template-preview" />
      </>
    );
  },
}));

jest.mock('../../../common/navigation', () => ({
  useCasesTemplatesNavigation: () => ({
    navigateToCasesTemplates: jest.fn(),
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

const baseEditorYaml = `template_name: Template metadata
fields: []`;

const TestWrapper = ({
  onCreate,
  isEdit = false,
  isSaving = false,
  hasChanges = false,
  initialValue = baseEditorYaml,
}: {
  onCreate: (
    data: YamlEditorFormValues,
    metadata: TemplateMetadata,
    isEnabled: boolean
  ) => Promise<void>;
  isEdit?: boolean;
  isSaving?: boolean;
  hasChanges?: boolean;
  initialValue?: string;
}) => {
  const form = useForm<YamlEditorFormValues>({
    defaultValues: {
      definition: baseEditorYaml,
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
      initialValue={initialValue}
      initialMetadata={{ name: 'Template metadata', description: '', tags: [] }}
    />
  );
};

describe('TemplateFormLayout', () => {
  const mockOnCreate = jest.fn();
  const mockHandleReset = jest.fn();
  const mockSetStoredMetadataState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnCreate.mockResolvedValue(undefined);
    mockUseCasesLocalStorage.mockReturnValue([undefined, mockSetStoredMetadataState]);
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: baseEditorYaml,
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
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

  it('passes template metadata to the render panel layout', () => {
    render(<TestWrapper onCreate={mockOnCreate} />);

    expect(capturedEditorLayoutProps.metadata).toEqual({
      name: 'Template metadata',
      description: '',
      tags: [],
    });
  });

  it('normalizes stale settings guidance comments in persisted YAML drafts', () => {
    const mockYamlOnChange = jest.fn();
    const yamlWithLegacyComment = `template_name: Template metadata
# Case settings (sync alerts, extract observables) and the default connector are configured in the
# Settings tab of the preview panel, not here.
fields: []`;
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: yamlWithLegacyComment,
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });

    render(<TestWrapper onCreate={mockOnCreate} />);

    expect(capturedEditorLayoutProps.yamlValue).toContain(
      '# Optional case settings and connector blocks can also be authored in this YAML.'
    );
    expect(capturedEditorLayoutProps.yamlValue).toContain(
      '# Optional case settings and connector blocks can also be authored in this YAML.\nsettings:'
    );
    expect(capturedEditorLayoutProps.yamlValue).not.toContain(
      '# Settings tab of the preview panel, not here.'
    );

    expect(mockYamlOnChange).not.toHaveBeenCalled();
  });

  it('mirrors metadata edits into template-prefixed YAML keys', () => {
    const mockYamlOnChange = jest.fn();
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: baseEditorYaml,
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    render(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onMetadataChange?.({
        name: 'Updated template name',
        description: 'Updated template description',
        tags: ['meta-tag'],
      });
    });

    expect(mockSetStoredMetadataState).toHaveBeenCalledWith({
      templateId: undefined,
      name: 'Updated template name',
      description: 'Updated template description',
      tags: ['meta-tag'],
    });
    expect(mockYamlOnChange).toHaveBeenCalledTimes(1);
    const nextYaml = mockYamlOnChange.mock.calls[0][0] as string;
    const parsed = yamlParse(nextYaml) as Record<string, unknown>;
    expect(parsed.template_name).toEqual('Updated template name');
    expect(parsed.template_description).toEqual('Updated template description');
    expect(parsed.template_tags).toEqual(['meta-tag']);
  });

  it('keeps top-level case defaults in the editor buffer', () => {
    mockUseDebouncedYamlEdit.mockImplementation((_storageKey: string, initialYaml: string) => ({
      value: initialYaml,
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    }));

    render(
      <TestWrapper
        onCreate={mockOnCreate}
        initialValue={`name: Existing title
fields: []`}
      />
    );

    expect(capturedEditorLayoutProps.yamlValue).toContain('template_name: Template metadata');
    expect(capturedEditorLayoutProps.yamlValue).toContain('name: Existing title');
    expect(capturedEditorLayoutProps.yamlValue).toContain('assignees: []');
    expect(capturedEditorLayoutProps.yamlValue).toContain('settings:');
    expect(capturedEditorLayoutProps.yamlValue).toContain('syncAlerts: false');
    expect(capturedEditorLayoutProps.yamlValue).toContain('extractObservables: false');
    expect(capturedEditorLayoutProps.yamlValue).toContain(
      '# Optional case settings and connector blocks can also be authored in this YAML.\nsettings:'
    );
    expect(capturedEditorLayoutProps.yamlValue).not.toContain('case:');
  });

  it('mirrors case-default edits into top-level YAML keys', () => {
    const mockYamlOnChange = jest.fn();
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: baseEditorYaml,
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    render(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onCaseDefaultChange?.('name', 'Updated case title');
    });

    expect(mockYamlOnChange).toHaveBeenCalledTimes(1);
    const nextYaml = mockYamlOnChange.mock.calls[0][0] as string;
    const parsed = yamlParse(nextYaml) as Record<string, unknown>;
    expect(parsed.name).toEqual('Updated case title');
  });

  it('mirrors case-default assignees edits into top-level YAML keys', () => {
    const mockYamlOnChange = jest.fn();
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: baseEditorYaml,
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    render(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onCaseDefaultChange?.('assignees', [{ uid: 'analyst-1' }]);
    });

    expect(mockYamlOnChange).toHaveBeenCalledTimes(1);
    const nextYaml = mockYamlOnChange.mock.calls[0][0] as string;
    const parsed = yamlParse(nextYaml) as Record<string, unknown>;
    expect(parsed.assignees).toEqual([{ uid: 'analyst-1' }]);
  });

  it('keeps assignees key visible when assignees are cleared', () => {
    const mockYamlOnChange = jest.fn();
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: baseEditorYaml,
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    render(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onCaseDefaultChange?.('assignees', []);
    });

    // No-op edit because assignees is already initialized to [] in the buffer.
    expect(mockYamlOnChange).not.toHaveBeenCalled();
    const parsed = yamlParse(capturedEditorLayoutProps.yamlValue ?? '') as Record<string, unknown>;
    expect(parsed.assignees).toEqual([]);
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
      value: baseEditorYaml,
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

  it('mirrors settings edits into YAML keys', () => {
    const mockYamlOnChange = jest.fn();
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: baseEditorYaml,
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    render(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onSettingsChange?.({ syncAlerts: true });
    });

    expect(mockYamlOnChange).toHaveBeenCalledTimes(1);
    const nextYaml = mockYamlOnChange.mock.calls[0][0] as string;
    const parsed = yamlParse(nextYaml) as Record<string, unknown>;
    expect(parsed.settings).toEqual({ syncAlerts: true, extractObservables: false });
  });

  it('keeps settings keys in YAML when toggled from true to false', () => {
    const mockYamlOnChange = jest.fn();
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: `${baseEditorYaml}
settings:
  syncAlerts: true
  extractObservables: true`,
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    render(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onSettingsChange?.({
        syncAlerts: false,
        extractObservables: false,
      });
    });

    expect(mockYamlOnChange).toHaveBeenCalledTimes(1);
    const nextYaml = mockYamlOnChange.mock.calls[0][0] as string;
    const parsed = yamlParse(nextYaml) as Record<string, unknown>;
    expect(parsed.settings).toEqual({ syncAlerts: false, extractObservables: false });
  });

  it('mirrors connector edits into YAML keys', () => {
    const mockYamlOnChange = jest.fn();
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: baseEditorYaml,
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    render(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onConnectorChange?.({
        id: 'my-jira',
        type: '.jira',
        fields: null,
      });
    });

    expect(mockYamlOnChange).toHaveBeenCalledTimes(1);
    const nextYaml = mockYamlOnChange.mock.calls[0][0] as string;
    const parsed = yamlParse(nextYaml) as Record<string, unknown>;
    expect(parsed.connector).toEqual({ id: 'my-jira', type: '.jira', fields: null });
  });

  it('keeps legacy top-level case defaults at the top level before save', async () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'name: Legacy case title\nseverity: medium\nfields: []',
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });

    render(<TestWrapper onCreate={mockOnCreate} />);

    await userEvent.click(screen.getByTestId('saveTemplateHeaderButton'));

    await waitFor(() => expect(mockOnCreate).toHaveBeenCalled());
    const submitted = mockOnCreate.mock.calls[0][0] as { definition: string };
    const parsedDefinition = yamlParse(submitted.definition) as Record<string, unknown>;

    expect(parsedDefinition.name).toEqual('Legacy case title');
    expect(parsedDefinition.severity).toEqual('medium');
    expect(parsedDefinition).not.toHaveProperty('case');
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

    render(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.getByTestId('saveTemplateHeaderButton')).toBeDisabled();
  });

  it('renders back to templates button', () => {
    render(<TestWrapper onCreate={mockOnCreate} />);

    expect(screen.getByText(i18n.BACK_TO_TEMPLATES)).toBeInTheDocument();
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
    render(<TestWrapper onCreate={mockOnCreate} />);
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
