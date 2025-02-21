/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { of, Subject } from 'rxjs';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { DataPublicPluginStart, ISearchStart } from '@kbn/data-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EsQueryRuleParams, SearchType } from '../types';
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
    };

    const wrapper = mountWithIntl(
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
      />
    );

    const update = async () =>
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

    await update();
    return wrapper;
  }

  test('should render EsQueryRuleTypeExpression with expected components', async () => {
    const wrapper = await setup(defaultEsQueryExpressionParams);
    expect(wrapper.find('[data-test-subj="indexSelectPopover"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="sizeValueExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="queryJsonEditor"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="testQuerySuccess"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="testQueryError"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="thresholdExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="forLastExpression"]').exists()).toBeTruthy();

    const excludeHitsButton = wrapper.find(
      '[data-test-subj="excludeHitsFromPreviousRunExpression"]'
    );
    expect(excludeHitsButton.exists()).toBeTruthy();
    expect(excludeHitsButton.first().prop('checked')).toBeTruthy();

    const testQueryButton = wrapper.find('EuiButton[data-test-subj="testQuery"]');
    expect(testQueryButton.exists()).toBeTruthy();
    expect(testQueryButton.prop('disabled')).toBe(false);
  });

  test('should render Test Query button disabled if alert params are invalid', async () => {
    const wrapper = await setup({
      ...defaultEsQueryExpressionParams,
      timeField: null,
    } as unknown as EsQueryRuleParams<SearchType.esQuery>);
    const testQueryButton = wrapper.find('EuiButton[data-test-subj="testQuery"]');
    expect(testQueryButton.exists()).toBeTruthy();
    expect(testQueryButton.prop('disabled')).toBe(true);
  });

  test('should show excludeHitsFromPreviousRun unchecked by default', async () => {
    const wrapper = await setup({
      ...defaultEsQueryExpressionParams,
      excludeHitsFromPreviousRun: undefined,
    } as unknown as EsQueryRuleParams<SearchType.esQuery>);
    const excludeMatchesCheckBox = wrapper.find(
      'EuiCheckbox[data-test-subj="excludeHitsFromPreviousRunExpression"]'
    );
    expect(excludeMatchesCheckBox.exists()).toBeTruthy();
    expect(excludeMatchesCheckBox.prop('checked')).toBe(false);
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
    const wrapper = await setup(defaultEsQueryExpressionParams);
    const testQueryButton = wrapper.find('button[data-test-subj="testQuery"]');
    testQueryButton.simulate('click');
    expect(dataMock.search.search).toHaveBeenCalled();
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="testQuerySuccess"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="testQueryError"]').exists()).toBeFalsy();
    expect(wrapper.find('EuiText[data-test-subj="testQuerySuccess"]').text()).toEqual(
      `Query matched 1234 documents in the last 15s.`
    );
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
    const wrapper = await setup({
      ...defaultEsQueryExpressionParams,
      termField: 'the-term',
      termSize: 10,
    });
    const testQueryButton = wrapper.find('button[data-test-subj="testQuery"]');
    testQueryButton.simulate('click');
    expect(dataMock.search.search).toHaveBeenCalled();
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="testQuerySuccess"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="testQueryError"]').exists()).toBeFalsy();
    expect(wrapper.find('EuiText[data-test-subj="testQuerySuccess"]').text()).toEqual(
      `Grouped query matched 5 groups in the last 15s.`
    );
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
    const wrapper = await setup(defaultEsQueryExpressionParams);
    const testQueryButton = wrapper.find('button[data-test-subj="testQuery"]');

    testQueryButton.simulate('click');
    expect(dataMock.search.search).toHaveBeenCalled();
    await act(async () => {
      searchResponseMock$.next(partial);
      searchResponseMock$.next(complete);
      searchResponseMock$.complete();
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="testQuerySuccess"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="testQueryError"]').exists()).toBeFalsy();
    expect(wrapper.find('EuiText[data-test-subj="testQuerySuccess"]').text()).toEqual(
      `Query matched 1234 documents in the last 15s.`
    );
  });

  test('should show error message if Test Query is throws error', async () => {
    dataMock.search.search.mockImplementation(() => {
      throw new Error('What is this query');
    });
    const wrapper = await setup(defaultEsQueryExpressionParams);
    const testQueryButton = wrapper.find('button[data-test-subj="testQuery"]');

    testQueryButton.simulate('click');
    expect(dataMock.search.search).toHaveBeenCalled();
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="testQuerySuccess"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="testQueryError"]').exists()).toBeTruthy();
  });
});
