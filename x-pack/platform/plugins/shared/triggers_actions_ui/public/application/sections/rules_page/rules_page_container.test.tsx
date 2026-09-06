/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import * as React from 'react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { triggersActionsRoute } from '@kbn/rule-data-utils';
import { ALERTING_V2_RULES_BASE_PATH } from '@kbn/alerting-v2-constants';
import { getIsExperimentalFeatureEnabled } from '../../../common/get_experimental_features';
import RulesPage from './rules_page_container';
import { hasShowActionsCapability } from '../../lib/capabilities';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/get_experimental_features');
jest.mock('../../lib/capabilities');

jest.mock('../rules_list/components/rules_list', () => {
  return () => <div data-test-subj="rulesListComponents">{'Render Rule list component'}</div>;
});

jest.mock('../rule_details/components/global_rule_event_log_list', () => {
  return () => <div data-test-subj="globalRuleEventLogList">{'Render Logs list component'}</div>;
});

jest.mock('../../components/rules_setting/rules_settings_flyout', () => ({
  RulesSettingsFlyout: ({ isVisible }: { isVisible: boolean }) =>
    isVisible ? (
      <div data-test-subj="rulesSettingsFlyout">{'Render Rules Settings Flyout component'}</div>
    ) : null,
}));

jest.mock('@kbn/response-ops-rule-form', () => ({
  RuleTypeModal: () => <div data-test-subj="ruleTypeModal">{'Render Rule Type Modal'}</div>,
}));

jest.mock('@kbn/ebt-tools', () => ({
  PerformanceContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@kbn/alerts-ui-shared/src/common/hooks/use_get_rule_types_permissions', () => ({
  useGetRuleTypesPermissions: jest.fn().mockReturnValue({
    authorizedToReadAnyRules: true,
    authorizedToCreateAnyRules: true,
  }),
}));

const { useGetRuleTypesPermissions } = jest.requireMock(
  '@kbn/alerts-ui-shared/src/common/hooks/use_get_rule_types_permissions'
);

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const MOCK_BASE_PATH = '/mock-base';

const renderRulesPage = (history = createMemoryHistory({ initialEntries: ['/'] })) =>
  render(
    <IntlProvider locale="en">
      <Router history={history}>
        <QueryClientProvider client={new QueryClient()}>
          <MockAppHeaderProvider>
            <RulesPage />
          </MockAppHeaderProvider>
        </QueryClientProvider>
      </Router>
    </IntlProvider>
  );

