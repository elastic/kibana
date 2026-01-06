/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { fireEvent, render, waitFor, screen, act } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import type { EsQueryRuleParams } from '../types';
import { SearchType } from '../types';
import { SearchSourceExpression } from './search_source_expression';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { Subject } from 'rxjs';
import type { ISearchSource } from '@kbn/data-plugin/common';
import type { IUiSettingsClient } from '@kbn/core/public';
import { copyToClipboard } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { indexPatternEditorPluginMock as dataViewEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import type { DataPlugin } from '@kbn/data-plugin/public';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    __esModule: true,
    ...original,
    copyToClipboard: jest.fn(() => true),
  };
});

const dataViewPluginMock = dataViewPluginMocks.createStartContract();
const chartsStartMock = chartPluginMock.createStartContract();
const unifiedSearchMock = unifiedSearchPluginMock.createStartContract();
export const uiSettingsMock = {
  get: jest.fn(),
} as unknown as IUiSettingsClient;

const defaultSearchSourceExpressionParams: EsQueryRuleParams<SearchType.searchSource> = {
  size: 100,
  thresholdComparator: '>',
  threshold: [0],
  timeWindowSize: 15,
  timeWindowUnit: 's',
  index: ['test-index'],
  timeField: '@timestamp',
  searchType: SearchType.searchSource,
  searchConfiguration: {
    query: {
      query: '',
      language: 'lucene',
    },
    index: '90943e30-9a47-11e8-b64d-95841ca0b247',
  },
  excludeHitsFromPreviousRun: true,
  aggType: 'count',
  groupBy: 'all',
};

const testResultComplete = {
  rawResponse: {
    hits: {
      total: 1234,
    },
  },
};

const testResultGroupedComplete = {
  rawResponse: {
    hits: {
      total: 1234,
    },
    aggregations: {
      groupAgg: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 103,
        buckets: [
          {
            key: 'execute',
            doc_count: 120,
          },
          {
            key: 'execute-start',
            doc_count: 120,
          },
          {
            key: 'active-instance',
            doc_count: 100,
          },
          {
            key: 'execute-action',
            doc_count: 100,
          },
          {
            key: 'new-instance',
            doc_count: 100,
          },
        ],
      },
    },
  },
};

const testResultPartial = {
  partial: true,
  running: true,
};

const searchSourceFieldsMock = {
  query: {
    query: '',
    language: 'kuery',
  },
  filter: [],
  index: {
    id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    title: 'kibana_sample_data_logs',
    fields: [],
    isPersisted: () => true,
    getName: () => 'kibana_sample_data_logs',
    isTimeBased: () => true,
  },
};

const savedQueryMock = {
  id: 'test-id',
  attributes: {
    title: 'test-filter-set',
    description: '',
    query: {
      query: 'category.keyword : "Men\'s Shoes" ',
      language: 'kuery',
    },
    filters: [],
  },
};

(dataViewPluginMock.getIds as jest.Mock) = jest.fn().mockImplementation(() => Promise.resolve([]));
dataViewPluginMock.getDefaultDataView = jest.fn(() => Promise.resolve(null));
dataViewPluginMock.get = jest.fn();

