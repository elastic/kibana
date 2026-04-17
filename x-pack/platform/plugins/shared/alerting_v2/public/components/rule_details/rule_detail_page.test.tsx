/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryRouter } from 'react-router-dom';
import { RuleDetailPage } from './rule_detail_page';
import { RuleProvider } from './rule_context';
import type { RuleApiResponse } from '../../services/rules_api';

const mockHistoryPush = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: mockHistoryPush }),
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'http') {
      return { basePath: { prepend: (p: string) => p } };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

const mockUseBreadcrumbs = jest.fn();
jest.mock('../../hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: (...args: unknown[]) => mockUseBreadcrumbs(...args),
}));

const mockDeleteRule = jest.fn();
jest.mock('../../hooks/use_delete_rule', () => ({
  useDeleteRule: () => ({ mutate: mockDeleteRule, isLoading: false }),
}));

jest.mock('./rule_header_description', () => ({
  RuleTitleWithBadges: () => <div data-test-subj="ruleTitleWithBadges">mocked-title</div>,
  RuleHeaderDescription: () => <div data-test-subj="ruleHeaderDescription" />,
}));

jest.mock('./sidebar/rule_sidebar', () => ({
  RuleSidebar: () => (
    <div>
      <div data-test-subj="ruleConditionsSection">conditions</div>
      <div data-test-subj="ruleMetadataSection">metadata</div>
    </div>
  ),
}));

jest.mock('./rule_details_actions_menu', () => ({
  RuleDetailsActionsMenu: ({ showDeleteConfirmation }: { showDeleteConfirmation: () => void }) => (
    <button
      data-test-subj="ruleDetailsActionsButton"
      onClick={showDeleteConfirmation}
      type="button"
    >
      Actions
    </button>
  ),
}));

const baseRule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: { name: 'Test Signal Rule', tags: ['prod', 'infra'] },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '10m' },
  evaluation: { query: { base: 'FROM logs-* | STATS count() BY host.name' } },
  createdBy: 'alice@example.com',
  createdAt: '2026-03-01T12:00:00.000Z',
  updatedBy: 'bob@example.com',
  updatedAt: '2026-03-04T12:00:00.000Z',
};

const renderPage = (rule: RuleApiResponse) =>
  render(
    <MemoryRouter>
      <I18nProvider>
        <RuleProvider rule={rule}>
          <RuleDetailPage />
        </RuleProvider>
      </I18nProvider>
    </MemoryRouter>
  );

describe('RuleDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wires breadcrumbs with the rule name', () => {
    renderPage(baseRule);
    expect(mockUseBreadcrumbs).toHaveBeenCalledWith('rule_details', {
      ruleName: 'Test Signal Rule',
    });
  });

  it('renders core page sections and actions', () => {
    renderPage(baseRule);
    expect(screen.getByTestId('ruleTitleWithBadges')).toBeInTheDocument();
    expect(screen.getByTestId('ruleHeaderDescription')).toBeInTheDocument();
    expect(screen.getByTestId('ruleConditionsSection')).toBeInTheDocument();
    expect(screen.getByTestId('ruleMetadataSection')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDetailsActionsButton')).toBeInTheDocument();
    expect(screen.getByTestId('openEditRuleFlyoutButton')).toBeInTheDocument();
  });

  it('renders edit button with correct href', () => {
    renderPage(baseRule);
    expect(screen.getByTestId('openEditRuleFlyoutButton')).toHaveAttribute(
      'href',
      '/app/management/alertingV2/rules/edit/rule-1'
    );
  });

  it('opens delete confirmation from actions menu', () => {
    renderPage(baseRule);
    fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
    expect(screen.getByTestId('deleteRuleConfirmationModal')).toBeInTheDocument();
  });

  it('calls delete mutation and navigates on successful confirm', () => {
    renderPage(baseRule);
    fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(mockDeleteRule).toHaveBeenCalledWith(
      'rule-1',
      expect.objectContaining({
        onSuccess: expect.any(Function),
      })
    );

    const [, options] = mockDeleteRule.mock.calls[0];
    options.onSuccess();
    expect(mockHistoryPush).toHaveBeenCalledWith('/');
  });

  it('closes delete modal when cancel is clicked', () => {
    renderPage(baseRule);
    fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByTestId('deleteRuleConfirmationModal')).not.toBeInTheDocument();
  });
});
