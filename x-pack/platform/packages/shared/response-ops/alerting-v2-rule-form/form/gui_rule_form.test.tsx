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
jest.mock('./field_groups/query_field_group', () => ({
  QueryFieldGroup: () => <div data-test-subj="mockQueryFieldGroup">Query Field Group</div>,
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

jest.mock('../flyout/error_callout', () => ({
  ErrorCallOut: () => <div data-test-subj="mockErrorCallOut">Error CallOut</div>,
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

    it('renders ErrorCallOut', () => {
      render(<GuiRuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('mockErrorCallOut')).toBeInTheDocument();
    });

    it('renders RuleDetailsFieldGroup', () => {
      render(<GuiRuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('mockRuleDetailsFieldGroup')).toBeInTheDocument();
    });

    it('renders RuleExecutionFieldGroup', () => {
      render(<GuiRuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('mockRuleExecutionFieldGroup')).toBeInTheDocument();
    });
  });

  describe('includeQueryEditor prop', () => {
    it('renders QueryFieldGroup when includeQueryEditor is true', () => {
      render(<GuiRuleForm {...defaultProps} includeQueryEditor />, {
        wrapper: createFormWrapper(),
      });

      expect(screen.getByTestId('mockQueryFieldGroup')).toBeInTheDocument();
    });

    it('does not render QueryFieldGroup when includeQueryEditor is false', () => {
      render(<GuiRuleForm {...defaultProps} includeQueryEditor={false} />, {
        wrapper: createFormWrapper(),
      });

      expect(screen.queryByTestId('mockQueryFieldGroup')).not.toBeInTheDocument();
    });

    it('defaults includeQueryEditor to true', () => {
      render(<GuiRuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

      expect(screen.getByTestId('mockQueryFieldGroup')).toBeInTheDocument();
    });
  });

  describe('field group ordering', () => {
    it('renders field groups in correct order: ErrorCallOut, Query (optional), Details, Execution', () => {
      const { container } = render(<GuiRuleForm {...defaultProps} includeQueryEditor />, {
        wrapper: createFormWrapper(),
      });

      const elements = container.querySelectorAll('[data-test-subj^="mock"]');
      const order = Array.from(elements).map((el) => el.getAttribute('data-test-subj'));

      expect(order).toEqual([
        'mockErrorCallOut',
        'mockQueryFieldGroup',
        'mockRuleDetailsFieldGroup',
        'mockRuleExecutionFieldGroup',
      ]);
    });

    it('maintains correct order when query editor is excluded', () => {
      const { container } = render(<GuiRuleForm {...defaultProps} includeQueryEditor={false} />, {
        wrapper: createFormWrapper(),
      });

      const elements = container.querySelectorAll('[data-test-subj^="mock"]');
      const order = Array.from(elements).map((el) => el.getAttribute('data-test-subj'));

      expect(order).toEqual([
        'mockErrorCallOut',
        'mockRuleDetailsFieldGroup',
        'mockRuleExecutionFieldGroup',
      ]);
    });
  });
});
