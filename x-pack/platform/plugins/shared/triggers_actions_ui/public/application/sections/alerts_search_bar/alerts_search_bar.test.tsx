/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAlertsDataView } from '@kbn/alerts-ui-shared/src/common/hooks/use_alerts_data_view';
import { Filter, FilterStateStore } from '@kbn/es-query';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { NotificationsStart } from '@kbn/core-notifications-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AlertsSearchBar } from './alerts_search_bar';

const mockDataPlugin = dataPluginMock.createStartContract();
jest.mock('@kbn/kibana-utils-plugin/public');
jest.mock('@kbn/alerts-ui-shared/src/common/hooks/use_alerts_data_view');
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: jest.fn(),
}));

jest.mocked(useAlertsDataView).mockReturnValue({
  isLoading: false,
  dataView: {
    title: '.alerts-*',
    fields: [
      {
        name: 'event.action',
        type: 'string',
        aggregatable: true,
        searchable: true,
      },
    ],
  },
});

const mockUseKibana = useKibana as jest.Mock;

const unifiedSearchBarMock = jest.fn().mockImplementation((props) => (
  <button
    data-test-subj="querySubmitButton"
    onClick={() => props.onQuerySubmit({ dateRange: { from: 'now', to: 'now' } })}
    type="button"
  >
    {'Hello world'}
  </button>
));

describe('AlertsSearchBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        data: mockDataPlugin,
        unifiedSearch: {
          ui: {
            SearchBar: unifiedSearchBarMock,
          },
        },
        notifications: { toasts: { addWarning: jest.fn() } } as unknown as NotificationsStart,
      },
    });
  });

  it('renders correctly', async () => {
    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={jest.fn()}
        onFiltersUpdated={jest.fn()}
        onSavedQueryUpdated={jest.fn()}
        onClearSavedQuery={jest.fn()}
        appName={'test'}
      />
    );
    expect(await screen.findByTestId('querySubmitButton')).toBeInTheDocument();
  });

  it('calls onQuerySubmit correctly', async () => {
    const onQuerySubmitMock = jest.fn();

    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={onQuerySubmitMock}
        onFiltersUpdated={jest.fn()}
        onSavedQueryUpdated={jest.fn()}
        onClearSavedQuery={jest.fn()}
        appName={'test'}
      />
    );

    fireEvent.click(await screen.findByTestId('querySubmitButton'));

    await waitFor(() => {
      expect(onQuerySubmitMock).toHaveBeenCalled();
    });
  });

  it('calls onFiltersUpdated correctly', async () => {
    const onFiltersUpdatedMock = jest.fn();
    const filters: Filter[] = [
      {
        meta: {
          negate: false,
          alias: null,
          disabled: false,
          type: 'custom',
          key: 'query',
        },
        query: { bool: { filter: [{ term: { 'kibana.alert.rule.consumer': 'stackAlerts' } }] } },
        $state: { store: FilterStateStore.APP_STATE },
      },
    ];

    mockUseKibana.mockReturnValue({
      services: {
        data: mockDataPlugin,
        unifiedSearch: {
          ui: {
            SearchBar: jest.fn().mockImplementation((props) => (
              <button
                data-test-subj="filtersSubmitButton"
                onClick={() => props.onFiltersUpdated(filters)}
                type="button"
              >
                {'Hello world'}
              </button>
            )),
          },
        },
        notifications: { toasts: { addWarning: jest.fn() } } as unknown as NotificationsStart,
      },
    });

    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={jest.fn()}
        onFiltersUpdated={onFiltersUpdatedMock}
        onSavedQueryUpdated={jest.fn()}
        onClearSavedQuery={jest.fn()}
        appName={'test'}
      />
    );

    fireEvent.click(await screen.findByTestId('filtersSubmitButton'));

    await waitFor(() => {
      expect(onFiltersUpdatedMock).toHaveBeenCalledWith(filters);
      expect(mockDataPlugin.query.filterManager.setFilters).toHaveBeenCalledWith(filters);
    });
  });

  it('calls the unifiedSearchBar correctly for security rule types', async () => {
    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={jest.fn()}
        appName={'test'}
        onFiltersUpdated={jest.fn()}
        ruleTypeIds={['siem.esqlRuleType', '.esQuery']}
      />
    );

    await waitFor(() => {
      expect(unifiedSearchBarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestionsAbstraction: undefined,
        }),
        {}
      );
    });
  });

  it('calls the unifiedSearchBar correctly for NON security rule types', async () => {
    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={jest.fn()}
        appName={'test'}
        onFiltersUpdated={jest.fn()}
        ruleTypeIds={['.esQuery']}
      />
    );

    await waitFor(() => {
      expect(unifiedSearchBarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestionsAbstraction: { type: 'alerts', fields: {} },
        }),
        {}
      );
    });
  });

  it('calls the unifiedSearchBar with correct index patters', async () => {
    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={jest.fn()}
        appName={'test'}
        onFiltersUpdated={jest.fn()}
        ruleTypeIds={['.esQuery', 'apm.anomaly']}
      />
    );

    await waitFor(() => {
      expect(unifiedSearchBarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          indexPatterns: [
            {
              fields: [
                { aggregatable: true, name: 'event.action', searchable: true, type: 'string' },
              ],
              title: '.esQuery,apm.anomaly',
            },
          ],
        }),
        {}
      );
    });
  });

  it('calls the unifiedSearchBar with correct index patters without rule types', async () => {
    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={jest.fn()}
        appName={'test'}
        onFiltersUpdated={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(unifiedSearchBarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          indexPatterns: [
            {
              fields: [
                { aggregatable: true, name: 'event.action', searchable: true, type: 'string' },
              ],
              title: '.alerts-*',
            },
          ],
        }),
        {}
      );
    });
  });

  it('calls the unifiedSearchBar with correct index patters without data views', async () => {
    jest.mocked(useAlertsDataView).mockReturnValue({
      isLoading: false,
      dataView: undefined,
    });

    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={jest.fn()}
        appName={'test'}
        onFiltersUpdated={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(unifiedSearchBarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          indexPatterns: [],
        }),
        {}
      );
    });
  });
});
