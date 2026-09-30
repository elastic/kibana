/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';
import type { IToasts } from '@kbn/core/public';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import * as React from 'react';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import { RulesList } from './rules_list';
import {
  getDisabledByLicenseRuleTypeFromApi,
  mockedRulesData,
  ruleType,
  ruleTypeFromApi,
} from './test_helper';
import { loadRuleAggregationsWithKueryFilter as loadRuleAggregationsWithKueryFilterFn } from '../../../lib/rule_api/aggregate_kuery_filter';
import { getRuleTypes as getRuleTypesFn } from '@kbn/response-ops-rules-apis/apis/get_rule_types';
import { loadRulesWithKueryFilter as loadRulesWithKueryFilterFn } from '../../../lib/rule_api/rules_kuery_filter';
import {
  loadActionTypes as loadActionTypesFn,
  loadAllActions as loadAllActionsFn,
} from '../../../lib/action_connector_api';

vi.mock('../../../../common/lib/kibana');
vi.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => {
  const mocked = {
    useUiSetting: vi.fn(() => false),
    useUiSetting$: vi.fn((value: string) => ['0,0']),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/action_connector_api', () => {
  const mocked = {
    loadActionTypes: vi.fn(),
    loadAllActions: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/rule_api/rules_kuery_filter', () => {
  const mocked = {
    loadRulesWithKueryFilter: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/response-ops-rules-apis/apis/get_rule_types', () => {
  const mocked = {
    getRuleTypes: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/rule_api/aggregate_kuery_filter', () => {
  const mocked = {
    loadRuleAggregationsWithKueryFilter: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/rule_api/update_api_key', () => {
  const mocked = {
    updateAPIKey: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/rule_api/aggregate', () => {
  const mocked = {
    loadRuleTags: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/rule_api/snooze', () => {
  const mocked = {
    bulkSnoozeRules: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/rule_api/unsnooze', () => {
  const mocked = {
    bulkUnsnoozeRules: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/rule_api/update_api_key', () => {
  const mocked = {
    bulkUpdateAPIKey: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_alerting_framework_health', () => {
  const mocked = {
    fetchAlertingFrameworkHealth: vi.fn(() => ({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: true,
    })),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/rule_api/aggregate_kuery_filter');
vi.mock('../../../lib/rule_api/rules_kuery_filter');
vi.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_ui_health_status', () => {
  const mocked = {
    fetchUiHealthStatus: vi.fn(() => ({ isRulesAvailable: true })),
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/response-ops-rule-form/src/common/apis/fetch_ui_config', () => {
  const mocked = {
    fetchUiConfig: vi
      .fn()
      .mockResolvedValue({ minimumScheduleInterval: { value: '1m', enforce: false } }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('react-router-dom', () => {
  const history = {
    push: vi.fn(),
    createHref: vi.fn(({ pathname }: { pathname: string }) => pathname),
  };
  return {
    useHistory: () => history,
    useLocation: () => ({
      pathname: '/triggersActions/rules/',
    }),
  };
});
vi.mock('../../../lib/capabilities', () => {
  const mocked = {
    hasAllPrivilege: vi.fn(() => true),
    hasSaveRulesCapability: vi.fn(() => true),
    hasShowActionsCapability: vi.fn(() => true),
    hasExecuteActionsCapability: vi.fn(() => true),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../common/get_experimental_features', () => {
  const mocked = {
    getIsExperimentalFeatureEnabled: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/rule_api/aggregate_kuery_filter', () => {
  const mocked = {
    loadRuleAggregationsWithKueryFilter: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/alerts-ui-shared', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/alerts-ui-shared')),
    MaintenanceWindowCallout: vi.fn(() => <></>),
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/kibana-utils-plugin/public', async () => {
  const originalModule = await vi.importActual('@kbn/kibana-utils-plugin/public');
  return {
    ...originalModule,
    createKbnUrlStateStorage: vi.fn(() => ({
      get: vi.fn(() => null),
      set: vi.fn(() => null),
    })),
  };
});
vi.mock('react-use/lib/useLocalStorage', () => ({ default: vi.fn(() => [null, () => null]) }));
vi.mock('@kbn/ebt-tools');
vi.mock('@kbn/cps-utils', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/cps-utils')),
    useRouteBasedCpsPickerAccess: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const usePerformanceContextMock = usePerformanceContext as Mock;
usePerformanceContextMock.mockReturnValue({ onPageReady: vi.fn() });

const loadRuleAggregationsWithKueryFilter = loadRuleAggregationsWithKueryFilterFn as Mock;
const getRuleTypes = getRuleTypesFn as Mock;
const loadRulesWithKueryFilter = loadRulesWithKueryFilterFn as Mock;
const loadActionTypes = loadActionTypesFn as Mock;
const loadAllActions = loadAllActionsFn as Mock;

const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();

ruleTypeRegistry.list.mockReturnValue([ruleType]);
actionTypeRegistry.list.mockReturnValue([]);

const useKibanaMock = useKibana as Mocked<typeof useKibana>;
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
    (getIsExperimentalFeatureEnabled as Mock<(...args: any) => any>).mockImplementation(
      () => false
    );
    loadRulesWithKueryFilter.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 6,
      data: mockedRulesData,
    });
    loadActionTypes.mockResolvedValue([]);
    getRuleTypes.mockResolvedValue([ruleTypeFromApi, getDisabledByLicenseRuleTypeFromApi()]);
    loadAllActions.mockResolvedValue([]);
    loadRuleAggregationsWithKueryFilter.mockResolvedValue({});
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    useKibanaMock().services.notifications.toasts = {
      addSuccess: vi.fn(),
      addError: vi.fn(),
      addDanger: vi.fn(),
      addWarning: vi.fn(),
    } as unknown as IToasts;
  });

  afterEach(() => {
    vi.clearAllMocks();
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
    getRuleTypes.mockResolvedValue([ruleTypeFromApi, getDisabledByLicenseRuleTypeFromApi(false)]);
    renderWithProviders(<RulesList />);
    await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

    fireEvent.click(screen.getByTestId('checkboxSelectRow-1'));

    expect(screen.queryByTestId('showBulkActionButton')).toBeInTheDocument();
    expect(screen.queryByTestId('selectAllRulesButton')).not.toBeInTheDocument();
  });
});
