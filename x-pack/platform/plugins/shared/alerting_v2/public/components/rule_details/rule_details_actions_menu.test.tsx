/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleDetailsActionsMenu } from './rule_details_actions_menu';
import type { RuleApiResponse } from '../../services/rules_api';

const mockCloneRule = jest.fn();
const mockDisableRule = jest.fn();
const mockEnableRule = jest.fn();

jest.mock('../../hooks/use_clone_rule', () => ({
  useCloneRule: () => ({ mutate: mockCloneRule }),
}));

jest.mock('../../hooks/use_disable_rule', () => ({
  useDisableRule: () => ({ mutate: mockDisableRule }),
}));

jest.mock('../../hooks/use_enable_rule', () => ({
  useEnableRule: () => ({ mutate: mockEnableRule }),
}));

const enabledRule = {
  id: 'rule-1',
  enabled: true,
  kind: 'signal',
  metadata: { name: 'Test Rule' },
} as RuleApiResponse;

const disabledRule = { ...enabledRule, enabled: false } as RuleApiResponse;

const renderMenu = (rule: RuleApiResponse, showDeleteConfirmation = jest.fn()) =>
  render(
    <I18nProvider>
      <RuleDetailsActionsMenu rule={rule} showDeleteConfirmation={showDeleteConfirmation} />
    </I18nProvider>
  );

describe('RuleDetailsActionsMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the actions button', () => {
    renderMenu(enabledRule);
    expect(screen.getByTestId('ruleDetailsActionsButton')).toBeInTheDocument();
  });

  it('shows disable option for enabled rules', () => {
    renderMenu(enabledRule);
    fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
    expect(screen.getByTestId('ruleDetailsDisableButton')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleDetailsEnableButton')).not.toBeInTheDocument();
  });

  it('shows enable option for disabled rules', () => {
    renderMenu(disabledRule);
    fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
    expect(screen.getByTestId('ruleDetailsEnableButton')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleDetailsDisableButton')).not.toBeInTheDocument();
  });

  it('calls disableRule when disable is clicked', () => {
    renderMenu(enabledRule);
    fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
    fireEvent.click(screen.getByTestId('ruleDetailsDisableButton'));
    expect(mockDisableRule).toHaveBeenCalledWith({ id: 'rule-1' });
  });

  it('calls enableRule when enable is clicked', () => {
    renderMenu(disabledRule);
    fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
    fireEvent.click(screen.getByTestId('ruleDetailsEnableButton'));
    expect(mockEnableRule).toHaveBeenCalledWith({ id: 'rule-1' });
  });

  it('calls cloneRule when clone is clicked', () => {
    renderMenu(enabledRule);
    fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
    fireEvent.click(screen.getByTestId('ruleDetailsCloneButton'));
    expect(mockCloneRule).toHaveBeenCalledWith(enabledRule);
  });

  it('calls showDeleteConfirmation when delete is clicked', () => {
    const showDelete = jest.fn();
    renderMenu(enabledRule, showDelete);
    fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
    fireEvent.click(screen.getByTestId('ruleDetailsDeleteButton'));
    expect(showDelete).toHaveBeenCalledTimes(1);
  });

  it('always shows clone and delete options', () => {
    renderMenu(enabledRule);
    fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
    expect(screen.getByTestId('ruleDetailsCloneButton')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDetailsDeleteButton')).toBeInTheDocument();
  });
});
