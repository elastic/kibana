/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fromKueryExpression } from '@kbn/es-query';
import type { IToasts } from '@kbn/core/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { getIsExperimentalFeatureEnabled } from '../../../common/get_experimental_features';
import { ConnectorRulesList } from './connector_rules_list';
import { useKibana } from '../../../common/lib/kibana';
import { ActionConnector } from '../../../types';
import { mockedRulesData, ruleTypeFromApi } from '../rules_list/components/test_helpers';

jest.mock('../../../common/lib/kibana');
jest.mock('../../lib/rule_api/rules_kuery_filter', () => ({
  loadRulesWithKueryFilter: jest.fn(),
}));
jest.mock('../../lib/rule_api/rule_types', () => ({
  loadRuleTypes: jest.fn(),
}));
jest.mock('../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));

const { loadRuleTypes } = jest.requireMock('../../lib/rule_api/rule_types');
const { loadRulesWithKueryFilter } = jest.requireMock('../../lib/rule_api/rules_kuery_filter');

const getUrlForAppMock = jest.fn();
const addSuccessMock = jest.fn();
const addErrorMock = jest.fn();
const addDangerMock = jest.fn();

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

describe('Connector rules list', () => {
  beforeAll(() => {
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
    useKibanaMock().services.application.getUrlForApp = getUrlForAppMock;
    useKibanaMock().services.notifications.toasts = {
      addSuccessMock,
      addErrorMock,
      addDangerMock,
    } as unknown as IToasts;
    loadRulesWithKueryFilter.mockResolvedValue({
      page: 1,
      perPage: 25,
      total: mockedRulesData.length,
      data: mockedRulesData,
    });
    loadRuleTypes.mockResolvedValue([ruleTypeFromApi]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConnectorRulesList
            connector={
              {
                id: 'test-id',
                isPreconfigured: false,
                isSystemAction: false,
              } as ActionConnector
            }
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('connectorRulesList')).toBeInTheDocument();
      expect(screen.queryAllByTestId('connectorRuleRow')).toHaveLength(mockedRulesData.length);
    });
  });

  it('should allow for sorting by name', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConnectorRulesList
            connector={
              {
                id: 'test-id',
                isPreconfigured: false,
                isSystemAction: false,
              } as ActionConnector
            }
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.queryAllByTestId('connectorRuleRow')).toHaveLength(mockedRulesData.length);
    });

    const nameColumnTableHeaderEl = await screen.findByTestId('tableHeaderCell_name_0');

    const el = nameColumnTableHeaderEl.querySelector(
      '[data-test-subj="tableHeaderCell_name_0"] .euiTableHeaderButton'
    ) as HTMLElement;

    fireEvent.click(el);

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sort: { direction: 'desc', field: 'name' },
      })
    );
  });

  it('should allow for searching by text', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConnectorRulesList
            connector={
              {
                id: 'test-id',
                isPreconfigured: false,
                isSystemAction: false,
              } as ActionConnector
            }
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.queryAllByTestId('connectorRuleRow')).toHaveLength(mockedRulesData.length);
    });

    await userEvent.type(screen.getByTestId('connectorRulesListSearch'), 'test{enter}');

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        searchText: 'test',
      })
    );
  });

  it('should find preconfigured rules correctly', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConnectorRulesList
            connector={
              {
                id: 'test-id',
                isPreconfigured: true,
                isSystemAction: false,
              } as ActionConnector
            }
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.queryAllByTestId('connectorRuleRow')).toHaveLength(mockedRulesData.length);
    });

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hasReference: undefined,
        kueryNode: fromKueryExpression(
          `alert.attributes.actions:{ actionRef: "preconfigured:test-id" }`
        ),
      })
    );
  });

  it('should find system actions rules correctly', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConnectorRulesList
            connector={
              {
                id: 'test-id',
                isPreconfigured: false,
                isSystemAction: true,
              } as ActionConnector
            }
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.queryAllByTestId('connectorRuleRow')).toHaveLength(mockedRulesData.length);
    });

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hasReference: undefined,
        kueryNode: fromKueryExpression(
          `alert.attributes.actions:{ actionRef: "system_action:test-id" }`
        ),
      })
    );
  });
});
