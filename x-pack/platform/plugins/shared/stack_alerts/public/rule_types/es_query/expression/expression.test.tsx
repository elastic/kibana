/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataView } from '@kbn/data-views-plugin/public';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import React, { useState } from 'react';
import { docLinksServiceMock } from '@kbn/core/public/mocks';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import type { CommonEsQueryRuleParams, EsQueryRuleMetaData, EsQueryRuleParams } from '../types';
import { SearchType } from '../types';
import { EsQueryRuleTypeExpression } from './expression';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { Subject } from 'rxjs';
import type { ISearchSource } from '@kbn/data-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { indexPatternEditorPluginMock as dataViewEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';

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

const dataViewPluginMock = (() => {
  const base = dataViewPluginMocks.createStartContract();
  return Object.assign(base, {
    getFieldsForWildcard: jest.fn().mockResolvedValue([]),
    getIndices: jest.fn().mockResolvedValue([]),
  });
})();
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
const dataViewsMock = {
  ...dataViewPluginMocks.createStartContract(),
  getFieldsForWildcard: jest.fn().mockResolvedValue([]),
  getIndices: jest.fn().mockResolvedValue([]),
};
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
    groupBy: [],
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
  return renderWithI18n(
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

  test('should render options by default', () => {
    setup({} as EsQueryRuleParams<SearchType.esQuery>);
    expect(screen.getByTestId('queryFormTypeChooserTitle')).toBeInTheDocument();
    expect(screen.getByTestId('queryFormType_searchSource')).toBeInTheDocument();
    expect(screen.getByTestId('queryFormType_esQuery')).toBeInTheDocument();
    expect(screen.getByTestId('queryFormType_esqlQuery')).toBeInTheDocument();
    expect(screen.queryByTestId('queryFormTypeChooserCancel')).not.toBeInTheDocument();
  });

  test('should hide ESQL option when not enabled', () => {
    uiSettingsMock.get.mockReturnValueOnce(false);
    setup({} as EsQueryRuleParams<SearchType.esQuery>);
    expect(screen.getByTestId('queryFormTypeChooserTitle')).toBeInTheDocument();
    expect(screen.getByTestId('queryFormType_searchSource')).toBeInTheDocument();
    expect(screen.getByTestId('queryFormType_esQuery')).toBeInTheDocument();
    expect(screen.queryByTestId('queryFormType_esqlQuery')).not.toBeInTheDocument();
    expect(screen.queryByTestId('queryFormTypeChooserCancel')).not.toBeInTheDocument();
  });

  test('should switch to QueryDSL form type on selection and return back on cancel', async () => {
    setup({} as EsQueryRuleParams<SearchType.esQuery>);
    await userEvent.click(screen.getByTestId('queryFormType_esQuery'));

    await waitFor(() => {
      expect(screen.queryByTestId('queryFormTypeChooserTitle')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('queryJsonEditor')).toBeInTheDocument();
    expect(screen.getByTestId('selectIndexExpression')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('queryFormTypeChooserCancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('selectIndexExpression')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('queryFormTypeChooserTitle')).toBeInTheDocument();
  });

  test('should switch to KQL or Lucene form type on selection and return back on cancel', async () => {
    setup({} as EsQueryRuleParams<SearchType.searchSource>);
    await userEvent.click(screen.getByTestId('queryFormType_searchSource'));

    await waitFor(() => {
      expect(screen.queryByTestId('queryFormTypeChooserTitle')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('selectDataViewExpression')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('queryFormTypeChooserCancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('selectDataViewExpression')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('queryFormTypeChooserTitle')).toBeInTheDocument();
  });

  test('should switch to ESQL form type on selection and return back on cancel', async () => {
    setup({} as EsQueryRuleParams<SearchType.searchSource>);
    await userEvent.click(screen.getByTestId('queryFormType_esqlQuery'));

    await waitFor(() => {
      expect(screen.queryByTestId('queryFormTypeChooserTitle')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('queryEsqlEditor')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('queryFormTypeChooserCancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('queryEsqlEditor')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('queryFormTypeChooserTitle')).toBeInTheDocument();
  });

  test('should render QueryDSL view without the form type chooser', async () => {
    setup(defaultEsQueryRuleParams, { adHocDataViewList: [], isManagementPage: false });

    await waitFor(() => {
      expect(screen.queryByTestId('queryFormTypeChooserTitle')).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId('queryFormTypeChooserCancel')).not.toBeInTheDocument();
    expect(screen.getByTestId('selectIndexExpression')).toBeInTheDocument();
  });

  test('should render KQL and Lucene view without the form type chooser', async () => {
    setup(defaultSearchSourceRuleParams, {
      adHocDataViewList: [],
      isManagementPage: false,
    });

    await waitFor(() => {
      expect(screen.queryByTestId('queryFormTypeChooserTitle')).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId('queryFormTypeChooserCancel')).not.toBeInTheDocument();
    expect(screen.getByTestId('selectDataViewExpression')).toBeInTheDocument();
  });

  test('should render ESQL view without the form type chooser', async () => {
    setup(defaultEsqlRuleParams, {
      adHocDataViewList: [],
      isManagementPage: false,
    });

    await waitFor(() => {
      expect(screen.queryByTestId('queryFormTypeChooserTitle')).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId('queryFormTypeChooserCancel')).not.toBeInTheDocument();
    expect(screen.getByTestId('queryEsqlEditor')).toBeInTheDocument();
  });
});