describe('rulesPage', () => {
  beforeEach(() => {
    (hasShowActionsCapability as jest.Mock).mockClear();
    (getIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(() => false);
    useGetRuleTypesPermissions.mockReturnValue({
      authorizedToReadAnyRules: true,
      authorizedToCreateAnyRules: true,
    });
    // Non-empty so the href assertions prove each tab is run through `basePath.prepend`.
    useKibanaMock().services.http.basePath.prepend = jest.fn(
      (path: string) => `${MOCK_BASE_PATH}${path}`
    );
  });

  it('renders rule list components', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    renderRulesPage(history);

    expect(await screen.findByTestId('rulesListComponents')).toBeInTheDocument();
  });

  it('shows the correct number of tabs', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    renderRulesPage(history);

    expect(await screen.findAllByRole('tab')).toHaveLength(2);
  });

  it('hides the logs tab if the read rules privilege is missing', async () => {
    useGetRuleTypesPermissions.mockReturnValue({
      authorizedToReadAnyRules: false,
    });
    const history = createMemoryHistory({ initialEntries: ['/'] });

    renderRulesPage(history);

    expect(await screen.findAllByRole('tab')).toHaveLength(1);
  });

  it('points the back button at Alerts on the rules list', async () => {
    useKibanaMock().services.application.getUrlForApp = jest.fn(
      () => '/app/observability-overview/alerts'
    );
    const history = createMemoryHistory({ initialEntries: ['/'] });
    renderRulesPage(history);

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAccessibleName(
      'Back to Alerts'
    );
  });

  it('keeps classic Logs on the Rules heading with a back button to Alerts', async () => {
    useKibanaMock().services.application.getUrlForApp = jest.fn(
      () => '/app/observability-overview/alerts'
    );
    const history = createMemoryHistory({ initialEntries: ['/logs'] });
    renderRulesPage(history);

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Rules');
    expect(await screen.findAllByRole('tab')).toHaveLength(2);
    const back = await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.back);
    expect(back).toHaveAccessibleName('Back to Alerts');
    expect(back).toHaveAttribute('href', '/app/observability-overview/alerts');
  });

  describe('setHeaderActions', () => {
    beforeEach(() => {
      useKibanaMock().services.application.capabilities = {
        ...useKibanaMock().services.application.capabilities,
        rulesSettings: {
          show: true,
          readFlappingSettingsUI: true,
          readQueryDelaySettingsUI: true,
        },
      };
    });

    it('should render the header actions correctly when the user is authorized to create rules', async () => {
      useGetRuleTypesPermissions.mockReturnValue({
        authorizedToReadAnyRules: true,
        authorizedToCreateAnyRules: true,
      });
      const history = createMemoryHistory({ initialEntries: ['/'] });
      renderRulesPage(history);

      expect(await screen.findByTestId('createRuleButton')).toBeInTheDocument();

      // Secondary and static menu items collapse into the "More" overflow popover at the jsdom
      // viewport width, so open it before asserting on them.
      await openAppMenuOverflow();
      expect(await screen.findByTestId('rulesSettingsLink')).toBeInTheDocument();
      expect(
        await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)
      ).toBeInTheDocument();
    });

    it('should not render the create rule button when the user is not authorized to create rules', async () => {
      useGetRuleTypesPermissions.mockReturnValue({
        authorizedToReadAnyRules: true,
        authorizedToCreateAnyRules: false,
      });
      const history = createMemoryHistory({ initialEntries: ['/'] });
      renderRulesPage(history);

      await openAppMenuOverflow();
      expect(await screen.findByTestId('rulesSettingsLink')).toBeInTheDocument();
      expect(
        await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)
      ).toBeInTheDocument();
      // The create rule button is the primary action and is never rendered when unauthorized, so it
      // is genuinely absent (not merely hidden in the overflow popover).
      expect(screen.queryByTestId('createRuleButton')).not.toBeInTheDocument();
    });

    it('opens the create rule modal from the header action', async () => {
      const history = createMemoryHistory({ initialEntries: ['/'] });
      renderRulesPage(history);

      expect(screen.queryByTestId('ruleTypeModal')).not.toBeInTheDocument();
      await userEvent.click(await screen.findByTestId('createRuleButton'));
      expect(await screen.findByTestId('ruleTypeModal')).toBeInTheDocument();
    });

    it('opens the settings flyout from the header menu', async () => {
      const history = createMemoryHistory({ initialEntries: ['/'] });
      renderRulesPage(history);

      expect(screen.queryByTestId('rulesSettingsFlyout')).not.toBeInTheDocument();
      await openAppMenuOverflow();
      // EUI overflow popovers set pointer-events: none in jsdom; fireEvent still invokes run.
      fireEvent.click(await screen.findByTestId('rulesSettingsLink'));
      expect(await screen.findByTestId('rulesSettingsFlyout')).toBeInTheDocument();
    });
  });

  describe('when alerting v2 is enabled', () => {
    beforeEach(() => {
      (useKibanaMock().services.settings.globalClient.get as jest.Mock).mockReturnValue(true);
    });

    describe('and the user can read v2 rules', () => {
      beforeEach(() => {
        useKibanaMock().services.application.capabilities = {
          ...useKibanaMock().services.application.capabilities,
          alerting_v2_rules: { read: true },
        };
      });

      it('replaces the Rules/Logs tabs with V1 rules/V2 rules tabs', async () => {
        const history = createMemoryHistory({ initialEntries: ['/'] });
        renderRulesPage(history);

        expect(await screen.findByTestId('v1RulesTab')).toBeInTheDocument();
        expect(await screen.findByTestId('v2RulesTab')).toBeInTheDocument();
        expect(screen.queryByTestId('rulesTab')).not.toBeInTheDocument();
        expect(screen.queryByTestId('logsTab')).not.toBeInTheDocument();
        expect(await screen.findAllByRole('tab')).toHaveLength(2);
      });

      it('selects the V1 rules tab on the rules list', async () => {
        const history = createMemoryHistory({ initialEntries: ['/'] });
        renderRulesPage(history);

        expect(await screen.findByTestId('v1RulesTab')).toHaveAttribute('aria-selected', 'true');
        expect(await screen.findByTestId('v2RulesTab')).toHaveAttribute('aria-selected', 'false');
      });

      it('orders the V2 rules tab before the V1 rules tab', async () => {
        const history = createMemoryHistory({ initialEntries: ['/'] });
        renderRulesPage(history);

        const tabs = await screen.findAllByRole('tab');

        expect(tabs.map((tab) => tab.getAttribute('data-test-subj'))).toEqual([
          'v2RulesTab',
          'v1RulesTab',
        ]);
      });

      it('points each tab at its own app, under the server base path', async () => {
        const history = createMemoryHistory({ initialEntries: ['/'] });
        renderRulesPage(history);

        expect(await screen.findByTestId('v1RulesTab')).toHaveAttribute(
          'href',
          `${MOCK_BASE_PATH}${triggersActionsRoute}`
        );
        expect(await screen.findByTestId('v2RulesTab')).toHaveAttribute(
          'href',
          `${MOCK_BASE_PATH}${ALERTING_V2_RULES_BASE_PATH}`
        );
      });

      it('uses a Logs heading with a back button to Rules and no Logs menu item', async () => {
        const history = createMemoryHistory({ initialEntries: ['/logs'] });
        renderRulesPage(history);

        expect(await screen.findByTestId('globalRuleEventLogList')).toBeInTheDocument();
        expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Logs');
        const back = await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.back);
        expect(back).toHaveAccessibleName('Back to Rules');
        expect(back).toHaveAttribute('href', expect.stringContaining('triggersActions'));
        expect(screen.queryByTestId('v1RulesTab')).not.toBeInTheDocument();
        expect(screen.queryByTestId('v2RulesTab')).not.toBeInTheDocument();
        expect(screen.queryByTestId('createRuleButton')).not.toBeInTheDocument();

        await openAppMenuOverflow();
        expect(screen.queryByTestId('rulesLogsLink')).not.toBeInTheDocument();
      });

      it('moves Logs into the header menu instead of a tab', async () => {
        const history = createMemoryHistory({ initialEntries: ['/'] });
        renderRulesPage(history);

        await openAppMenuOverflow();
        expect(await screen.findByTestId('rulesLogsLink')).toBeInTheDocument();
        // EUI overflow popovers set pointer-events: none in jsdom; fireEvent still invokes run.
        fireEvent.click(await screen.findByTestId('rulesLogsLink'));
        expect(history.location.pathname).toBe('/logs');
        expect(await screen.findByTestId('globalRuleEventLogList')).toBeInTheDocument();
      });

      it('omits the Logs menu item if the read rules privilege is missing', async () => {
        useGetRuleTypesPermissions.mockReturnValue({
          authorizedToReadAnyRules: false,
        });
        const history = createMemoryHistory({ initialEntries: ['/'] });
        renderRulesPage(history);

        await openAppMenuOverflow();
        expect(screen.queryByTestId('rulesLogsLink')).not.toBeInTheDocument();
      });
    });

    describe('and the user cannot read v2 rules', () => {
      beforeEach(() => {
        const { alerting_v2_rules: _alertingV2Rules, ...capabilitiesWithoutV2 } =
          useKibanaMock().services.application.capabilities;
        useKibanaMock().services.application.capabilities = capabilitiesWithoutV2;
      });

      it('hides heading tabs rather than keeping Rules/Logs', async () => {
        const history = createMemoryHistory({ initialEntries: ['/'] });
        renderRulesPage(history);

        await screen.findByTestId('rulesListComponents');
        expect(screen.queryByRole('tab')).not.toBeInTheDocument();
        expect(screen.queryByTestId('rulesTab')).not.toBeInTheDocument();
        expect(screen.queryByTestId('logsTab')).not.toBeInTheDocument();
        expect(screen.queryByTestId('v1RulesTab')).not.toBeInTheDocument();
        expect(screen.queryByTestId('v2RulesTab')).not.toBeInTheDocument();
      });

      it('still puts Logs in the header menu', async () => {
        const history = createMemoryHistory({ initialEntries: ['/'] });
        renderRulesPage(history);

        await openAppMenuOverflow();
        expect(await screen.findByTestId('rulesLogsLink')).toBeInTheDocument();
      });
    });
  });
});
