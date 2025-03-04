/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataView } from '@kbn/data-views-plugin/public';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React, { useState } from 'react';
import { docLinksServiceMock } from '@kbn/core/public/mocks';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import {
  CommonEsQueryRuleParams,
  EsQueryRuleMetaData,
  EsQueryRuleParams,
  SearchType,
} from '../types';
import { EsQueryRuleTypeExpression } from './expression';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { Subject } from 'rxjs';
import { ISearchSource } from '@kbn/data-plugin/common';
import { findTestSubject } from '@elastic/eui/lib/test';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { act } from 'react-dom/test-utils';
import { indexPatternEditorPluginMock as dataViewEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { ReactWrapper } from 'enzyme';

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
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
  };
});

const defaultEsQueryRuleParams: EsQueryRuleParams<SearchType.esQuery> = {
  size: 100,
  thresholdComparator: '>',
  threshold: [0],
  timeWindowSize: 15,
  timeWindowUnit: 's',
  index: ['test-index'],
  timeField: '@timestamp',
  esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
  searchType: SearchType.esQuery,
  excludeHitsFromPreviousRun: true,
  aggType: 'count',
};
const defaultSearchSourceRuleParams: EsQueryRuleParams<SearchType.searchSource> = {
  size: 100,
  thresholdComparator: '>',
  threshold: [0],
  timeWindowSize: 15,
  timeWindowUnit: 's',
  index: ['test-index'],
  timeField: '@timestamp',
  searchType: SearchType.searchSource,
  searchConfiguration: {},
  excludeHitsFromPreviousRun: true,
  aggType: 'count',
};

const defaultEsqlRuleParams: EsQueryRuleParams<SearchType.esqlQuery> = {
  size: 100,
  thresholdComparator: '>',
  threshold: [0],
  timeWindowSize: 15,
  timeWindowUnit: 's',
  index: ['test-index'],
  timeField: '@timestamp',
  searchType: SearchType.esqlQuery,
  esqlQuery: { esql: 'test' },
  excludeHitsFromPreviousRun: true,
  aggType: 'count',
};

const dataViewPluginMock = dataViewPluginMocks.createStartContract();
const chartsStartMock = chartPluginMock.createStartContract();
const unifiedSearchMock = unifiedSearchPluginMock.createStartContract();
const httpMock = httpServiceMock.createStartContract();
const docLinksMock = docLinksServiceMock.createStartContract();
export const uiSettingsMock = {
  get: jest.fn(),
};

const mockSearchResult = new Subject();
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
    getName: () => 'kibana_sample_data_logs',
    isPersisted: () => true,
  },
};

const searchSourceMock = {
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
} as unknown as ISearchSource;

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

const dataMock = dataPluginMock.createStartContract();
const dataViewsMock = dataViewPluginMocks.createStartContract();
const dataViewEditorMock = dataViewEditorPluginMock.createStartContract();

(dataMock.search.searchSource.create as jest.Mock).mockImplementation(() =>
  Promise.resolve(searchSourceMock)
);
(dataViewsMock.getIds as jest.Mock) = jest.fn().mockImplementation(() => Promise.resolve([]));
dataViewsMock.getDefaultDataView = jest.fn(() => Promise.resolve(null));
dataViewsMock.get = jest.fn();
dataViewsMock.create.mockResolvedValue({
  title: 'test-index',
  type: 'esql',
  id: 'test-index',
  getIndexPattern: () => 'test-index',
} as DataView);
(dataMock.query.savedQueries.getSavedQuery as jest.Mock).mockImplementation(() =>
  Promise.resolve(savedQueryMock)
);
dataMock.query.savedQueries.findSavedQueries = jest.fn(() =>
  Promise.resolve({ total: 0, queries: [] })
);
(httpMock.post as jest.Mock).mockImplementation(() => Promise.resolve({ fields: [] }));