describe('SearchSourceAlertTypeExpression', () => {
  let dataMock: jest.Mocked<ReturnType<DataPlugin['start']>>;
  let searchSourceMock: ISearchSource;
  let mockSearchResult: Subject<unknown>;

  const AppWrapper = React.memo<PropsWithChildren<unknown>>(({ children }) => (
    <I18nProvider>{children}</I18nProvider>
  ));

  beforeEach(() => {
    mockSearchResult = new Subject();
    searchSourceMock = {
      id: 'data_source6',
      fields: searchSourceFieldsMock,
      getField: (name: string) => {
        return (searchSourceFieldsMock as Record<string, object>)[name] || '';
      },
      setField: jest.fn(),
      createCopy: jest.fn(() => {
        return searchSourceMock;
      }),
      setParent: jest.fn(() => {
        return searchSourceMock;
      }),
      fetch$: jest.fn(() => {
        return mockSearchResult;
      }),
      getSearchRequestBody: jest.fn(() => ({
        fields: [
          {
            field: '@timestamp',
            format: 'date_time',
          },
          {
            field: 'timestamp',
            format: 'date_time',
          },
          {
            field: 'utc_time',
            format: 'date_time',
          },
        ],
        script_fields: {},
        stored_fields: ['*'],
        runtime_mappings: {
          hour_of_day: {
            type: 'long',
            script: {
              source: "emit(doc['timestamp'].value.getHour());",
            },
          },
        },
        _source: {
          excludes: [],
        },
        query: {
          bool: {
            must: [],
            filter: [
              {
                bool: {
                  must_not: {
                    bool: {
                      should: [
                        {
                          match: {
                            response: '200',
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                },
              },
              {
                range: {
                  timestamp: {
                    format: 'strict_date_optional_time',
                    gte: '2022-06-19T02:49:51.192Z',
                    lte: '2022-06-24T02:49:51.192Z',
                  },
                },
              },
            ],
            should: [],
            must_not: [],
          },
        },
      })),
    } as unknown as ISearchSource;
    dataMock = dataPluginMock.createStartContract();
    (dataMock.search.searchSource.create as jest.Mock).mockImplementation(() =>
      Promise.resolve(searchSourceMock)
    );
    (dataMock.query.savedQueries.getSavedQuery as jest.Mock).mockImplementation(() =>
      Promise.resolve(savedQueryMock)
    );
    dataMock.query.savedQueries.findSavedQueries = jest.fn(() =>
      Promise.resolve({ total: 0, queries: [] })
    );
  });

  const setup = (ruleParams: EsQueryRuleParams<SearchType.searchSource>) => {
    const errors = {
      size: [],
      timeField: [],
      timeWindowSize: [],
      searchConfiguration: [],
    };
    const dataViewEditorMock = dataViewEditorPluginMock.createStartContract();

    return render(
      <KibanaContextProvider
        services={{
          dataViews: dataViewPluginMock,
          data: dataMock,
          uiSettings: uiSettingsMock,
          dataViewEditor: dataViewEditorMock,
          unifiedSearch: unifiedSearchMock,
        }}
      >
        <SearchSourceExpression
          ruleInterval="1m"
          ruleThrottle="1m"
          alertNotifyWhen="onThrottleInterval"
          ruleParams={ruleParams}
          setRuleParams={() => {}}
          setRuleProperty={() => {}}
          errors={errors}
          unifiedSearch={unifiedSearchMock}
          data={dataMock}
          dataViews={dataViewPluginMock}
          defaultActionGroupId=""
          actionGroups={[]}
          charts={chartsStartMock}
          metadata={{ adHocDataViewList: [] }}
          onChangeMetaData={jest.fn()}
        />
      </KibanaContextProvider>,
      {
        wrapper: AppWrapper,
      }
    );
  };
  test('should render correctly', async () => {
    const result = setup(defaultSearchSourceExpressionParams);

    await waitFor(() =>
      expect(result.getByTestId('searchSourceLoadingSpinner')).toBeInTheDocument()
    );

    expect(result.getByTestId('thresholdPopover')).toBeInTheDocument();
    expect(result.getByTestId('excludeHitsFromPreviousRunExpression')).toBeChecked();
  });

  test('should render chosen size field', async () => {
    const result = await act(async () =>
      setup({
        ...defaultSearchSourceExpressionParams,
        size: 0,
      })
    );

    expect(result.getByTestId('sizeValueExpression')).toHaveTextContent('Size 0');
  });

  test('should disable Test Query button if data view is not selected yet', async () => {
    const result = await act(async () =>
      setup({
        ...defaultSearchSourceExpressionParams,
        searchConfiguration: undefined,
      })
    );

    expect(result.getByTestId('testQuery')).toBeDisabled();
  });

  test('should show success message if ungrouped Test Query is successful', async () => {
    await act(async () => setup(defaultSearchSourceExpressionParams));

    fireEvent.click(screen.getByTestId('testQuery'));
    await waitFor(() => {
      mockSearchResult.next(testResultPartial);
      mockSearchResult.next(testResultComplete);
      mockSearchResult.complete();
    });

    expect(screen.getByTestId('testQuerySuccess')).toBeInTheDocument();
    expect(screen.getByText('Query matched 1234 documents in the last 15s.')).toBeInTheDocument();
    expect(screen.queryByTestId('testQueryError')).not.toBeInTheDocument();
  });

  test('should show success message if grouped Test Query is successful', async () => {
    await act(async () =>
      setup({
        ...defaultSearchSourceExpressionParams,
        termField: 'the-term',
        termSize: 10,
      })
    );

    fireEvent.click(screen.getByTestId('testQuery'));
    await waitFor(() => {
      mockSearchResult.next(testResultPartial);
      mockSearchResult.next(testResultGroupedComplete);
      mockSearchResult.complete();
    });

    expect(screen.getByTestId('testQuerySuccess')).toBeInTheDocument();
    expect(screen.getByText('Grouped query matched 5 groups in the last 15s.')).toBeInTheDocument();
    expect(screen.queryByTestId('testQueryError')).not.toBeInTheDocument();
  });

  it('should call copyToClipboard with the serialized query when the copy query button is clicked', async () => {
    await act(async () => setup(defaultSearchSourceExpressionParams));

    fireEvent.click(screen.getByTestId('copyQuery'));
    expect(copyToClipboard).toHaveBeenCalledWith(`{
  \"fields\": [
    {
      \"field\": \"@timestamp\",
      \"format\": \"date_time\"
    },
    {
      \"field\": \"timestamp\",
      \"format\": \"date_time\"
    },
    {
      \"field\": \"utc_time\",
      \"format\": \"date_time\"
    }
  ],
  \"script_fields\": {},
  \"stored_fields\": [
    \"*\"
  ],
  \"runtime_mappings\": {
    \"hour_of_day\": {
      \"type\": \"long\",
      \"script\": {
        \"source\": \"emit(doc['timestamp'].value.getHour());\"
      }
    }
  },
  \"_source\": {
    \"excludes\": []
  },
  \"query\": {
    \"bool\": {
      \"must\": [],
      \"filter\": [
        {
          \"bool\": {
            \"must_not\": {
              \"bool\": {
                \"should\": [
                  {
                    \"match\": {
                      \"response\": \"200\"
                    }
                  }
                ],
                \"minimum_should_match\": 1
              }
            }
          }
        },
        {
          \"range\": {
            \"timestamp\": {
              \"format\": \"strict_date_optional_time\",
              \"gte\": \"2022-06-19T02:49:51.192Z\",
              \"lte\": \"2022-06-24T02:49:51.192Z\"
            }
          }
        }
      ],
      \"should\": [],
      \"must_not\": []
    }
  }
}`);
  });

  test('should render error prompt', async () => {
    (dataMock.search.searchSource.create as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error('Cant find searchSource'))
    );
    const result = setup(defaultSearchSourceExpressionParams);

    await waitFor(() => {
      expect(screen.queryByText('Cant find searchSource')).not.toBeInTheDocument();
      expect(result.getByTestId('searchSourceLoadingSpinner')).toBeInTheDocument();
    });

    expect(screen.getByText('Cant find searchSource')).toBeInTheDocument();
  });
});
