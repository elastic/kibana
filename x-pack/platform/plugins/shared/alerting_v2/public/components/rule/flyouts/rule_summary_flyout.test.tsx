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
import { useRuleAutoAttach } from '../../../agent_builder/use_rule_auto_attach';

jest.mock('../../../agent_builder/use_rule_auto_attach', () => ({
  useRuleAutoAttach: jest.fn(),
}));

jest.mock('@kbn/core-di-browser', () => {
  return {
    useService: (token: unknown) => {
      if (token === 'http') {
        return { basePath: { prepend: (p: string) => `/base${p}` } };
      }
      return {};
    },
    CoreStart: (key: string) => key,
  };
});

jest.mock('../../rule_details/rule_summary_header', () => ({
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

const mockUseRuleAutoAttach = jest.mocked(useRuleAutoAttach);

const renderFlyout = (overrides: Partial<React.ComponentProps<typeof RuleSummaryFlyout>> = {}) => {
  const props = {
    rule: baseRule,
    onClose: jest.fn(),
    onEdit: jest.fn(),
    onClone: jest.fn(),
    onDelete: jest.fn(),
    onToggleEnabled: jest.fn(),
    onRun: jest.fn(),
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

  it('calls onClose when the close icon button is clicked', () => {
    const { props } = renderFlyout();

    fireEvent.click(screen.getByTestId('ruleSummaryFlyoutCloseButton'));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the footer close button is clicked', () => {
    const { props } = renderFlyout();

    fireEvent.click(screen.getByTestId('ruleSummaryFlyoutFooterCloseButton'));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render any rule actions in the header', () => {
    renderFlyout();

    // Header actions were moved to the footer Take action menu.
    expect(screen.queryByTestId('ruleSummaryFlyoutQuickEditButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ruleActionsButton-rule-1')).not.toBeInTheDocument();
    // The close control remains in the header.
    expect(screen.getByTestId('ruleSummaryFlyoutCloseButton')).toBeInTheDocument();
  });

  describe('Take action menu', () => {
    const openMenu = () => fireEvent.click(screen.getByTestId('ruleSummaryFlyoutTakeActionButton'));

    it('opens the View details item with a basePath-prefixed rule details href', () => {
      renderFlyout();
      openMenu();

      expect(screen.getByTestId('viewRuleDetails-rule-1')).toHaveAttribute(
        'href',
        '/base/app/management/alertingV2/rules/rule-1'
      );
    });

    it('url-encodes the rule id when building the details href', () => {
      renderFlyout({
        rule: { ...baseRule, id: 'rule with spaces/and slash' } as RuleApiResponse,
      });
      fireEvent.click(screen.getByTestId('ruleSummaryFlyoutTakeActionButton'));

      expect(screen.getByTestId('viewRuleDetails-rule with spaces/and slash')).toHaveAttribute(
        'href',
        `/base/app/management/alertingV2/rules/${encodeURIComponent('rule with spaces/and slash')}`
      );
    });

    it('forwards write action callbacks with the rule', () => {
      const { props } = renderFlyout({ onUpdateApiKey: jest.fn() });
      openMenu();

      fireEvent.click(screen.getByTestId('editRule-rule-1'));
      expect(props.onEdit).toHaveBeenCalledWith(baseRule);

      openMenu();
      fireEvent.click(screen.getByTestId('cloneRule-rule-1'));
      expect(props.onClone).toHaveBeenCalledWith(baseRule);

      openMenu();
      fireEvent.click(screen.getByTestId('runRule-rule-1'));
      expect(props.onRun).toHaveBeenCalledWith(baseRule);

      openMenu();
      fireEvent.click(screen.getByTestId('toggleEnabledRule-rule-1'));
      expect(props.onToggleEnabled).toHaveBeenCalledWith(baseRule);

      openMenu();
      fireEvent.click(screen.getByTestId('updateRuleApiKey-rule-1'));
      expect(props.onUpdateApiKey).toHaveBeenCalledWith(baseRule);

      openMenu();
      fireEvent.click(screen.getByTestId('deleteRule-rule-1'));
      expect(props.onDelete).toHaveBeenCalledWith(baseRule);
    });

    it('renders the actions in grouped order separated by dividers', () => {
      renderFlyout({ onUpdateApiKey: jest.fn() });
      openMenu();

      const expectedOrder = [
        'viewRuleDetails-rule-1',
        'runRule-rule-1',
        'editRule-rule-1',
        'cloneRule-rule-1',
        'toggleEnabledRule-rule-1',
        'updateRuleApiKey-rule-1',
        'deleteRule-rule-1',
      ];
      const panel = screen.getByTestId('viewRuleDetails-rule-1').closest('.euiContextMenuPanel');

      // Items appear in the expected document order.
      const renderedOrder = Array.from(panel?.querySelectorAll('[data-test-subj]') ?? [])
        .map((element) => element.getAttribute('data-test-subj'))
        .filter((testId) => expectedOrder.includes(testId ?? ''));
      expect(renderedOrder).toEqual(expectedOrder);

      // Two dividers: after Clone, and after Update API key.
      expect(panel?.querySelectorAll('hr')).toHaveLength(2);
    });

    it('omits the update API key action when onUpdateApiKey is not provided', () => {
      renderFlyout();
      openMenu();

      expect(screen.queryByTestId('updateRuleApiKey-rule-1')).not.toBeInTheDocument();
    });

    it('shows only read actions when canWrite is false', () => {
      renderFlyout({ canWrite: false, onViewChangeHistory: jest.fn() });
      openMenu();

      // Read actions stay available.
      expect(screen.getByTestId('viewRuleDetails-rule-1')).toBeInTheDocument();
      expect(screen.getByTestId('viewChangeHistoryRule-rule-1')).toBeInTheDocument();
      // Write actions are hidden.
      expect(screen.queryByTestId('editRule-rule-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('deleteRule-rule-1')).not.toBeInTheDocument();
      // Close still available.
      expect(screen.getByTestId('ruleSummaryFlyoutFooterCloseButton')).toBeInTheDocument();
    });

    it('shows View change history in the read group when onViewChangeHistory is provided', () => {
      const onViewChangeHistory = jest.fn();
      renderFlyout({ onViewChangeHistory });
      openMenu();

      const changeHistory = screen.getByTestId('viewChangeHistoryRule-rule-1');
      expect(changeHistory).toBeInTheDocument();

      // View change history sits in the second group, after Clone and before Delete.
      const panel = changeHistory.closest('.euiContextMenuPanel');
      const readGroup = [
        'viewRuleDetails-rule-1',
        'editRule-rule-1',
        'cloneRule-rule-1',
        'viewChangeHistoryRule-rule-1',
        'deleteRule-rule-1',
      ];
      const renderedOrder = Array.from(panel?.querySelectorAll('[data-test-subj]') ?? [])
        .map((element) => element.getAttribute('data-test-subj'))
        .filter((testId) => readGroup.includes(testId ?? ''));
      expect(renderedOrder).toEqual(readGroup);

      fireEvent.click(changeHistory);
      expect(onViewChangeHistory).toHaveBeenCalledWith(baseRule);
    });

    it('omits View change history when onViewChangeHistory is not provided', () => {
      renderFlyout();
      openMenu();

      expect(screen.queryByTestId('viewChangeHistoryRule-rule-1')).not.toBeInTheDocument();
    });
  });

  describe('Agent Builder auto-attach', () => {
    it('passes the loaded rule to useRuleAutoAttach', () => {
      renderFlyout();

      expect(mockUseRuleAutoAttach).toHaveBeenCalledWith(baseRule);
    });
  });
});
