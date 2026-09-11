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
import type { RuleSummaryFlyoutProps } from './rule_summary_flyout';
import type { RuleApiResponse } from '../../../../services/rules_api';
import { useRuleAutoAttach } from '@kbn/alerting-v2-browser-shared';

jest.mock('@kbn/alerting-v2-browser-shared', () => ({
  useRuleAutoAttach: jest.fn(),
}));

jest.mock('../../../../hooks/use_rule_audit_metadata', () => ({
  useRuleAuditMetadata: () => ({
    createdByDisplay: 'Alice',
    createdAtFormatted: 'Mar 1, 2026',
    updatedByDisplay: 'Bob',
    updatedAtFormatted: 'Mar 4, 2026',
  }),
}));

jest.mock('../../../../services/user_capabilities', () => ({
  UserCapabilities: 'UserCapabilities',
}));

jest.mock('@kbn/core-di-browser', () => {
  const canRead = jest.fn(() => true);
  return {
    useService: (token: unknown) => {
      if (token === 'http') {
        return { basePath: { prepend: (p: string) => `/base${p}` } };
      }
      if (token === 'UserCapabilities') {
        return { canRead, canWrite: () => true };
      }
      return {};
    },
    CoreStart: (key: string) => key,
    mockCanRead: canRead,
  };
});

const { mockCanRead } = jest.requireMock('@kbn/core-di-browser') as {
  mockCanRead: jest.Mock;
};

jest.mock('../../../rule_details/sidebar/rule_conditions', () => ({
  RuleConditions: ({ variant }: { variant?: string }) => (
    <div data-test-subj="mockRuleConditions" data-variant={variant} />
  ),
}));

jest.mock('../../../rule_details/overview/artifacts/dashboard_artifacts_subsection', () => ({
  DashboardArtifactsSubsection: () => <div data-test-subj="mockDashboardArtifacts" />,
}));

jest.mock('../../../rule_details/overview/artifacts/action_policies_artifacts_subsection', () => ({
  ActionPoliciesArtifactsSubsection: () => <div data-test-subj="mockActionPoliciesArtifacts" />,
}));

jest.mock('./rule_summary_runbook_card', () => ({
  RuleSummaryRunbookCard: () => <div data-test-subj="mockRunbookCard" />,
}));

const baseRule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'alert',
  enabled: true,
  metadata: { name: 'My Rule', description: 'A rule description', version: 1 },
  artifacts: [],
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: {
    format: 'standalone',
    breach: { query: 'FROM logs-* | LIMIT 1' },
  },
  created_by: 'alice@example.com',
  created_at: '2026-03-01T12:00:00.000Z',
  updated_by: 'bob@example.com',
  updated_at: '2026-03-04T12:00:00.000Z',
};

const mockUseRuleAutoAttach = jest.mocked(useRuleAutoAttach);

const renderFlyout = (overrides: Partial<RuleSummaryFlyoutProps> = {}) => {
  const props: RuleSummaryFlyoutProps = {
    rule: baseRule,
    onClose: jest.fn(),
    onEdit: jest.fn(),
    onClone: jest.fn(),
    onDelete: jest.fn(),
    onToggleEnabled: jest.fn(),
    onRun: jest.fn(),
    session: 'never',
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
  beforeEach(() => {
    mockCanRead.mockImplementation(() => true);
  });

  it('renders the template flyout with header, accordion sections, and take action', () => {
    renderFlyout();

    expect(screen.getByTestId('ruleSummaryFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('ruleSummaryFlyoutHeader')).toHaveTextContent('My Rule');
    expect(screen.getByTestId('ruleSummaryFlyoutAbout')).toBeInTheDocument();
    expect(screen.getByTestId('ruleSummaryFlyoutAboutCard')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDescription')).toHaveTextContent('A rule description');
    expect(screen.getByTestId('ruleSummaryFlyoutInvestigation')).toBeInTheDocument();
    expect(screen.getByTestId('ruleSummaryFlyoutActionPolicies')).toBeInTheDocument();
    expect(screen.getByTestId('ruleSummaryFlyoutArtifacts')).toBeInTheDocument();
    expect(screen.getByTestId('mockRuleConditions')).toHaveAttribute('data-variant', 'summary');
    expect(screen.getByTestId('mockDashboardArtifacts')).toBeInTheDocument();
    expect(screen.getByTestId('mockActionPoliciesArtifacts')).toBeInTheDocument();
    expect(screen.getByTestId('mockRunbookCard')).toBeInTheDocument();
    expect(screen.getByTestId('ruleSummaryFlyoutTakeActionButton')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleSummaryFlyoutFooterCloseButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockRuleMetadata')).not.toBeInTheDocument();
  });

  it('omits action policies when the user cannot read them', () => {
    mockCanRead.mockImplementation((capability: string) => capability !== 'actionPolicies');
    renderFlyout();

    expect(screen.queryByTestId('ruleSummaryFlyoutActionPolicies')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockActionPoliciesArtifacts')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleSummaryFlyoutArtifacts')).toBeInTheDocument();
  });

  it('shows last-update timestamp and audit info blocks in the header', () => {
    renderFlyout();

    expect(screen.getByText('Mar 4, 2026')).toBeInTheDocument();
    expect(screen.getByTestId('ruleSummaryFlyoutCreatedByBlock')).toHaveTextContent('Alice');
    expect(screen.getByTestId('ruleSummaryFlyoutUpdatedByBlock')).toHaveTextContent('Bob');
  });

  it('calls onClose when the flyout close button is clicked', () => {
    const { props } = renderFlyout();

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render any rule actions in the header', () => {
    renderFlyout();

    expect(screen.queryByTestId('ruleSummaryFlyoutQuickEditButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ruleActionsButton-rule-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('euiFlyoutCloseButton')).toBeInTheDocument();
  });

  it('toggles enabled from the header switch', () => {
    const { props } = renderFlyout();

    fireEvent.click(screen.getByTestId('ruleSummaryFlyoutEnabledSwitch'));

    expect(props.onToggleEnabled).toHaveBeenCalledWith(baseRule);
  });

  it('replaces the switch with a spinner while the toggle is in flight', () => {
    renderFlyout({ isToggleLoading: true });

    expect(screen.getByTestId('ruleSummaryFlyoutEnabledSpinner')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleSummaryFlyoutEnabledSwitch')).not.toBeInTheDocument();
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
        rule: { ...baseRule, id: 'rule with spaces/and slash' },
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

      expect(screen.getByTestId('viewRuleDetails-rule-1')).toBeInTheDocument();
      expect(screen.getByTestId('viewChangeHistoryRule-rule-1')).toBeInTheDocument();
      expect(screen.queryByTestId('editRule-rule-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('deleteRule-rule-1')).not.toBeInTheDocument();
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

      expect(mockUseRuleAutoAttach).toHaveBeenCalledWith(baseRule, expect.any(Object));
    });
  });
});
