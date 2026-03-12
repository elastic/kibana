/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleForm } from './rule_form';
import { RULE_FORM_ID } from './constants';
import { createFormWrapper, createMockServices } from '../test_utils';

// Mock RulePreviewPanel to avoid rendering the full preview
jest.mock('./fields/rule_preview_panel', () => ({
  RulePreviewPanel: () => <div data-test-subj="mockRulePreviewPanel">Preview Panel</div>,
}));

// Mock NameField to avoid rendering inline edit title setup
jest.mock('./fields/name_field', () => ({
  NameField: () => <div data-test-subj="mockNameField">Rule Name</div>,
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

// Mock YamlRuleForm to avoid monaco editor setup
jest.mock('./yaml_rule_form', () => ({
  YamlRuleForm: ({ onSubmit, isDisabled }: { onSubmit: () => void; isDisabled?: boolean }) => (
    <form
      id="ruleV2Form"
      data-test-subj="mockYamlRuleForm"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div>YAML Form</div>
      <textarea data-test-subj="ruleV2FormYamlEditor" disabled={isDisabled} />
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
