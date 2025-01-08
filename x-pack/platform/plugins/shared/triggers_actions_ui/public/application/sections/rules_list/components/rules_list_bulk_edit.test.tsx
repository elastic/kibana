/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as React from 'react';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import { RulesList } from './rules_list';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import {
  mockedRulesData,
  ruleTypeFromApi,
  getDisabledByLicenseRuleTypeFromApi,
  ruleType,
} from './test_helpers';
import { IToasts } from '@kbn/core/public';
import { render, screen, waitForElementToBeRemoved, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../../../../common/lib/kibana');
jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting: jest.fn(() => false),
  useUiSetting$: jest.fn((value: string) => ['0,0']),
}));
jest.mock('../../../lib/action_connector_api', () => ({
  loadActionTypes: jest.fn(),
  loadAllActions: jest.fn(),
}));
jest.mock('../../../lib/rule_api/rules_kuery_filter', () => ({
  loadRulesWithKueryFilter: jest.fn(),
}));
jest.mock('../../../lib/rule_api/rule_types', () => ({
  loadRuleTypes: jest.fn(),
}));
jest.mock('../../../lib/rule_api/aggregate_kuery_filter', () => ({
  loadRuleAggregationsWithKueryFilter: jest.fn(),
}));
jest.mock('../../../lib/rule_api/update_api_key', () => ({
  updateAPIKey: jest.fn(),
}));
jest.mock('../../../lib/rule_api/aggregate', () => ({
  loadRuleTags: jest.fn(),
}));
jest.mock('../../../lib/rule_api/snooze', () => ({
  bulkSnoozeRules: jest.fn(),
}));
jest.mock('../../../lib/rule_api/unsnooze', () => ({
  bulkUnsnoozeRules: jest.fn(),
}));
jest.mock('../../../lib/rule_api/update_api_key', () => ({
  bulkUpdateAPIKey: jest.fn(),
}));
jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_alerting_framework_health', () => ({
  fetchAlertingFrameworkHealth: jest.fn(() => ({
    isSufficientlySecure: true,
    hasPermanentEncryptionKey: true,
  })),
}));
jest.mock('../../../lib/rule_api/aggregate_kuery_filter');
jest.mock('../../../lib/rule_api/rules_kuery_filter');
jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_ui_health_status', () => ({
  fetchUiHealthStatus: jest.fn(() => ({ isRulesAvailable: true })),
}));
jest.mock('@kbn/response-ops-rule-form/src/common/apis/fetch_ui_config', () => ({
  fetchUiConfig: jest
    .fn()
    .mockResolvedValue({ minimumScheduleInterval: { value: '1m', enforce: false } }),
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
  useLocation: () => ({
    pathname: '/triggersActions/rules/',
  }),
}));
jest.mock('../../../lib/capabilities', () => ({
  hasAllPrivilege: jest.fn(() => true),
  hasSaveRulesCapability: jest.fn(() => true),
  hasShowActionsCapability: jest.fn(() => true),
  hasExecuteActionsCapability: jest.fn(() => true),
}));
jest.mock('../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));
jest.mock('../../../lib/rule_api/aggregate_kuery_filter', () => ({
  loadRuleAggregationsWithKueryFilter: jest.fn(),
}));
jest.mock('@kbn/alerts-ui-shared', () => ({ MaintenanceWindowCallout: jest.fn(() => <></>) }));
jest.mock('@kbn/kibana-utils-plugin/public', () => {
  const originalModule = jest.requireActual('@kbn/kibana-utils-plugin/public');
  return {
    ...originalModule,
    createKbnUrlStateStorage: jest.fn(() => ({
      get: jest.fn(() => null),
      set: jest.fn(() => null),
    })),
  };
});
jest.mock('react-use/lib/useLocalStorage', () => jest.fn(() => [null, () => null]));

const { loadRuleAggregationsWithKueryFilter } = jest.requireMock(
  '../../../lib/rule_api/aggregate_kuery_filter'
);
const { loadRuleTypes } = jest.requireMock('../../../lib/rule_api/rule_types');
const { loadRulesWithKueryFilter } = jest.requireMock('../../../lib/rule_api/rules_kuery_filter');
const { loadActionTypes, loadAllActions } = jest.requireMock('../../../lib/action_connector_api');

const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();

ruleTypeRegistry.list.mockReturnValue([ruleType]);
actionTypeRegistry.list.mockReturnValue([]);

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const AllTheProviders = ({ children }: { children: any }) => (
  <IntlProvider locale="en">
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </IntlProvider>
);

const renderWithProviders = (ui: any) => {
  return render(ui, { wrapper: AllTheProviders });
};

describe('Rules list Bulk Edit', () => {
  beforeAll(async () => {
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
    loadRulesWithKueryFilter.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 6,
      data: mockedRulesData,
    });
    loadActionTypes.mockResolvedValue([]);
    loadRuleTypes.mockResolvedValue([ruleTypeFromApi, getDisabledByLicenseRuleTypeFromApi()]);
    loadAllActions.mockResolvedValue([]);
    loadRuleAggregationsWithKueryFilter.mockResolvedValue({});
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    useKibanaMock().services.notifications.toasts = {
      addSuccess: jest.fn(),
      addError: jest.fn(),
      addDanger: jest.fn(),
      addWarning: jest.fn(),
    } as unknown as IToasts;
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders select all button for bulk editing', async () => {
    renderWithProviders(<RulesList />);
    await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

    expect(screen.queryByTestId('totalRulesCount')).toBeInTheDocument();
    expect(screen.queryByTestId('showBulkActionButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('selectAllRulesButton')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('checkboxSelectRow-1'));

    expect(screen.queryByTestId('totalRulesCount')).not.toBeInTheDocument();
    expect(screen.queryByTestId('showBulkActionButton')).toBeInTheDocument();
    expect(screen.queryByTestId('selectAllRulesButton')).toBeInTheDocument();
  });

  it('selects all will select all items', async () => {
    renderWithProviders(<RulesList />);
    await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

    fireEvent.click(screen.getByTestId('checkboxSelectRow-1'));
    fireEvent.click(screen.getByTestId('selectAllRulesButton'));

    mockedRulesData.forEach((rule) => {
      expect(screen.getByTestId(`checkboxSelectRow-${rule.id}`).closest('tr')).toHaveClass(
        'euiTableRow-isSelected'
      );
    });

    fireEvent.click(screen.getByTestId('showBulkActionButton'));

    expect(screen.queryByTestId('ruleQuickEditButton')).toBeInTheDocument();
    expect(screen.queryByTestId('bulkDisable')).toBeInTheDocument();
    expect(screen.queryByTestId('bulkEnable')).toBeInTheDocument();
    expect(screen.queryByTestId('bulkDelete')).toBeInTheDocument();
  });

  it('does not render select all button if the user is not authorized', async () => {
    loadRuleTypes.mockResolvedValue([ruleTypeFromApi, getDisabledByLicenseRuleTypeFromApi(false)]);
    renderWithProviders(<RulesList />);
    await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

    fireEvent.click(screen.getByTestId('checkboxSelectRow-1'));

    expect(screen.queryByTestId('showBulkActionButton')).toBeInTheDocument();
    expect(screen.queryByTestId('selectAllRulesButton')).not.toBeInTheDocument();
  });
});
