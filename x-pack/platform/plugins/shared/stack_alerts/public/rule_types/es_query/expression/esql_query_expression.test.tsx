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
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { EsqlQueryExpression, getTimeFilter } from './esql_query_expression';
import type { EsQueryRuleParams } from '../types';
import { SearchType } from '../types';

jest.mock('../validation', () => ({
  hasExpressionValidationErrors: jest.fn(),
}));
const { hasExpressionValidationErrors } = jest.requireMock('../validation');

jest.mock('@kbn/data-plugin/public', () => {
  const actual = jest.requireActual('@kbn/data-plugin/public');
  return {
    ...actual,
    getEsQueryConfig: jest.fn().mockReturnValue({
      allowLeadingWildcards: true,
      queryStringOptions: {},
      ignoreFilterIfFieldNotInIndex: false,
    }),
  };
});

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => {
  const module = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...module,
    getFields: jest.fn().mockResolvedValue([]),
  };
});

jest.mock('@kbn/triggers-actions-ui-plugin/public/common', () => {
  const module = jest.requireActual('@kbn/triggers-actions-ui-plugin/public/common');
  return {
    ...module,
    getTimeOptions: jest.fn(),
    firstFieldOption: { text: '@timestamp', value: '@timestamp' },
    getTimeFieldOptions: jest.fn().mockReturnValue([
      { value: '@timestamp', text: '@timestamp' },
      { value: 'event.ingested', text: 'event.ingested' },
    ]),
  };
});

jest.mock('@kbn/esql-utils', () => {
  return {
    getESQLResults: jest.fn().mockResolvedValue({}),
    getIndexPattern: jest.fn(),
    getIndexPatternFromESQLQuery: jest.fn().mockReturnValue('index1'),
    getESQLAdHocDataview: jest
      .fn()
      .mockResolvedValue({ timeFieldName: '@timestamp', getIndexPattern: jest.fn() }),
    formatESQLColumns: jest.fn().mockReturnValue([]),
  };
});

const { getFields } = jest.requireMock('@kbn/triggers-actions-ui-plugin/public');

const AppWrapper = React.memo<PropsWithChildren<unknown>>(({ children }) => (
  <I18nProvider>{children}</I18nProvider>
));

const dataMock = dataPluginMock.createStartContract();
const dataViewMock = dataViewPluginMocks.createStartContract();
const unifiedSearchMock = unifiedSearchPluginMock.createStartContract();
const chartsStartMock = chartPluginMock.createStartContract();

const defaultEsqlQueryExpressionParams: EsQueryRuleParams<SearchType.esqlQuery> = {
  size: 100,
  thresholdComparator: '>',
  threshold: [0],
  timeWindowSize: 15,
  timeWindowUnit: 's',
  index: ['test-index'],
  timeField: '@timestamp',
  aggType: 'count',
  groupBy: 'all',
  searchType: SearchType.esqlQuery,
  esqlQuery: { esql: '' },
  excludeHitsFromPreviousRun: false,
};

