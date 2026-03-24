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
import { of, Subject } from 'rxjs';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { DataPublicPluginStart, ISearchStart } from '@kbn/data-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { EsQueryRuleParams, SearchType } from '../types';
import { EsQueryExpression } from './es_query_expression';

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const module = jest.requireActual('@kbn/kibana-react-plugin/public');

  return {
    ...module,
    useKibana: jest.fn(),
  };
});

jest.mock('@kbn/code-editor', () => ({
  // Mocking CodeEditor

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CodeEditor: (props: any) => (
    <input
      data-test-subj="mockCodeEditor"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange={(syntheticEvent: any) => {
        props.onChange(syntheticEvent.jsonString);
      }}
    />
  ),
}));
jest.mock('@kbn/es-ui-shared-plugin/public', () => ({
  XJson: {
    useXJsonMode: jest.fn().mockReturnValue({
      convertToJson: jest.fn(),
      setXJson: jest.fn(),
      xJson: jest.fn(),
    }),
  },
}));
jest.mock('@kbn/triggers-actions-ui-plugin/public', () => {
  const original = jest.requireActual('@kbn/triggers-actions-ui-plugin/public');
  return {
    ...original,
    getIndexPatterns: () => {
      return ['index1', 'index2'];
    },
    getTimeFieldOptions: () => {
      return [
        {
          text: '@timestamp',
          value: '@timestamp',
        },
      ];
    },
    getFields: () => {
      return Promise.resolve([
        {
          name: '@timestamp',
          type: 'date',
        },
        {
          name: 'field',
          type: 'text',
        },
      ]);
    },
    getIndexOptions: () => {
      return Promise.resolve([
        {
          label: 'indexOption',
          options: [
            {
              label: 'index1',
              value: 'index1',
            },
            {
              label: 'index2',
              value: 'index2',
            },
          ],
        },
      ]);
    },
  };
});

const createDataPluginMock = () => {
  const dataMock = dataPluginMock.createStartContract() as DataPublicPluginStart & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    search: ISearchStart & { search: jest.MockedFunction<any> };
  };
  return dataMock;
};

const AppWrapper = React.memo<PropsWithChildren<unknown>>(({ children }) => (
  <I18nProvider>{children}</I18nProvider>
));

const dataMock = createDataPluginMock();
const dataViewMock = dataViewPluginMocks.createStartContract();
const unifiedSearchMock = unifiedSearchPluginMock.createStartContract();
const chartsStartMock = chartPluginMock.createStartContract();

const defaultEsQueryExpressionParams: EsQueryRuleParams<SearchType.esQuery> = {
  size: 100,
  thresholdComparator: '>',
  threshold: [0],
  timeWindowSize: 15,
  timeWindowUnit: 's',
  index: ['test-index'],
  timeField: '@timestamp',
  aggType: 'count',
  groupBy: 'all',
  esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
  excludeHitsFromPreviousRun: true,
};

