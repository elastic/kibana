/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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

let mockCanWriteRules = true;

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'http') {
      return { basePath: { prepend: (p: string) => p } };
    }
    if (typeof token === 'function') {
      // UserCapabilities service token
      return {
        canWrite: (feature: string) => (feature === 'rules' ? mockCanWriteRules : true),
        canRead: () => true,
        can: () => mockCanWriteRules,
      };
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
let mockIsToggling = false;
jest.mock('../../hooks/use_toggle_rule_enabled', () => ({
  useToggleRuleEnabled: () => ({ mutate: mockToggleRuleEnabled, isLoading: mockIsToggling }),
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

const mockAppHeaderRender = jest.fn();
jest.mock('@kbn/app-header', () => {
  const actual = jest.requireActual('@kbn/app-header');
  return {
    ...actual,
    AppHeader: (props: React.ComponentProps<typeof actual.AppHeader>) => {
      mockAppHeaderRender(props.menu);
      return <actual.AppHeader {...props} />;
    },
  };
});

const mockRuleKindBadgeRender = jest.fn();
jest.mock('./rule_summary_header', () => {
  const actual = jest.requireActual('./rule_summary_header');
  return {
    ...actual,
    RuleKindBadge: (props: { kind: string }) => {
      mockRuleKindBadgeRender();
      return <actual.RuleKindBadge {...props} />;
    },
  };
});

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
    mockIsToggling = false;
    mockCanWriteRules = true;
  });

  it('wires breadcrumbs with the rule name', () => {
    renderPage(baseRule);
    expect(mockUseBreadcrumbs).toHaveBeenCalledWith('rule_details', {
      ruleName: 'Test Signal Rule',
    });
  });

  it('renders the app header title and description in the body', async () => {
    renderPage(baseRule);
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Test Signal Rule'
    );
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.metadata)).toBeInTheDocument();
    expect(screen.getByTestId('ruleDescription')).toHaveTextContent('Test rule description');
    expect(screen.queryByTestId('ruleTags')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleConditionsSection')).toBeInTheDocument();
    expect(screen.getByTestId('ruleMetadataSection')).toBeInTheDocument();
    expect(await screen.findByTestId('ruleDetailsEnabledSwitch')).toBeInTheDocument();
  });

  it('omits the header metadata row when the rule has no description', () => {
    renderPage({
      ...baseRule,
      metadata: { ...baseRule.metadata, description: undefined },
    });

    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.metadata)).not.toBeInTheDocument();
    expect(screen.queryByTestId('ruleDescription')).not.toBeInTheDocument();
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

  it('does not render enable/disable options in the overflow menu', async () => {
    renderPage(baseRule);
    await openAppMenuOverflow();
    expect(screen.queryByTestId('ruleDetailsDisableButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ruleDetailsEnableButton')).not.toBeInTheDocument();
  });

  it('renders a checked enabled switch for enabled rules and disables the rule when toggled off', async () => {
    renderPage(baseRule);
    const toggle = await screen.findByTestId('ruleDetailsEnabledSwitch');
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(mockToggleRuleEnabled).toHaveBeenCalledWith({ id: 'rule-1', enabled: false });
  });

  it('renders an unchecked enabled switch for disabled rules and enables the rule when toggled on', async () => {
    renderPage({ ...baseRule, enabled: false });
    const toggle = await screen.findByTestId('ruleDetailsEnabledSwitch');
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(mockToggleRuleEnabled).toHaveBeenCalledWith({ id: 'rule-1', enabled: true });
  });

  it('disables the switch while the toggle mutation is in flight', async () => {
    mockIsToggling = true;
    renderPage(baseRule);
    expect(await screen.findByTestId('ruleDetailsEnabledSwitch')).toBeDisabled();
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

  describe('when the user only has read privilege', () => {
    beforeEach(() => {
      mockCanWriteRules = false;
    });

    it('hides the edit button, enabled switch, and overflow write actions', async () => {
      renderPage(baseRule);

      expect(screen.queryByTestId('openEditRuleFlyoutButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ruleDetailsEnabledSwitch')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ruleDetailsCloneButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ruleDetailsDeleteButton')).not.toBeInTheDocument();
    });

    it('still shows the read-only enabled status badge', () => {
      renderPage(baseRule);

      expect(screen.getByTestId('enabledBadge')).toHaveTextContent('Enabled');
    });
  });

  it('does not re-render the header badges when the delete modal opens and closes', async () => {
    renderPage(baseRule);
    const renderCountBeforeToggle = mockRuleKindBadgeRender.mock.calls.length;
    const menuBeforeToggle =
      mockAppHeaderRender.mock.calls[mockAppHeaderRender.mock.calls.length - 1][0];

    await openAppMenuOverflow();
    fireEvent.click(await screen.findByTestId('ruleDetailsDeleteButton'));
    expect(screen.getByTestId('deleteRuleConfirmationModal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByTestId('deleteRuleConfirmationModal')).not.toBeInTheDocument();

    expect(mockRuleKindBadgeRender.mock.calls.length).toBe(renderCountBeforeToggle);
    const menuAfterToggle =
      mockAppHeaderRender.mock.calls[mockAppHeaderRender.mock.calls.length - 1][0];
    expect(menuAfterToggle).toBe(menuBeforeToggle);
  });
});
