/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { SourceRuleSummaryFlyout } from './source_rule_summary_flyout';

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({
    get: () => 'YYYY-MM-DD',
  }),
  CoreStart: (key: string) => `CoreStart(${key})`,
}));

jest.mock('../rule_details_table', () => ({
  RuleDetailsTable: ({
    items,
  }: {
    items: Array<{ title: string; description: string; 'data-test-subj'?: string }>;
  }) => (
    <div data-test-subj="mockRuleDetailsTable">
      {items.map((item) => (
        <div key={item.title} data-test-subj={item['data-test-subj']}>
          <strong>{item.title}</strong>: {item.description}
        </div>
      ))}
    </div>
  ),
}));

const makeRule = (overrides: Partial<RuleResponse> = {}): RuleResponse =>
  ({
    id: 'rule-1',
    enabled: true,
    metadata: { name: 'My classic rule', tags: ['tag-a', 'tag-b'] },
    schedule: { every: '1m' },
    grouping: { fields: ['host.name', 'service.name'] },
    created_by: { profile_uid: 'elastic' },
    created_at: '2026-01-15T10:00:00.000Z',
    updated_by: { profile_uid: 'admin' },
    updated_at: '2026-06-01T12:00:00.000Z',
    ...overrides,
  } as unknown as RuleResponse);

const defaultProps: React.ComponentProps<typeof SourceRuleSummaryFlyout> = {
  rule: makeRule(),
  ruleCategory: 'Elasticsearch query',
  ruleDetailsHref: '/app/management/insightsAndAlerting/triggersActions/rule/rule-1',
  onClose: jest.fn(),
};

const renderFlyout = (overrides: Partial<typeof defaultProps> = {}) =>
  render(
    <I18nProvider>
      <SourceRuleSummaryFlyout {...defaultProps} {...overrides} />
    </I18nProvider>
  );

describe('SourceRuleSummaryFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the rule name in the title', () => {
    renderFlyout();

    expect(screen.getByTestId('sourceRuleName')).toHaveTextContent('My classic rule');
  });

  it('renders the Classic badge', () => {
    renderFlyout();

    expect(screen.getByTestId('classicRulesBadge')).toHaveTextContent('Classic');
  });

  it('renders the enabled badge', () => {
    renderFlyout();

    expect(screen.getByTestId('sourceRuleEnabledBadge')).toHaveTextContent('Enabled');
  });

  it('renders the disabled badge', () => {
    renderFlyout({ rule: makeRule({ enabled: false }) });

    expect(screen.getByTestId('sourceRuleDisabledBadge')).toHaveTextContent('Disabled');
  });

  it('renders the tags as header badges', () => {
    renderFlyout();

    expect(screen.getByText('tag-a')).toBeInTheDocument();
    expect(screen.getByText('tag-b')).toBeInTheDocument();
  });

  it('renders rule condition fields', () => {
    renderFlyout();

    expect(screen.getByTestId('sourceRuleType')).toHaveTextContent('Elasticsearch query');
    expect(screen.getByTestId('sourceRuleGroupKey')).toHaveTextContent('host.name, service.name');
    expect(screen.getByTestId('sourceRuleSchedule')).toBeInTheDocument();
  });

  it('does not render rule type when ruleCategory is not provided', () => {
    renderFlyout({ ruleCategory: undefined });

    expect(screen.queryByTestId('sourceRuleType')).not.toBeInTheDocument();
  });

  it('renders metadata with plain usernames and formatted dates', () => {
    renderFlyout();

    const tables = screen.getAllByTestId('mockRuleDetailsTable');
    const metadataTable = tables[tables.length - 1];
    expect(metadataTable).toHaveTextContent('elastic');
    expect(metadataTable).toHaveTextContent('admin');
    expect(metadataTable).toHaveTextContent('2026-01-15');
    expect(metadataTable).toHaveTextContent('2026-06-01');
  });

  it('renders the Take action button and View details menu item', () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId('sourceRuleSummaryFlyoutTakeActionButton'));

    const menuItem = screen.getByTestId('sourceRuleSummaryFlyoutViewDetailsAction');
    expect(menuItem).toHaveAttribute(
      'href',
      '/app/management/insightsAndAlerting/triggersActions/rule/rule-1'
    );
  });

  it('does not render Take action button when href is null', () => {
    renderFlyout({ ruleDetailsHref: null });

    expect(screen.queryByTestId('sourceRuleSummaryFlyoutTakeActionButton')).not.toBeInTheDocument();
  });

  it('calls onClose when the close icon is clicked', () => {
    const onClose = jest.fn();
    renderFlyout({ onClose });

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the footer close button is clicked', () => {
    const onClose = jest.fn();
    renderFlyout({ onClose });

    fireEvent.click(screen.getByTestId('sourceRuleSummaryFlyoutFooterCloseButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the template flyout without a backdrop', () => {
    renderFlyout();

    expect(screen.getByTestId('sourceRuleSummaryFlyout')).toBeInTheDocument();
    expect(document.querySelector('.euiOverlayMask')).not.toBeInTheDocument();
  });

  describe('when the rule is loading', () => {
    it('keeps the flyout open with a loading header and body', () => {
      renderFlyout({ rule: undefined, isLoading: true });

      expect(screen.getByTestId('sourceRuleSummaryFlyout')).toBeInTheDocument();
      expect(screen.getByTestId('flyoutHeaderTitleLoading')).toBeInTheDocument();
      expect(screen.getByTestId('ruleSummaryFlyoutLoading')).toBeInTheDocument();
      expect(screen.queryByTestId('classicRulesBadge')).not.toBeInTheDocument();
      expect(screen.getByTestId('sourceRuleSummaryFlyoutTakeActionButton')).toBeDisabled();
    });

    it('does not render the Take action button when the source has no details link', () => {
      renderFlyout({ rule: undefined, isLoading: true, ruleDetailsHref: null });

      expect(
        screen.queryByTestId('sourceRuleSummaryFlyoutTakeActionButton')
      ).not.toBeInTheDocument();
    });

    it('calls onClose from the footer close button', () => {
      const onClose = jest.fn();
      renderFlyout({ rule: undefined, isLoading: true, onClose });

      fireEvent.click(screen.getByTestId('sourceRuleSummaryFlyoutFooterCloseButton'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the rule is not found', () => {
    it('renders the not found prompt', () => {
      renderFlyout({ rule: undefined });

      expect(screen.getByTestId('sourceRuleSummaryFlyout')).toBeInTheDocument();
      expect(screen.getByTestId('ruleSummaryFlyoutNotFound')).toHaveTextContent('Rule not found');
      expect(screen.queryByTestId('ruleSummaryFlyoutLoading')).not.toBeInTheDocument();
      expect(screen.queryByTestId('classicRulesBadge')).not.toBeInTheDocument();
      expect(screen.getByTestId('sourceRuleSummaryFlyoutTakeActionButton')).toBeDisabled();
    });

    it('calls onClose from the footer close button', () => {
      const onClose = jest.fn();
      renderFlyout({ rule: undefined, onClose });

      fireEvent.click(screen.getByTestId('sourceRuleSummaryFlyoutFooterCloseButton'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('falls back to rule id when name is not available', () => {
    renderFlyout({
      rule: { id: 'rule-abc' } as unknown as RuleResponse,
    });

    expect(screen.getByTestId('sourceRuleName')).toHaveTextContent('rule-abc');
  });
});
