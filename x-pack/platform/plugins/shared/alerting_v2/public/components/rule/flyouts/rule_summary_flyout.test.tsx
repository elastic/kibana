/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleSummaryFlyout } from './rule_summary_flyout';
import type { RuleApiResponse } from '../../../services/rules_api';

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'http') {
      return { basePath: { prepend: (p: string) => `/base${p}` } };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('../../../pages/rules_list_page/rule_actions_menu', () => ({
  RuleActionsMenu: ({ rule, onEdit, onClone, onDelete, onToggleEnabled }: any) => (
    <div data-test-subj={`ruleActionsMenu-${rule.id}`}>
      <button data-test-subj="mockEdit" onClick={() => onEdit(rule)}>
        Edit
      </button>
      <button data-test-subj="mockClone" onClick={() => onClone(rule)}>
        Clone
      </button>
      <button data-test-subj="mockDelete" onClick={() => onDelete(rule)}>
        Delete
      </button>
      <button data-test-subj="mockToggleEnabled" onClick={() => onToggleEnabled(rule)}>
        Toggle
      </button>
    </div>
  ),
}));

jest.mock('../../rule_details/rule_header_description', () => ({
  RuleHeaderDescription: () => <div data-test-subj="mockRuleHeaderDescription" />,
  RuleTitleWithBadges: ({ variant }: { variant?: string }) => (
    <span data-test-subj="mockRuleTitleWithBadges" data-variant={variant}>
      Rule title
    </span>
  ),
}));

jest.mock('../../rule_details/sidebar/rule_conditions', () => ({
  RuleConditions: ({ variant }: { variant?: string }) => (
    <div data-test-subj="mockRuleConditions" data-variant={variant} />
  ),
}));

jest.mock('../../rule_details/sidebar/rule_metadata', () => ({
  RuleMetadata: () => <div data-test-subj="mockRuleMetadata" />,
}));

const baseRule = {
  id: 'rule-1',
  kind: 'alert',
  enabled: true,
  metadata: { name: 'My Rule' },
} as RuleApiResponse;

const renderFlyout = (overrides: Partial<React.ComponentProps<typeof RuleSummaryFlyout>> = {}) => {
  const props = {
    rule: baseRule,
    onClose: jest.fn(),
    onEdit: jest.fn(),
    onQuickEdit: jest.fn(),
    onClone: jest.fn(),
    onDelete: jest.fn(),
    onToggleEnabled: jest.fn(),
    ...overrides,
  };

  const utils = render(
    <I18nProvider>
      <RuleSummaryFlyout {...props} />
    </I18nProvider>
  );

  return { ...utils, props };
};

describe('RuleSummaryFlyout', () => {
  it('renders the flyout with the rule title, header description, conditions, and metadata', () => {
    renderFlyout();

    expect(screen.getByTestId('ruleSummaryFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('ruleSummaryFlyoutTitle')).toBeInTheDocument();
    expect(screen.getByTestId('mockRuleTitleWithBadges')).toHaveAttribute(
      'data-variant',
      'summary'
    );
    expect(screen.getByTestId('mockRuleHeaderDescription')).toBeInTheDocument();
    expect(screen.getByTestId('mockRuleConditions')).toHaveAttribute('data-variant', 'summary');
    expect(screen.getByTestId('mockRuleMetadata')).toBeInTheDocument();
  });

  it('passes the rule to the actions menu via context', () => {
    renderFlyout();

    expect(screen.getByTestId('ruleActionsMenu-rule-1')).toBeInTheDocument();
  });

  it('calls onClose when the close icon button is clicked', () => {
    const { props } = renderFlyout();

    fireEvent.click(screen.getByTestId('ruleSummaryFlyoutCloseButton'));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the cancel button is clicked', () => {
    const { props } = renderFlyout();

    fireEvent.click(screen.getByTestId('ruleSummaryFlyoutCancelButton'));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the open details button with a basePath-prefixed rule details href', () => {
    renderFlyout();

    const openDetailsButton = screen.getByTestId('ruleSummaryFlyoutOpenDetailsButton');
    expect(openDetailsButton).toHaveAttribute(
      'href',
      '/base/app/management/alertingV2/rules/rule-1'
    );
  });

  it('url-encodes the rule id when building the details href', () => {
    renderFlyout({
      rule: { ...baseRule, id: 'rule with spaces/and slash' } as RuleApiResponse,
    });

    const openDetailsButton = screen.getByTestId('ruleSummaryFlyoutOpenDetailsButton');
    expect(openDetailsButton).toHaveAttribute(
      'href',
      `/base/app/management/alertingV2/rules/${encodeURIComponent('rule with spaces/and slash')}`
    );
  });

  it('calls onQuickEdit with the rule when the pencil icon is clicked', () => {
    const { props } = renderFlyout();

    fireEvent.click(screen.getByTestId('ruleSummaryFlyoutQuickEditButton'));

    expect(props.onQuickEdit).toHaveBeenCalledWith(baseRule);
  });

  it('forwards action callbacks to the RuleActionsMenu with the rule', () => {
    const { props } = renderFlyout();

    fireEvent.click(screen.getByTestId('mockEdit'));
    expect(props.onEdit).toHaveBeenCalledWith(baseRule);

    fireEvent.click(screen.getByTestId('mockClone'));
    expect(props.onClone).toHaveBeenCalledWith(baseRule);

    fireEvent.click(screen.getByTestId('mockDelete'));
    expect(props.onDelete).toHaveBeenCalledWith(baseRule);

    fireEvent.click(screen.getByTestId('mockToggleEnabled'));
    expect(props.onToggleEnabled).toHaveBeenCalledWith(baseRule);
  });
});