const Wrapper: React.FC<{
  ruleParams:
    | EsQueryRuleParams<SearchType.searchSource>
    | EsQueryRuleParams<SearchType.esQuery>
    | EsQueryRuleParams<SearchType.esqlQuery>;
  metadata?: EsQueryRuleMetaData;
}> = ({ ruleParams, metadata }) => {
  const [currentRuleParams, setCurrentRuleParams] = useState<CommonEsQueryRuleParams>(ruleParams);
  const errors = {
    index: [],
    esQuery: [],
    size: [],
    timeField: [],
    timeWindowSize: [],
    searchConfiguration: [],
    searchType: [],
  };

  return (
    <EsQueryRuleTypeExpression
      ruleInterval="1m"
      ruleThrottle="1m"
      alertNotifyWhen="onThrottleInterval"
      ruleParams={currentRuleParams}
      setRuleParams={(name, value) => {
        setCurrentRuleParams((params) => ({ ...params, [name]: value }));
      }}
      setRuleProperty={(name, params) => {
        if (name === 'params') {
          setCurrentRuleParams(params as CommonEsQueryRuleParams);
        }
      }}
      errors={errors}
      unifiedSearch={unifiedSearchMock}
      data={dataMock}
      dataViews={dataViewPluginMock}
      defaultActionGroupId=""
      actionGroups={[]}
      charts={chartsStartMock}
      metadata={metadata}
      onChangeMetaData={jest.fn()}
    />
  );
};

const setup = (
  ruleParams:
    | EsQueryRuleParams<SearchType.searchSource>
    | EsQueryRuleParams<SearchType.esQuery>
    | EsQueryRuleParams<SearchType.esqlQuery>,
  metadata?: EsQueryRuleMetaData
) => {
  return mountWithIntl(
    <KibanaContextProvider
      services={{
        data: dataMock,
        dataViews: dataViewsMock,
        uiSettings: uiSettingsMock,
        docLinks: docLinksMock,
        http: httpMock,
        unifiedSearch: unifiedSearchMock,
        dataViewEditor: dataViewEditorMock,
      }}
    >
      <Wrapper ruleParams={ruleParams} metadata={metadata} />
    </KibanaContextProvider>
  );
};

