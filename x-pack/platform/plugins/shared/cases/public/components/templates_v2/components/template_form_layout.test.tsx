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
import { parse as yamlParse } from 'yaml';
import type { YamlEditorFormValues } from './template_form';
import { TemplateFormLayout } from './template_form_layout';
import type { TemplateMetadata } from '../utils/template_metadata';
import type { CaseAssignees } from '../../../../common/types/domain_zod/user/v1';
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

// Template identity (name/description/tags) is no longer part of the YAML — the editor buffer only
// holds case defaults, settings, connector, and fields.
const baseEditorYaml = `name: Case default title
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

  it('passes template metadata to the render panel layout', () => {
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    expect(capturedEditorLayoutProps.metadata).toEqual({
      name: 'Template metadata',
      description: '',
      tags: [],
    });
  });

  it('replaces the legacy settings-guidance comment in persisted YAML drafts', () => {
    const mockYamlOnChange = jest.fn();
    const yamlWithLegacyComment = `name: Case default title
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

    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    expect(capturedEditorLayoutProps.yamlValue).not.toContain(
      '# Settings tab of the preview panel, not here.'
    );
    expect(mockYamlOnChange).not.toHaveBeenCalled();
  });

  it('does not write template identity into the YAML on metadata edits', () => {
    const mockYamlOnChange = jest.fn();
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: baseEditorYaml,
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onMetadataChange?.({
        name: 'Updated template name',
        description: 'Updated template description',
        tags: ['meta-tag'],
      });
    });

    // Metadata is drafted on the template (saved object attributes), never mirrored into the YAML.
    expect(mockSetStoredMetadataState).toHaveBeenCalledWith({
      templateId: undefined,
      name: 'Updated template name',
      description: 'Updated template description',
      tags: ['meta-tag'],
    });
    expect(mockYamlOnChange).not.toHaveBeenCalled();
  });

  it('never surfaces template identity keys in the editor buffer', () => {
    mockUseDebouncedYamlEdit.mockImplementation((_storageKey: string, initialYaml: string) => ({
      value: initialYaml,
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    }));

    renderWithTestingProviders(
      <TestWrapper
        onCreate={mockOnCreate}
        initialValue={`name: Existing title
fields: []`}
      />
    );

    // The editor "blueprint" buffer holds only case defaults + fields. Settings, connector, and
    // template identity are panel-owned and must NOT appear in the editor buffer.
    expect(capturedEditorLayoutProps.yamlValue).toContain('name: Existing title');
    expect(capturedEditorLayoutProps.yamlValue).toContain('fields:');
    expect(capturedEditorLayoutProps.yamlValue).not.toContain('settings:');
    expect(capturedEditorLayoutProps.yamlValue).not.toContain('connector:');
    expect(capturedEditorLayoutProps.yamlValue).not.toContain('template_name');
    expect(capturedEditorLayoutProps.yamlValue).not.toContain('template_description');
    expect(capturedEditorLayoutProps.yamlValue).not.toContain('template_tags');
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
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onCaseDefaultChange?.('name', 'Updated case title');
    });

    expect(mockYamlOnChange).toHaveBeenCalledTimes(1);
    const nextYaml = mockYamlOnChange.mock.calls[0][0] as string;
    const parsed = yamlParse(nextYaml) as Record<string, unknown>;
    expect(parsed.name).toEqual('Updated case title');
  });

  it('slots a newly added case default into render-panel order and keeps fields last', () => {
    const mockYamlOnChange = jest.fn();
    // A case default (severity) plus the custom `fields` block. We add `name`, which comes before
    // severity in the render panel; `fields` must stay at the bottom.
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: 'severity: high\nfields: []',
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} initialValue="fields: []" />);

    act(() => {
      capturedEditorLayoutProps.onCaseDefaultChange?.('name', 'Case title');
    });

    expect(mockYamlOnChange).toHaveBeenCalledTimes(1);
    const nextYaml = mockYamlOnChange.mock.calls[0][0] as string;
    // `name` lands before `severity` (render-panel order) and `fields` stays last.
    expect(Object.keys(yamlParse(nextYaml) as Record<string, unknown>)).toEqual([
      'name',
      'severity',
      'fields',
    ]);
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
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onCaseDefaultChange?.('assignees', [{ uid: 'analyst-1' }]);
    });

    expect(mockYamlOnChange).toHaveBeenCalledTimes(1);
    const nextYaml = mockYamlOnChange.mock.calls[0][0] as string;
    const parsed = yamlParse(nextYaml) as Record<string, unknown>;
    expect(parsed.assignees).toEqual([{ uid: 'analyst-1' }]);
  });

  it('keeps the assignees key present (as []) when assignees are cleared', () => {
    const mockYamlOnChange = jest.fn();
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: `name: Case default title
assignees:
  - uid: analyst-1
fields: []`,
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onCaseDefaultChange?.('assignees', []);
    });

    // Clearing writes an empty list rather than deleting the key, so it stays visible.
    expect(mockYamlOnChange).toHaveBeenCalledTimes(1);
    const parsed = yamlParse(mockYamlOnChange.mock.calls[0][0] as string) as Record<
      string,
      unknown
    >;
    expect(parsed.assignees).toEqual([]);
  });

  it('removes a cleared case-default scalar entirely rather than writing null', () => {
    const mockYamlOnChange = jest.fn();
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: `name: Case default title
description: Some default
severity: high
fields: []`,
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onCaseDefaultChange?.('description', '');
    });

    expect(mockYamlOnChange).toHaveBeenCalledTimes(1);
    const nextYaml = mockYamlOnChange.mock.calls[0][0] as string;
    // Cleared scalar is dropped from the YAML (no `null` placeholder).
    expect(nextYaml).not.toContain('null');
    const parsed = yamlParse(nextYaml) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty('description');
  });

  it('writes a case-default edit even after every key was deleted (empty buffer)', () => {
    const mockYamlOnChange = jest.fn();
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: '',
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onCaseDefaultChange?.('severity', 'high');
    });

    // An emptied buffer is recovered into a fresh map so the edit is not silently dropped.
    expect(mockYamlOnChange).toHaveBeenCalledTimes(1);
    const parsed = yamlParse(mockYamlOnChange.mock.calls[0][0] as string) as Record<
      string,
      unknown
    >;
    expect(parsed.severity).toEqual('high');
  });

  it('writes a case-default edit into a comment-only buffer while preserving the comment', () => {
    const mockYamlOnChange = jest.fn();
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: '# Custom fields rendered on the case when this template is applied.\n',
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onCaseDefaultChange?.('severity', 'high');
    });

    expect(mockYamlOnChange).toHaveBeenCalledTimes(1);
    const nextYaml = mockYamlOnChange.mock.calls[0][0] as string;
    expect(nextYaml).toContain(
      '# Custom fields rendered on the case when this template is applied.'
    );
    const parsed = yamlParse(nextYaml) as Record<string, unknown>;
    expect(parsed.severity).toEqual('high');
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
      value: baseEditorYaml,
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

  it('keeps settings changes out of the YAML editor buffer (panel-owned)', () => {
    const mockYamlOnChange = jest.fn();
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: baseEditorYaml,
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onSettingsChange?.({ syncAlerts: true, extractObservables: false });
    });

    // Under the Fields/Configuration split, settings are panel state — they must NOT rewrite the
    // editor buffer (which caused the reformat / "unsaved changes" / preview-reset bugs before).
    expect(mockYamlOnChange).not.toHaveBeenCalled();
  });

  it('keeps connector changes out of the YAML editor buffer (panel-owned)', () => {
    const mockYamlOnChange = jest.fn();
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: baseEditorYaml,
      onChange: mockYamlOnChange,
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    act(() => {
      capturedEditorLayoutProps.onConnectorChange?.({ id: 'my-jira', type: '.jira', fields: null });
    });

    expect(mockYamlOnChange).not.toHaveBeenCalled();
  });

  it('merges panel settings and connector into the definition on save', async () => {
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: `name: Case default title
description: ""
severity: low
category: ""
tags: []
assignees: []
fields: []`,
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });
    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    const jiraFields = { issueType: '10001', priority: 'High', parent: null };
    act(() => {
      capturedEditorLayoutProps.onSettingsChange?.({ syncAlerts: true, extractObservables: false });
      capturedEditorLayoutProps.onConnectorChange?.({
        id: 'my-jira',
        type: '.jira',
        fields: jiraFields,
      });
    });

    await userEvent.click(screen.getByTestId('saveTemplateHeaderButton'));

    await waitFor(() => expect(mockOnCreate).toHaveBeenCalled());
    const submitted = mockOnCreate.mock.calls[0][0] as { definition: string };
    const parsed = yamlParse(submitted.definition) as Record<string, unknown>;

    // The persisted definition is COMPLETE: the panel-owned settings + connector are merged back in.
    expect(parsed.settings).toEqual({ syncAlerts: true, extractObservables: false });
    expect(parsed.connector).toEqual({ id: 'my-jira', type: '.jira', fields: jiraFields });
  });

  it('canonicalizes a legacy top-level `title` into `name` before save', async () => {
    // A complete definition (all required blocks) authored with the legacy `title` key.
    mockUseDebouncedYamlEdit.mockReturnValue({
      value: `title: Legacy case title
description: ""
severity: medium
category: ""
tags: []
assignees: []
settings:
  syncAlerts: false
  extractObservables: false
connector:
  type: .none
  id: none
  fields: null
fields: []`,
      onChange: jest.fn(),
      handleReset: mockHandleReset,
      clearDraft: jest.fn(),
      isSaving: false,
      isSaved: false,
    });

    renderWithTestingProviders(<TestWrapper onCreate={mockOnCreate} />);

    await userEvent.click(screen.getByTestId('saveTemplateHeaderButton'));

    await waitFor(() => expect(mockOnCreate).toHaveBeenCalled());
    const submitted = mockOnCreate.mock.calls[0][0] as { definition: string };
    const parsedDefinition = yamlParse(submitted.definition) as Record<string, unknown>;

    expect(parsedDefinition.name).toEqual('Legacy case title');
    expect(parsedDefinition.severity).toEqual('medium');
    expect(parsedDefinition).not.toHaveProperty('title');
    expect(parsedDefinition).not.toHaveProperty('template_name');
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
