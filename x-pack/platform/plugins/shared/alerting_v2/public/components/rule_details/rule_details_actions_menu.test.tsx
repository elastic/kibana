/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { RuleDetailsActionsMenu } from './rule_details_actions_menu';
import { RuleProvider } from './rule_context';
import type { RuleApiResponse } from '../../services/rules_api';

const mockToggleRuleEnabled = jest.fn();
const mockNavigateToUrl = jest.fn();
const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

jest.mock('@kbn/core-di-browser');
jest.mock('../../hooks/use_toggle_rule_enabled', () => ({
  useToggleRuleEnabled: () => ({ mutate: mockToggleRuleEnabled }),
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
      <RuleProvider rule={rule}>
        <RuleDetailsActionsMenu showDeleteConfirmation={showDeleteConfirmation} />
      </RuleProvider>
    </I18nProvider>
  );

describe('RuleDetailsActionsMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart.mockImplementation((key: string) => key as never);
    mockUseService.mockImplementation((service: unknown) => {
      if (service === 'application') {
        return { navigateToUrl: mockNavigateToUrl } as never;
      }
      if (service === 'http') {
        return { basePath: { prepend: (url: string) => url } } as never;
      }
      return undefined as never;
    });
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

  it('calls toggleRuleEnabled with enabled=false when disable is clicked', () => {
    renderMenu(enabledRule);
    fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
    fireEvent.click(screen.getByTestId('ruleDetailsDisableButton'));
    expect(mockToggleRuleEnabled).toHaveBeenCalledWith({ id: 'rule-1', enabled: false });
  });

  it('calls toggleRuleEnabled with enabled=true when enable is clicked', () => {
    renderMenu(disabledRule);
    fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
    fireEvent.click(screen.getByTestId('ruleDetailsEnableButton'));
    expect(mockToggleRuleEnabled).toHaveBeenCalledWith({ id: 'rule-1', enabled: true });
  });

  it('navigates to create page with cloneFrom query param when clone is clicked', () => {
    renderMenu(enabledRule);
    fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
    fireEvent.click(screen.getByTestId('ruleDetailsCloneButton'));
    expect(mockNavigateToUrl).toHaveBeenCalledWith(
      '/app/management/alertingV2/rules/create?cloneFrom=rule-1'
    );
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
