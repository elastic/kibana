/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { GuiRuleForm } from './gui_rule_form';
import { createFormWrapper } from '../test_utils';
import { RULE_FORM_ID } from './constants';

// Mock field groups to avoid complex dependencies
jest.mock('./field_groups/condition_field_group', () => ({
  ConditionFieldGroup: (props: { includeBase?: boolean }) => (
    <div data-test-subj="mockConditionFieldGroup" data-include-base={String(props.includeBase)}>
      Condition Field Group
    </div>
  ),
}));

jest.mock('./field_groups/rule_details_field_group', () => ({
  RuleDetailsFieldGroup: () => (
    <div data-test-subj="mockRuleDetailsFieldGroup">Rule Details Field Group</div>
  ),
}));

jest.mock('./field_groups/rule_execution_field_group', () => ({
  RuleExecutionFieldGroup: () => (
    <div data-test-subj="mockRuleExecutionFieldGroup">Rule Execution Field Group</div>
  ),
}));

jest.mock('./field_groups/alert_conditions_field_group', () => ({
  AlertConditionsFieldGroup: () => (
    <div data-test-subj="mockAlertConditionsFieldGroup">Alert Conditions Field Group</div>
  ),
}));

jest.mock('./fields/kind_field', () => ({
  KindField: () => <div data-test-subj="mockKindField">Kind Field</div>,
}));

jest.mock('./field_groups/attachment_runbook_field_group', () => ({
  AttachmentRunbookFieldGroup: () => (
    <div data-test-subj="mockAttachmentRunbookFieldGroup">Attachment Runbook Field Group</div>
  ),
}));

describe('GuiRuleForm', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders a form with the correct ID', () => {
      render(<GuiRuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      const form = document.getElementById(RULE_FORM_ID);
      expect(form).toBeInTheDocument();
      expect(form?.tagName).toBe('FORM');
    });

    it('renders ConditionFieldGroup', () => {
      render(<GuiRuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('mockConditionFieldGroup')).toBeInTheDocument();
    });

    it('renders RuleDetailsFieldGroup', () => {
      render(<GuiRuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('mockRuleDetailsFieldGroup')).toBeInTheDocument();
    });

    it('renders RuleExecutionFieldGroup', () => {
      render(<GuiRuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('mockRuleExecutionFieldGroup')).toBeInTheDocument();
    });

    it('renders KindField', () => {
      render(<GuiRuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('mockKindField')).toBeInTheDocument();
    });

    it('renders AttachmentRunbookFieldGroup', () => {
      render(<GuiRuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('mockAttachmentRunbookFieldGroup')).toBeInTheDocument();
    });
  });

  describe('includeQueryEditor prop', () => {
    it('passes includeBase=true to ConditionFieldGroup when includeQueryEditor is true', () => {
      render(<GuiRuleForm {...defaultProps} includeQueryEditor />, {
        wrapper: createFormWrapper(),
      });

      const conditionGroup = screen.getByTestId('mockConditionFieldGroup');
      expect(conditionGroup).toHaveAttribute('data-include-base', 'true');
    });

    it('passes includeBase=false to ConditionFieldGroup when includeQueryEditor is false', () => {
      render(<GuiRuleForm {...defaultProps} includeQueryEditor={false} />, {
        wrapper: createFormWrapper(),
      });

      const conditionGroup = screen.getByTestId('mockConditionFieldGroup');
      expect(conditionGroup).toHaveAttribute('data-include-base', 'false');
    });

    it('defaults includeQueryEditor to true', () => {
      render(<GuiRuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      const conditionGroup = screen.getByTestId('mockConditionFieldGroup');
      expect(conditionGroup).toHaveAttribute('data-include-base', 'true');
    });
  });

  describe('field group ordering', () => {
    it('renders field groups in correct order', () => {
      const { container } = render(<GuiRuleForm {...defaultProps} includeQueryEditor />, {
        wrapper: createFormWrapper(),
      });

      const elements = container.querySelectorAll('[data-test-subj^="mock"]');
      const order = Array.from(elements).map((el) => el.getAttribute('data-test-subj'));

      expect(order).toEqual([
        'mockRuleDetailsFieldGroup',
        'mockConditionFieldGroup',
        'mockRuleExecutionFieldGroup',
        'mockKindField',
        'mockAlertConditionsFieldGroup',
        'mockAttachmentRunbookFieldGroup',
      ]);
    });

    it('still renders ConditionFieldGroup when query editor is excluded', () => {
      const { container } = render(<GuiRuleForm {...defaultProps} includeQueryEditor={false} />, {
        wrapper: createFormWrapper(),
      });

      const elements = container.querySelectorAll('[data-test-subj^="mock"]');
      const order = Array.from(elements).map((el) => el.getAttribute('data-test-subj'));

      expect(order).toEqual([
        'mockRuleDetailsFieldGroup',
        'mockConditionFieldGroup',
        'mockRuleExecutionFieldGroup',
        'mockKindField',
        'mockAlertConditionsFieldGroup',
        'mockAttachmentRunbookFieldGroup',
      ]);
    });
  });
});
