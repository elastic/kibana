/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryRouter } from 'react-router-dom';
import { MockChromeContextProvider } from '@kbn/core-chrome-browser-context-mocks';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { RULE_KIND_TOOLTIPS } from '@kbn/alerting-v2-constants';
import { RuleDetailPage } from './rule_detail_page';
import { RuleProvider } from './rule_context';
import { paths } from '../../constants';
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

const mockToggleRuleEnabled = jest.fn();
jest.mock('../../hooks/use_toggle_rule_enabled', () => ({
  useToggleRuleEnabled: () => ({ mutate: mockToggleRuleEnabled }),
}));

jest.mock('../../hooks/use_bulk_get_user_profiles', () => ({
  useBulkGetUserProfiles: () => ({ data: undefined }),
}));

const mockOpenEditFlyout = jest.fn();
const mockOpenCloneFlyout = jest.fn();
jest.mock('../../hooks/use_compose_discover_flyout', () => ({
  useComposeDiscoverFlyout: () => ({
    flyout: null,
    openCreateFlyout: jest.fn(),
    openEditFlyout: mockOpenEditFlyout,
    openCloneFlyout: mockOpenCloneFlyout,
  }),
}));

jest.mock('./sidebar/rule_sidebar', () => ({
  RuleSidebar: () => (
    <div>
      <div data-test-subj="ruleConditionsSection">conditions</div>
      <div data-test-subj="ruleMetadataSection">metadata</div>
    </div>
  ),
}));

jest.mock('./overview', () => ({
  RuleOverviewSection: () => <div data-test-subj="ruleOverviewSectionMock">overview</div>,
}));

const baseRule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: {
    name: 'Test Signal Rule',
    description: 'Test rule description',
    tags: ['prod', 'infra'],
  },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '10m' },
  query: {
    format: 'standalone',
    breach: { query: 'FROM logs-* | STATS count() BY host.name' },
  },
  createdBy: 'alice@example.com',
  createdAt: '2026-03-01T12:00:00.000Z',
  updatedBy: 'bob@example.com',
  updatedAt: '2026-03-04T12:00:00.000Z',
};

const renderPage = (rule: RuleApiResponse) =>
  render(
    <MemoryRouter>
      <I18nProvider>
        <MockChromeContextProvider>
          <RuleProvider rule={rule}>
            <RuleDetailPage />
          </RuleProvider>
        </MockChromeContextProvider>
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

  it('renders the app header title and description in the body', () => {
    renderPage(baseRule);
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Test Signal Rule'
    );
    expect(screen.getByTestId('ruleDescription')).toHaveTextContent('Test rule description');
    expect(screen.queryByTestId('ruleTags')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleConditionsSection')).toBeInTheDocument();
    expect(screen.getByTestId('ruleMetadataSection')).toBeInTheDocument();
  });

  it('renders created and last-updated metadata in the app header', () => {
    renderPage(baseRule);
    expect(screen.getByTestId('ruleCreatedByMetadata')).toHaveTextContent(
      `Created by alice@example.com on ${moment('2026-03-01T12:00:00.000Z').format('ll')}`
    );
    expect(screen.getByTestId('ruleUpdatedByMetadata')).toHaveTextContent(
      `Last update by bob@example.com on ${moment('2026-03-04T12:00:00.000Z').format('ll')}`
    );
  });

  it('renders a back link to the rules list', () => {
    renderPage(baseRule);
    const backButton = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back);
    expect(backButton).toHaveAttribute('href', expect.stringContaining(paths.ruleList));
  });

  it('renders native kind, status, and tag badges in the app header', () => {
    renderPage(baseRule);
    const kindBadge = screen.getByTestId('kindBadge');
    expect(kindBadge).toHaveTextContent('Signal');
    expect(kindBadge.querySelector('[data-euiicon-type="radar"]')).toBeInTheDocument();
    expect(screen.getByTestId('enabledBadge')).toHaveTextContent('Enabled');
    expect(screen.queryByTestId('disabledBadge')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('+2'));
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('infra')).toBeInTheDocument();
  });

  it('renders alert kind badge with its icon and disabled status badge', () => {
    renderPage({ ...baseRule, kind: 'alert', enabled: false });
    const kindBadge = screen.getByTestId('kindBadge');
    expect(kindBadge).toHaveTextContent('Alert');
    expect(kindBadge.querySelector('[data-euiicon-type="bell"]')).toBeInTheDocument();
    expect(screen.getByTestId('disabledBadge')).toHaveTextContent('Disabled');
    expect(screen.queryByTestId('enabledBadge')).not.toBeInTheDocument();
  });

  it('renders kind-specific tooltip on the kind badge', async () => {
    renderPage(baseRule);
    fireEvent.mouseOver(screen.getByTestId('kindBadge'));
    await waitFor(() => {
      expect(screen.getByText(RULE_KIND_TOOLTIPS.signal)).toBeInTheDocument();
    });
  });

  it('opens the edit flyout when edit button is clicked', () => {
    renderPage(baseRule);
    fireEvent.click(screen.getByTestId('openEditRuleFlyoutButton'));
    expect(mockOpenEditFlyout).toHaveBeenCalledWith(baseRule);
  });

  it('calls toggleRuleEnabled with enabled=false when disable is clicked', async () => {
    renderPage(baseRule);
    await openAppMenuOverflow();
    fireEvent.click(await screen.findByTestId('ruleDetailsDisableButton'));
    expect(mockToggleRuleEnabled).toHaveBeenCalledWith({ id: 'rule-1', enabled: false });
  });

  it('calls toggleRuleEnabled with enabled=true when enable is clicked', async () => {
    renderPage({ ...baseRule, enabled: false });
    await openAppMenuOverflow();
    fireEvent.click(await screen.findByTestId('ruleDetailsEnableButton'));
    expect(mockToggleRuleEnabled).toHaveBeenCalledWith({ id: 'rule-1', enabled: true });
  });

  it('opens the clone flyout when clone is clicked', async () => {
    renderPage(baseRule);
    await openAppMenuOverflow();
    fireEvent.click(await screen.findByTestId('ruleDetailsCloneButton'));
    expect(mockOpenCloneFlyout).toHaveBeenCalledWith(baseRule);
  });

  it('opens delete confirmation from the overflow menu', async () => {
    renderPage(baseRule);
    await openAppMenuOverflow();
    fireEvent.click(await screen.findByTestId('ruleDetailsDeleteButton'));
    expect(screen.getByTestId('deleteRuleConfirmationModal')).toBeInTheDocument();
  });

  it('calls delete mutation and navigates on successful confirm', async () => {
    renderPage(baseRule);
    await openAppMenuOverflow();
    fireEvent.click(await screen.findByTestId('ruleDetailsDeleteButton'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(mockDeleteRule).toHaveBeenCalledWith(
      { id: 'rule-1', name: 'Test Signal Rule' },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      })
    );

    const [, options] = mockDeleteRule.mock.calls[0];
    options.onSuccess();
    expect(mockHistoryPush).toHaveBeenCalledWith('/');
  });

  it('closes delete modal when cancel is clicked', async () => {
    renderPage(baseRule);
    await openAppMenuOverflow();
    fireEvent.click(await screen.findByTestId('ruleDetailsDeleteButton'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByTestId('deleteRuleConfirmationModal')).not.toBeInTheDocument();
  });
});
