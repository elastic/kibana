/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleExecutionStatusErrorReasons } from '@kbn/alerting-plugin/common';
import type { RuleTableItem } from '../../../../../types';
import type { RuleDiagnoseFlyoutProps } from './rule_diagnose_flyout';
import { RuleDiagnoseFlyout } from './rule_diagnose_flyout';

jest.mock('../../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(() => false),
}));

const baseRule = {
  id: '1',
  name: 'my rule',
  ruleType: 'Test rule type',
  ruleTypeId: 'test_rule_type',
  enabled: true,
  isEditable: true,
  tags: [],
  executionStatus: {
    status: 'error',
    error: { reason: RuleExecutionStatusErrorReasons.Decrypt, message: 'cannot decrypt' },
  },
  lastRun: {
    outcome: 'failed',
    outcomeMsg: ['cannot decrypt'],
    warning: RuleExecutionStatusErrorReasons.Decrypt,
  },
} as unknown as RuleTableItem;

const renderFlyout = (overrides: Partial<RuleDiagnoseFlyoutProps> = {}) => {
  const props: RuleDiagnoseFlyoutProps = {
    rule: baseRule,
    canEditRule: true,
    onClose: jest.fn(),
    onAction: jest.fn(),
    ...overrides,
  };
  render(
    <IntlProvider locale="en">
      <RuleDiagnoseFlyout {...props} />
    </IntlProvider>
  );
  return props;
};

describe('RuleDiagnoseFlyout', () => {
  it('renders the rule name, status and a diagnosis with its messages', () => {
    renderFlyout();

    expect(screen.getByTestId('ruleDiagnoseFlyout')).toBeInTheDocument();
    expect(screen.getByText('my rule')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDiagnosis-decrypt')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDiagnosis-decrypt-messages')).toHaveTextContent(
      'cannot decrypt'
    );
  });

  it('invokes the primary action and closes the flyout', () => {
    const { onAction, onClose } = renderFlyout();

    fireEvent.click(screen.getByTestId('ruleDiagnosis-decrypt-updateApiKey'));

    expect(onAction).toHaveBeenCalledWith('updateApiKey', baseRule);
    expect(onClose).toHaveBeenCalled();
  });

  it('invokes secondary actions', () => {
    const { onAction } = renderFlyout();

    fireEvent.click(screen.getByTestId('ruleDiagnosis-decrypt-viewRuleDetails'));

    expect(onAction).toHaveBeenCalledWith('viewRuleDetails', baseRule);
  });

  it('disables mutating actions when the rule is not editable', () => {
    renderFlyout({ rule: { ...baseRule, isEditable: false } as RuleTableItem });

    expect(screen.getByTestId('ruleDiagnosis-decrypt-updateApiKey')).toBeDisabled();
    expect(screen.getByTestId('ruleDiagnosis-decrypt-viewRuleDetails')).not.toBeDisabled();
  });

  it('disables edit rule when the rule cannot be edited in this context', () => {
    const rule = {
      ...baseRule,
      executionStatus: {
        status: 'error',
        error: { reason: RuleExecutionStatusErrorReasons.Execute, message: 'boom' },
      },
      lastRun: {
        outcome: 'failed',
        outcomeMsg: ['boom'],
        warning: RuleExecutionStatusErrorReasons.Execute,
      },
    } as unknown as RuleTableItem;
    renderFlyout({ rule, canEditRule: false });

    expect(screen.getByTestId('ruleDiagnosis-execute-editRule')).toBeDisabled();
  });

  it('renders every diagnosis for a rule with multiple problems', () => {
    const rule = {
      ...baseRule,
      tags: ['Missing Elastic Cloud API Key'],
    } as unknown as RuleTableItem;
    renderFlyout({ rule });

    expect(screen.getByTestId('ruleDiagnosis-decrypt')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDiagnosis-missingApiKey')).toBeInTheDocument();
  });

  it('renders an empty state for a healthy rule', () => {
    const rule = {
      ...baseRule,
      executionStatus: { status: 'ok' },
      lastRun: { outcome: 'succeeded', outcomeMsg: null, warning: null },
    } as unknown as RuleTableItem;
    renderFlyout({ rule });

    expect(screen.getByTestId('ruleDiagnoseFlyoutNoProblems')).toBeInTheDocument();
  });

  it('closes from the footer button', () => {
    const { onClose } = renderFlyout();

    fireEvent.click(screen.getByTestId('ruleDiagnoseFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalled();
  });
});
