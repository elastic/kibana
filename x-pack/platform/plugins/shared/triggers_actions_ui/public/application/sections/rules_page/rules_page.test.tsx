/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import * as React from 'react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { getIsExperimentalFeatureEnabled } from '../../../common/get_experimental_features';
import RulesPage from './rules_page';
import { hasShowActionsCapability } from '../../lib/capabilities';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/get_experimental_features');
jest.mock('../../lib/capabilities');

jest.mock('../rules_list/components/rules_list', () => {
  return () => <div data-test-subj="rulesListComponents">{'Render Rule list component'}</div>;
});

jest.mock('../../components/rules_setting/rules_settings_flyout', () => ({
  RulesSettingsFlyout: () => (
    <div data-test-subj="rulesSettingsFlyout">{'Render Rules Settings Flyout component'}</div>
  ),
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
    useGetRuleTypesPermissions.mockClear();
  });

  it('renders rule list components', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    renderRulesPage(history);

    expect(await screen.findByTestId('rulesListComponents')).toBeInTheDocument();
  });

  it('shows the correct number of tabs', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    renderRulesPage(history);

    // Just rules and logs
    expect(await screen.findAllByRole('tab')).toHaveLength(2);
  });

  it('hides the logs tab if the read rules privilege is missing', async () => {
    useGetRuleTypesPermissions.mockReturnValue({
      authorizedToReadAnyRules: false,
    });
    const history = createMemoryHistory({ initialEntries: ['/'] });

    renderRulesPage(history);

    // Just rules
    expect(await screen.findAllByRole('tab')).toHaveLength(1);
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

      // The primary action renders directly in the header.
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
  });
});