describe('EsQueryRuleTypeExpression', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    uiSettingsMock.get.mockReturnValue(true);
  });

  test('should render options by default', async () => {
    const wrapper = setup({} as EsQueryRuleParams<SearchType.esQuery>);
    expect(findTestSubject(wrapper, 'queryFormTypeChooserTitle').exists()).toBeTruthy();
    expect(findTestSubject(wrapper, 'queryFormType_searchSource').exists()).toBeTruthy();
    expect(findTestSubject(wrapper, 'queryFormType_esQuery').exists()).toBeTruthy();
    expect(findTestSubject(wrapper, 'queryFormType_esqlQuery').exists()).toBeTruthy();
    expect(findTestSubject(wrapper, 'queryFormTypeChooserCancel').exists()).toBeFalsy();
  });

  test('should hide ESQL option when not enabled', async () => {
    uiSettingsMock.get.mockReturnValueOnce(false);
    const wrapper = setup({} as EsQueryRuleParams<SearchType.esQuery>);
    expect(findTestSubject(wrapper, 'queryFormTypeChooserTitle').exists()).toBeTruthy();
    expect(findTestSubject(wrapper, 'queryFormType_searchSource').exists()).toBeTruthy();
    expect(findTestSubject(wrapper, 'queryFormType_esQuery').exists()).toBeTruthy();
    expect(findTestSubject(wrapper, 'queryFormType_esqlQuery').exists()).toBeFalsy();
    expect(findTestSubject(wrapper, 'queryFormTypeChooserCancel').exists()).toBeFalsy();
  });

  test('should switch to QueryDSL form type on selection and return back on cancel', async () => {
    let wrapper = setup({} as EsQueryRuleParams<SearchType.esQuery>);
    await act(async () => {
      findTestSubject(wrapper, 'queryFormType_esQuery').simulate('click');
    });
    wrapper = await wrapper.update();

    expect(findTestSubject(wrapper, 'queryFormTypeChooserTitle').exists()).toBeFalsy();
    expect(wrapper.exists('[data-test-subj="queryJsonEditor"]')).toBeTruthy();
    expect(findTestSubject(wrapper, 'selectIndexExpression').exists()).toBeTruthy();

    await act(async () => {
      findTestSubject(wrapper, 'queryFormTypeChooserCancel').simulate('click');
    });
    wrapper = await wrapper.update();
    expect(findTestSubject(wrapper, 'selectIndexExpression').exists()).toBeFalsy();
    expect(findTestSubject(wrapper, 'queryFormTypeChooserTitle').exists()).toBeTruthy();
  });

  test('should switch to KQL or Lucene form type on selection and return back on cancel', async () => {
    let wrapper = setup({} as EsQueryRuleParams<SearchType.searchSource>);
    await act(async () => {
      findTestSubject(wrapper, 'queryFormType_searchSource').simulate('click');
    });
    wrapper = await wrapper.update();
    expect(findTestSubject(wrapper, 'queryFormTypeChooserTitle').exists()).toBeFalsy();
    expect(findTestSubject(wrapper, 'selectDataViewExpression').exists()).toBeTruthy();

    await act(async () => {
      findTestSubject(wrapper, 'queryFormTypeChooserCancel').simulate('click');
    });
    wrapper = await wrapper.update();
    expect(findTestSubject(wrapper, 'selectDataViewExpression').exists()).toBeFalsy();
    expect(findTestSubject(wrapper, 'queryFormTypeChooserTitle').exists()).toBeTruthy();
  });

  test('should switch to ESQL form type on selection and return back on cancel', async () => {
    let wrapper = setup({} as EsQueryRuleParams<SearchType.searchSource>);
    await act(async () => {
      findTestSubject(wrapper, 'queryFormType_esqlQuery').simulate('click');
    });
    wrapper = await wrapper.update();
    expect(findTestSubject(wrapper, 'queryFormTypeChooserTitle').exists()).toBeFalsy();
    expect(wrapper.exists('[data-test-subj="queryEsqlEditor"]')).toBeTruthy();

    await act(async () => {
      findTestSubject(wrapper, 'queryFormTypeChooserCancel').simulate('click');
    });
    wrapper = await wrapper.update();
    expect(wrapper.exists('[data-test-subj="queryEsqlEditor"]')).toBeFalsy();
    expect(findTestSubject(wrapper, 'queryFormTypeChooserTitle').exists()).toBeTruthy();
  });

  test('should render QueryDSL view without the form type chooser', async () => {
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = setup(defaultEsQueryRuleParams, { adHocDataViewList: [], isManagementPage: false });
      wrapper = await wrapper.update();
    });
    expect(findTestSubject(wrapper!, 'queryFormTypeChooserTitle').exists()).toBeFalsy();
    expect(findTestSubject(wrapper!, 'queryFormTypeChooserCancel').exists()).toBeFalsy();
    expect(findTestSubject(wrapper!, 'selectIndexExpression').exists()).toBeTruthy();
  });

  test('should render KQL and Lucene view without the form type chooser', async () => {
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = setup(defaultSearchSourceRuleParams, {
        adHocDataViewList: [],
        isManagementPage: false,
      });
      wrapper = await wrapper.update();
    });
    wrapper = await wrapper!.update();
    expect(findTestSubject(wrapper!, 'queryFormTypeChooserTitle').exists()).toBeFalsy();
    expect(findTestSubject(wrapper!, 'queryFormTypeChooserCancel').exists()).toBeFalsy();
    expect(findTestSubject(wrapper!, 'selectDataViewExpression').exists()).toBeTruthy();
  });

  test('should render ESQL view without the form type chooser', async () => {
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = setup(defaultEsqlRuleParams, {
        adHocDataViewList: [],
        isManagementPage: false,
      });
      wrapper = await wrapper.update();
    });
    wrapper = await wrapper!.update();
    expect(findTestSubject(wrapper!, 'queryFormTypeChooserTitle').exists()).toBeFalsy();
    expect(findTestSubject(wrapper!, 'queryFormTypeChooserCancel').exists()).toBeFalsy();
    expect(wrapper.exists('[data-test-subj="queryEsqlEditor"]')).toBeTruthy();
  });
});