describe('EsQueryRuleTypeExpression', () => {
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        docLinks: {
          ELASTIC_WEBSITE_URL: '',
          DOC_LINK_VERSION: '',
          links: {
            query: {
              queryDsl: 'query-dsl.html',
            },
          },
        },
      },
    });
  });

  async function setup(alertParams: EsQueryRuleParams<SearchType.esQuery>) {
    const errors = {
      index: [],
      esQuery: [],
      size: [],
      timeField: [],
      timeWindowSize: [],
      termSize: [],
      termField: [],
    };

    return await act(async () =>
      render(
        <EsQueryExpression
          unifiedSearch={unifiedSearchMock}
          ruleInterval="1m"
          ruleThrottle="1m"
          alertNotifyWhen="onThrottleInterval"
          ruleParams={alertParams}
          setRuleParams={() => {}}
          setRuleProperty={() => {}}
          errors={errors}
          data={dataMock}
          dataViews={dataViewMock}
          defaultActionGroupId=""
          actionGroups={[]}
          charts={chartsStartMock}
          onChangeMetaData={() => {}}
        />,
        {
          wrapper: AppWrapper,
        }
      )
    );
  }

  test('should render EsQueryRuleTypeExpression with expected components', async () => {
    const result = await setup(defaultEsQueryExpressionParams);
    expect(result.getByTestId('indexSelectPopover')).toBeInTheDocument();
    expect(result.getByTestId('sizeValueExpression')).toBeInTheDocument();
    expect(result.getByTestId('queryJsonEditor')).toBeInTheDocument();
    expect(result.getByTestId('thresholdPopover')).toBeInTheDocument();
    expect(result.getByTestId('forLastExpression')).toBeInTheDocument();
    expect(result.queryByTestId('testQuerySuccess')).not.toBeInTheDocument();
    expect(result.queryByTestId('testQueryError')).not.toBeInTheDocument();

    expect(result.getByTestId('excludeHitsFromPreviousRunExpression')).toBeChecked();

    expect(result.getByTestId('testQuery')).not.toBeDisabled();
  });

  test('should render Test Query button disabled if alert params are invalid', async () => {
    const result = await setup({
      ...defaultEsQueryExpressionParams,
      timeField: null,
    } as unknown as EsQueryRuleParams<SearchType.esQuery>);

    expect(result.getByTestId('testQuery')).toBeDisabled();
  });

  test('should show excludeHitsFromPreviousRun unchecked by default', async () => {
    const result = await setup({
      ...defaultEsQueryExpressionParams,
      excludeHitsFromPreviousRun: undefined,
    } as unknown as EsQueryRuleParams<SearchType.esQuery>);

    expect(result.getByTestId('excludeHitsFromPreviousRunExpression')).not.toBeChecked();
  });

  test('should render EsQueryRuleTypeExpression with chosen size field', async () => {
    const result = await setup({
      ...defaultEsQueryExpressionParams,
      size: 0,
    } as unknown as EsQueryRuleParams<SearchType.esQuery>);

    expect(result.getByTestId('sizeValueExpression')).toHaveTextContent('Size 0');
  });

  test('should render EsQueryRuleTypeExpression with chosen runtime group field', async () => {
    const result = await setup({
      ...defaultEsQueryExpressionParams,
      esQuery:
        '{\n    "query":{\n      "match_all" : {}\n    },\n    "runtime_mappings": {\n      "day_of_week": {\n        "type": "keyword",\n        "script": {\n          "source": "emit(doc[\'@timestamp\'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ENGLISH))"\n        }\n      }\n    }\n  }',
      groupBy: 'top',
      termField: 'day_of_week',
      termSize: 3,
    } as unknown as EsQueryRuleParams<SearchType.esQuery>);

    fireEvent.click(screen.getByTestId('groupByExpression'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    expect(result.getByTestId('fieldsExpressionSelect')).toHaveTextContent('day_of_week');
  });

  test('should show success message if ungrouped Test Query is successful', async () => {
    const searchResponseMock$ = of<IKibanaSearchResponse>({
      rawResponse: {
        hits: {
          total: 1234,
        },
      },
    });
    dataMock.search.search.mockImplementation(() => searchResponseMock$);
    await setup(defaultEsQueryExpressionParams);

    fireEvent.click(screen.getByTestId('testQuery'));
    await waitFor(() => expect(dataMock.search.search).toBeCalled());

    expect(screen.getByTestId('testQuerySuccess')).toBeInTheDocument();
    expect(screen.getByText('Query matched 1234 documents in the last 15s.')).toBeInTheDocument();
    expect(screen.queryByTestId('testQueryError')).not.toBeInTheDocument();
  });

  test('should show success message if grouped Test Query is successful', async () => {
    const searchResponseMock$ = of<IKibanaSearchResponse>({
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
    });
    dataMock.search.search.mockImplementation(() => searchResponseMock$);
    await setup({
      ...defaultEsQueryExpressionParams,
      termField: 'the-term',
      termSize: 10,
    });

    fireEvent.click(screen.getByTestId('testQuery'));
    await waitFor(() => expect(dataMock.search.search).toBeCalled());

    expect(screen.getByTestId('testQuerySuccess')).toBeInTheDocument();
    expect(screen.getByText('Grouped query matched 5 groups in the last 15s.')).toBeInTheDocument();
    expect(screen.queryByTestId('testQueryError')).not.toBeInTheDocument();
  });

  test('should show success message if Test Query is successful (with partial result)', async () => {
    const partial = {
      isRunning: true,
      isPartial: true,
    };
    const complete = {
      isRunning: false,
      isPartial: false,
      rawResponse: {
        hits: {
          total: 1234,
        },
      },
    };
    const searchResponseMock$ = new Subject();
    dataMock.search.search.mockImplementation(() => searchResponseMock$);
    await setup(defaultEsQueryExpressionParams);

    fireEvent.click(screen.getByTestId('testQuery'));
    await waitFor(() => expect(dataMock.search.search).toBeCalled());
    await waitFor(() => {
      searchResponseMock$.next(partial);
      searchResponseMock$.next(complete);
      searchResponseMock$.complete();
    });

    expect(screen.getByTestId('testQuerySuccess')).toBeInTheDocument();
    expect(screen.getByText('Query matched 1234 documents in the last 15s.')).toBeInTheDocument();
    expect(screen.queryByTestId('testQueryError')).not.toBeInTheDocument();
  });

  test('should show error message if Test Query is throws error', async () => {
    dataMock.search.search.mockImplementation(() => {
      throw new Error('What is this query');
    });
    await setup(defaultEsQueryExpressionParams);

    fireEvent.click(screen.getByTestId('testQuery'));
    await waitFor(() => expect(dataMock.search.search).toBeCalled());

    expect(screen.queryByTestId('testQuerySuccess')).not.toBeInTheDocument();
    expect(screen.getByTestId('testQueryError')).toBeInTheDocument();
  });
});
