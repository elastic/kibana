/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFormContext } from 'react-hook-form';
import { RuleForm } from './rule_form';
import { RULE_FORM_ID } from './constants';
import { createFormWrapper, createMockServices } from '../test_utils';

// Mock RulePreviewPanel to avoid rendering the full preview
jest.mock('./fields/rule_preview_panel', () => ({
  RulePreviewPanel: () => <div data-test-subj="mockRulePreviewPanel">Preview Panel</div>,
}));

// Mock NameField to avoid rendering full field setup
jest.mock('./fields/name_field', () => ({
  NameField: () => <div data-test-subj="mockNameField">Rule Name</div>,
}));

jest.mock('./error_callout', () => ({
  ErrorCallOut: () => <div data-test-subj="mockErrorCallOut">Error CallOut</div>,
}));
const mockCreateRule = jest.fn();
const mockUpdateRule = jest.fn();
jest.mock('./hooks/use_create_rule', () => ({
  useCreateRule: () => ({
    createRule: mockCreateRule,
    isLoading: false,
  }),
}));
jest.mock('./hooks/use_update_rule', () => ({
  useUpdateRule: () => ({
    updateRule: mockUpdateRule,
    isLoading: false,
  }),
}));

// Mock GuiRuleForm to avoid rendering complex form fields
jest.mock('./gui_rule_form', () => ({
  GuiRuleForm: ({
    onSubmit,
    includeQueryEditor,
  }: {
    onSubmit: () => void;
    includeQueryEditor?: boolean;
  }) => (
    <form
      id="ruleV2Form"
      data-test-subj="mockGuiRuleForm"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div>GUI Form</div>
      {includeQueryEditor && <div>Query Editor</div>}
    </form>
  ),
}));

// Mock YamlRuleForm to avoid monaco editor setup. The mock binds the textarea
// to the lifted yamlText/setYamlText props so toggle-persistence is observable.
jest.mock('./yaml_rule_form', () => ({
  YamlRuleForm: ({
    onSubmit,
    isDisabled,
    yamlText,
    setYamlText,
  }: {
    onSubmit: () => void;
    isDisabled?: boolean;
    yamlText: string;
    setYamlText: (yaml: string) => void;
  }) => (
    <form
      id="ruleV2Form"
      data-test-subj="mockYamlRuleForm"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div>YAML Form</div>
      <textarea
        data-test-subj="ruleV2FormYamlEditor"
        disabled={isDisabled}
        value={yamlText}
        onChange={(e) => setYamlText(e.target.value)}
      />
    </form>
  ),
}));