describe('EsqlQueryRuleTypeExpression', () => {
  const fakeNow = new Date('2020-02-09T23:15:41.941Z');

  beforeEach(() => {
    jest.clearAllMocks();

    hasExpressionValidationErrors.mockReturnValue(false);
    global.Date.now = jest.fn(() => fakeNow.getTime());
  });

  test('should render EsqlQueryRuleTypeExpression with chosen time field', async () => {
    await act(async () => {
      render(
        <EsqlQueryExpression
          unifiedSearch={unifiedSearchMock}
          ruleInterval="1m"
          ruleThrottle="1m"
          alertNotifyWhen="onThrottleInterval"
          ruleParams={{
            ...defaultEsqlQueryExpressionParams,
            timeField: 'event.ingested',
            esqlQuery: { esql: 'FROM *' },
          }}
          setRuleParams={() => {}}
          setRuleProperty={() => {}}
          errors={{ esqlQuery: [], timeField: [], timeWindowSize: [], groupBy: [] }}
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
      );
    });

    const timeFieldText = await screen.findByText('event.ingested');
    expect(timeFieldText).toBeInTheDocument();
  });

  it('should render EsqlQueryRuleTypeExpression with expected components', () => {
    const result = render(
      <EsqlQueryExpression
        unifiedSearch={unifiedSearchMock}
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={defaultEsqlQueryExpressionParams}
        setRuleParams={() => {}}
        setRuleProperty={() => {}}
        errors={{ esqlQuery: [], timeField: [], timeWindowSize: [], groupBy: [] }}
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
    );

    expect(result.getByTestId('queryEsqlEditor')).toBeInTheDocument();
    expect(result.getByTestId('timeFieldSelect')).toBeInTheDocument();
    expect(result.getByTestId('timeWindowSizeNumber')).toBeInTheDocument();
    expect(result.getByTestId('timeWindowUnitSelect')).toBeInTheDocument();
    expect(result.getByTestId('groupByRadioGroup')).toBeInTheDocument();
    expect(result.queryByTestId('testQuerySuccess')).not.toBeInTheDocument();
    expect(result.queryByTestId('testQueryError')).not.toBeInTheDocument();
  });

  test('should render Test Query button disabled if alert params are invalid', async () => {
    hasExpressionValidationErrors.mockReturnValue(true);
    const result = render(
      <EsqlQueryExpression
        unifiedSearch={unifiedSearchMock}
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={defaultEsqlQueryExpressionParams}
        setRuleParams={() => {}}
        setRuleProperty={() => {}}
        errors={{ esqlQuery: [], timeField: [], timeWindowSize: [], groupBy: [] }}
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
    );

    const button = result.getByTestId('testQuery');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  test('should show success message if Test Query is successful', async () => {
    const { getESQLResults } = jest.requireMock('@kbn/esql-utils');

    getESQLResults.mockResolvedValue({
      response: {
        type: 'datatable',
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'ecs.version', type: 'string' },
          { name: 'error.code', type: 'string' },
        ],
        values: [['2023-07-12T13:32:04.174Z', '1.8.0', null]],
      },
    });
    getFields.mockResolvedValue([]);

    render(
      <EsqlQueryExpression
        unifiedSearch={unifiedSearchMock}
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={defaultEsqlQueryExpressionParams}
        setRuleParams={() => {}}
        setRuleProperty={() => {}}
        errors={{ esqlQuery: [], timeField: [], timeWindowSize: [], groupBy: [] }}
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
    );

    fireEvent.click(screen.getByTestId('testQuery'));
    await waitFor(() => expect(getESQLResults).toBeCalled());

    expect(screen.getByTestId('testQuerySuccess')).toBeInTheDocument();
    expect(screen.getByText('Query matched 1 documents in the last 15s.')).toBeInTheDocument();
    expect(screen.queryByTestId('testQueryError')).not.toBeInTheDocument();
  });

  test('should show grouped success message if Test Query is successful', async () => {
    const { getESQLResults } = jest.requireMock('@kbn/esql-utils');

    getESQLResults.mockResolvedValue({
      response: {
        type: 'datatable',
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'ecs.version', type: 'string' },
          { name: 'error.code', type: 'string' },
        ],
        values: [['2023-07-12T13:32:04.174Z', '1.8.0', null]],
      },
    });
    getFields.mockResolvedValue([]);

    render(
      <EsqlQueryExpression
        unifiedSearch={unifiedSearchMock}
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={{ ...defaultEsqlQueryExpressionParams, groupBy: 'row' }}
        setRuleParams={() => {}}
        setRuleProperty={() => {}}
        errors={{ esqlQuery: [], timeField: [], timeWindowSize: [], groupBy: [] }}
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
    );

    fireEvent.click(screen.getByTestId('testQuery'));
    await waitFor(() => expect(getESQLResults).toBeCalled());

    expect(screen.getByTestId('testQuerySuccess')).toBeInTheDocument();
    expect(screen.getByText('Query returned 1 rows in the last 15s.')).toBeInTheDocument();
    expect(screen.queryByTestId('testQueryError')).not.toBeInTheDocument();
  });

  test('should show error message if Test Query is throws error', async () => {
    const { getESQLResults } = jest.requireMock('@kbn/esql-utils');

    getESQLResults.mockRejectedValue('Error getting test results.!');

    const result = render(
      <EsqlQueryExpression
        unifiedSearch={unifiedSearchMock}
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={defaultEsqlQueryExpressionParams}
        setRuleParams={() => {}}
        setRuleProperty={() => {}}
        errors={{ esqlQuery: [], timeField: [], timeWindowSize: [], groupBy: [] }}
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
    );

    fireEvent.click(result.getByTestId('testQuery'));
    await waitFor(() => expect(getESQLResults).toBeCalled());

    expect(result.queryByTestId('testQuerySuccess')).not.toBeInTheDocument();
    expect(result.getByTestId('testQueryError')).toBeInTheDocument();
  });

  test('getTimeFilter should return the correct filters', async () => {
    expect(getTimeFilter('@timestamp', '3h')).toEqual({
      timeFilter: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  format: 'strict_date_optional_time',
                  gt: '2020-02-09T20:15:41.941Z',
                  lte: '2020-02-09T23:15:41.941Z',
                },
              },
            },
          ],
        },
      },
      timeRange: { from: '2020-02-09T20:15:41.941Z', to: '2020-02-09T23:15:41.941Z' },
    });
  });
});