describe('RuleForm', () => {
  const mockServices = createMockServices();

  const defaultProps = {
    services: mockServices,
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders GUI form by default', () => {
      render(<RuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('mockGuiRuleForm')).toBeInTheDocument();
      expect(screen.getByText('GUI Form')).toBeInTheDocument();
    });

    it('renders ErrorCallOut from RuleFormContent', () => {
      render(<RuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('mockErrorCallOut')).toBeInTheDocument();
    });

    it('passes includeQueryEditor to GuiRuleForm', () => {
      render(<RuleForm {...defaultProps} includeQueryEditor />, { wrapper: createFormWrapper() });

      expect(screen.getByText('Query Editor')).toBeInTheDocument();
    });

    it('does not show query editor when includeQueryEditor is false', () => {
      render(<RuleForm {...defaultProps} includeQueryEditor={false} />, {
        wrapper: createFormWrapper(),
      });

      expect(screen.queryByText('Query Editor')).not.toBeInTheDocument();
    });

    it('defaults includeQueryEditor to true', () => {
      render(<RuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      expect(screen.getByText('Query Editor')).toBeInTheDocument();
    });
  });

  describe('YAML mode toggle', () => {
    it('does not show edit mode toggle when includeYaml is false', () => {
      render(<RuleForm {...defaultProps} includeYaml={false} />, { wrapper: createFormWrapper() });

      expect(screen.queryByTestId('ruleV2FormEditModeToggle')).not.toBeInTheDocument();
    });

    it('shows edit mode toggle when includeYaml is true', () => {
      render(<RuleForm {...defaultProps} includeYaml />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('ruleV2FormEditModeToggle')).toBeInTheDocument();
      expect(screen.getByTestId('ruleV2FormEditModeFormButton')).toBeInTheDocument();
      expect(screen.getByTestId('ruleV2FormEditModeYamlButton')).toBeInTheDocument();
    });

    it('shows Configure Rule Behavior heading when includeYaml is true', () => {
      render(<RuleForm {...defaultProps} includeYaml />, { wrapper: createFormWrapper() });

      expect(screen.getByText('Configure Rule Behavior')).toBeInTheDocument();
    });

    it('does not show Configure Rule Behavior heading when includeYaml is false', () => {
      render(<RuleForm {...defaultProps} includeYaml={false} />, { wrapper: createFormWrapper() });

      expect(screen.queryByText('Configure Rule Behavior')).not.toBeInTheDocument();
    });

    it('starts in form mode by default', () => {
      render(<RuleForm {...defaultProps} includeYaml />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('mockGuiRuleForm')).toBeInTheDocument();
      expect(screen.queryByTestId('mockYamlRuleForm')).not.toBeInTheDocument();
    });

    it('switches to YAML mode when YAML toggle is clicked', async () => {
      const user = userEvent.setup();

      render(<RuleForm {...defaultProps} includeYaml />, { wrapper: createFormWrapper() });

      await user.click(screen.getByTestId('ruleV2FormEditModeYamlButton'));

      expect(screen.getByTestId('mockYamlRuleForm')).toBeInTheDocument();
      expect(screen.queryByTestId('mockGuiRuleForm')).not.toBeInTheDocument();
    });

    it('switches back to form mode when Form toggle is clicked', async () => {
      const user = userEvent.setup();

      render(<RuleForm {...defaultProps} includeYaml />, { wrapper: createFormWrapper() });

      // Switch to YAML
      await user.click(screen.getByTestId('ruleV2FormEditModeYamlButton'));
      expect(screen.getByTestId('mockYamlRuleForm')).toBeInTheDocument();

      // Switch back to Form
      await user.click(screen.getByTestId('ruleV2FormEditModeFormButton'));
      expect(screen.getByTestId('mockGuiRuleForm')).toBeInTheDocument();
      expect(screen.queryByTestId('mockYamlRuleForm')).not.toBeInTheDocument();
    });

    it('disables toggle when isDisabled is true', () => {
      render(<RuleForm {...defaultProps} includeYaml isDisabled />, {
        wrapper: createFormWrapper(),
      });

      expect(screen.getByTestId('ruleV2FormEditModeFormButton')).toBeDisabled();
      expect(screen.getByTestId('ruleV2FormEditModeYamlButton')).toBeDisabled();
    });

    it('initializes the YAML buffer from current form values', async () => {
      const user = userEvent.setup();

      render(<RuleForm {...defaultProps} includeYaml />, {
        wrapper: createFormWrapper({
          metadata: { name: 'Initial Rule', enabled: true },
        }),
      });

      await user.click(screen.getByTestId('ruleV2FormEditModeYamlButton'));

      const editor = screen.getByTestId('ruleV2FormYamlEditor') as HTMLTextAreaElement;
      expect(editor.value).toContain('Initial Rule');
    });

    it('regenerates YAML when metadata.name changes (not just query)', async () => {
      const user = userEvent.setup();

      const NameWriter = () => {
        const { setValue } = useFormContext();
        return (
          <button
            type="button"
            data-test-subj="testSetName"
            onClick={() => setValue('metadata.name', 'renamed-rule', { shouldDirty: true })}
          >
            set name
          </button>
        );
      };

      render(
        <>
          <RuleForm {...defaultProps} includeYaml />
          <NameWriter />
        </>,
        { wrapper: createFormWrapper({ metadata: { name: 'original-name', enabled: true } }) }
      );

      await user.click(screen.getByTestId('ruleV2FormEditModeYamlButton'));
      const initialEditor = screen.getByTestId('ruleV2FormYamlEditor') as HTMLTextAreaElement;
      expect(initialEditor.value).toContain('original-name');
      expect(initialEditor.value).not.toContain('renamed-rule');

      await user.click(screen.getByTestId('testSetName'));

      await waitFor(() => {
        const editor = screen.getByTestId('ruleV2FormYamlEditor') as HTMLTextAreaElement;
        expect(editor.value).toContain('renamed-rule');
      });
    });

    it('regenerates YAML when metadata.tags changes', async () => {
      const user = userEvent.setup();

      const TagsWriter = () => {
        const { setValue } = useFormContext();
        return (
          <button
            type="button"
            data-test-subj="testSetTags"
            onClick={() => setValue('metadata.tags', ['critical', 'edge'], { shouldDirty: true })}
          >
            set tags
          </button>
        );
      };

      render(
        <>
          <RuleForm {...defaultProps} includeYaml />
          <TagsWriter />
        </>,
        { wrapper: createFormWrapper() }
      );

      await user.click(screen.getByTestId('ruleV2FormEditModeYamlButton'));
      const initialEditor = screen.getByTestId('ruleV2FormYamlEditor') as HTMLTextAreaElement;
      expect(initialEditor.value).not.toContain('critical');

      await user.click(screen.getByTestId('testSetTags'));

      await waitFor(() => {
        const editor = screen.getByTestId('ruleV2FormYamlEditor') as HTMLTextAreaElement;
        expect(editor.value).toContain('critical');
        expect(editor.value).toContain('edge');
      });
    });

    it('regenerates YAML when the ES|QL query field changes', async () => {
      const user = userEvent.setup();

      // Stand-in for the ES|QL editor: a button that pushes a new query into
      // form state via setValue, which is what esql_editor_field.tsx does in
      // production via field.onChange.
      const QueryWriter = () => {
        const { setValue } = useFormContext();
        return (
          <button
            type="button"
            data-test-subj="testSetQuery"
            onClick={() =>
              setValue('evaluation.query.base', 'FROM other-index | LIMIT 1', {
                shouldDirty: true,
              })
            }
          >
            set query
          </button>
        );
      };

      render(
        <>
          <RuleForm {...defaultProps} includeYaml />
          <QueryWriter />
        </>,
        { wrapper: createFormWrapper() }
      );

      // Open YAML to see initial buffer
      await user.click(screen.getByTestId('ruleV2FormEditModeYamlButton'));
      const initialEditor = screen.getByTestId('ruleV2FormYamlEditor') as HTMLTextAreaElement;
      expect(initialEditor.value).not.toContain('other-index');

      // Simulate an ES|QL editor change pushing into form state
      await user.click(screen.getByTestId('testSetQuery'));

      await waitFor(() => {
        const editor = screen.getByTestId('ruleV2FormYamlEditor') as HTMLTextAreaElement;
        expect(editor.value).toContain('other-index');
      });
    });

    it('flushes YAML→Form on toggle to Form (does not depend on editor blur)', async () => {
      const user = userEvent.setup();

      // Probe that reflects current form state for assertions.
      const FormStateProbe = () => {
        const { getValues } = useFormContext();
        return (
          <div data-test-subj="formStateProbe">
            name={String(getValues('metadata.name') ?? '')};tags=
            {JSON.stringify(getValues('metadata.tags') ?? [])}
          </div>
        );
      };

      render(
        <>
          <RuleForm {...defaultProps} includeYaml />
          <FormStateProbe />
        </>,
        { wrapper: createFormWrapper({ metadata: { name: 'before-edit', enabled: true } }) }
      );

      // Switch to YAML
      await user.click(screen.getByTestId('ruleV2FormEditModeYamlButton'));
      const editor = screen.getByTestId('ruleV2FormYamlEditor') as HTMLTextAreaElement;

      // Replace the entire YAML with a valid edited rule (changes name and adds tags)
      const editedYaml = [
        'kind: alert',
        'metadata:',
        '  name: after-edit',
        '  tags:',
        '    - critical',
        '    - team-rna',
        'time_field: "@timestamp"',
        'schedule:',
        '  every: 5m',
        '  lookback: 1m',
        'evaluation:',
        '  query:',
        '    base: FROM logs-*',
        '',
      ].join('\n');
      await user.clear(editor);
      // userEvent.type respects \n; use fireEvent.change for a clean replace
      const { fireEvent } = await import('@testing-library/react');
      fireEvent.change(editor, { target: { value: editedYaml } });

      // Click Form toggle — this should flush YAML→Form regardless of blur timing.
      await user.click(screen.getByTestId('ruleV2FormEditModeFormButton'));

      // GuiRuleForm is now mounted; form state should reflect the YAML edits.
      await waitFor(() => {
        expect(screen.getByTestId('formStateProbe')).toHaveTextContent('name=after-edit');
      });
      expect(screen.getByTestId('formStateProbe')).toHaveTextContent(
        'tags=["critical","team-rna"]'
      );
    });

    it('preserves YAML edits across Form↔YAML toggle', async () => {
      const user = userEvent.setup();

      render(<RuleForm {...defaultProps} includeYaml />, { wrapper: createFormWrapper() });

      // Switch to YAML and type something distinctive
      await user.click(screen.getByTestId('ruleV2FormEditModeYamlButton'));

      const editor = screen.getByTestId('ruleV2FormYamlEditor') as HTMLTextAreaElement;
      await user.clear(editor);
      await user.type(editor, 'metadata:\n  name: persisted-edit');

      // Switch back to Form mode (unmounts the YAML form)
      await user.click(screen.getByTestId('ruleV2FormEditModeFormButton'));
      expect(screen.getByTestId('mockGuiRuleForm')).toBeInTheDocument();

      // Switch to YAML again — the lifted state should restore the buffer
      await user.click(screen.getByTestId('ruleV2FormEditModeYamlButton'));
      const editorAfter = screen.getByTestId('ruleV2FormYamlEditor') as HTMLTextAreaElement;
      expect(editorAfter.value).toContain('persisted-edit');
    });
  });

  describe('submission buttons', () => {
    it('does not show submission buttons by default', () => {
      render(<RuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      expect(screen.queryByTestId('ruleV2FormSubmitButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ruleV2FormCancelButton')).not.toBeInTheDocument();
    });

    it('shows submission buttons when includeSubmission is true', () => {
      render(<RuleForm {...defaultProps} includeSubmission />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('ruleV2FormSubmitButton')).toBeInTheDocument();
    });

    it('shows cancel button when onCancel is provided', () => {
      const onCancel = jest.fn();

      render(<RuleForm {...defaultProps} includeSubmission onCancel={onCancel} />, {
        wrapper: createFormWrapper(),
      });

      expect(screen.getByTestId('ruleV2FormCancelButton')).toBeInTheDocument();
    });

    it('does not show cancel button when onCancel is not provided', () => {
      render(<RuleForm {...defaultProps} includeSubmission />, { wrapper: createFormWrapper() });

      expect(screen.queryByTestId('ruleV2FormCancelButton')).not.toBeInTheDocument();
    });

    it('uses default submit label when not provided', () => {
      render(<RuleForm {...defaultProps} includeSubmission />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('ruleV2FormSubmitButton')).toHaveTextContent('Save');
    });

    it('uses custom submit label when provided', () => {
      render(<RuleForm {...defaultProps} includeSubmission submitLabel="Create Rule" />, {
        wrapper: createFormWrapper(),
      });

      expect(screen.getByTestId('ruleV2FormSubmitButton')).toHaveTextContent('Create Rule');
    });

    it('uses default cancel label when not provided', () => {
      render(<RuleForm {...defaultProps} includeSubmission onCancel={jest.fn()} />, {
        wrapper: createFormWrapper(),
      });

      expect(screen.getByTestId('ruleV2FormCancelButton')).toHaveTextContent('Cancel');
    });

    it('uses custom cancel label when provided', () => {
      render(
        <RuleForm {...defaultProps} includeSubmission onCancel={jest.fn()} cancelLabel="Go Back" />,
        { wrapper: createFormWrapper() }
      );

      expect(screen.getByTestId('ruleV2FormCancelButton')).toHaveTextContent('Go Back');
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = jest.fn();

      render(<RuleForm {...defaultProps} includeSubmission onCancel={onCancel} />, {
        wrapper: createFormWrapper(),
      });

      await user.click(screen.getByTestId('ruleV2FormCancelButton'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('shows submission buttons in YAML mode', async () => {
      const user = userEvent.setup();

      render(<RuleForm {...defaultProps} includeSubmission includeYaml />, {
        wrapper: createFormWrapper(),
      });

      // Switch to YAML mode
      await user.click(screen.getByTestId('ruleV2FormEditModeYamlButton'));

      // Submission buttons should still be visible
      expect(screen.getByTestId('ruleV2FormSubmitButton')).toBeInTheDocument();
    });
  });

  describe('exports', () => {
    it('exports RULE_FORM_ID constant', () => {
      expect(RULE_FORM_ID).toBe('ruleV2Form');
    });
  });

  describe('QueryClient configuration', () => {
    it('renders without error (verifies QueryClient is configured)', () => {
      render(<RuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('mockGuiRuleForm')).toBeInTheDocument();
    });
  });

  describe('services context', () => {
    it('provides services via RuleFormProvider (tested implicitly)', () => {
      // Child components use useRuleFormServices and would throw if context was not provided
      render(<RuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('mockGuiRuleForm')).toBeInTheDocument();
    });
  });

  describe('internal submission (includeSubmission)', () => {
    it('calls createRule on submit when no ruleId is provided', async () => {
      render(<RuleForm {...defaultProps} onSubmit={undefined} includeSubmission />, {
        wrapper: createFormWrapper(),
      });

      const form = document.getElementById(RULE_FORM_ID);
      expect(form).toBeInTheDocument();
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(mockCreateRule).toHaveBeenCalled();
      expect(mockUpdateRule).not.toHaveBeenCalled();
    });

    it('calls updateRule on submit when ruleId is provided', async () => {
      render(
        <RuleForm {...defaultProps} onSubmit={undefined} includeSubmission ruleId="rule-123" />,
        {
          wrapper: createFormWrapper(),
        }
      );

      const form = document.getElementById(RULE_FORM_ID);
      expect(form).toBeInTheDocument();
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(mockUpdateRule).toHaveBeenCalled();
      expect(mockCreateRule).not.toHaveBeenCalled();
    });

    it('prefers external onSubmit over internal hooks', async () => {
      const externalOnSubmit = jest.fn();

      render(
        <RuleForm
          {...defaultProps}
          onSubmit={externalOnSubmit}
          includeSubmission
          ruleId="rule-123"
        />,
        {
          wrapper: createFormWrapper(),
        }
      );

      const form = document.getElementById(RULE_FORM_ID);
      expect(form).toBeInTheDocument();
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(externalOnSubmit).toHaveBeenCalled();
      expect(mockCreateRule).not.toHaveBeenCalled();
      expect(mockUpdateRule).not.toHaveBeenCalled();
    });
  });
});
