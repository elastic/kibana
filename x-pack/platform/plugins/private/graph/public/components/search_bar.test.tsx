/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { SearchBarProps, SearchBarStateProps } from './search_bar';
import { SearchBar, SearchBarComponent } from './search_bar';
import React, { useState } from 'react';
import type {
  DocLinksStart,
  HttpStart,
  IUiSettingsClient,
  NotificationsStart,
  OverlayStart,
} from '@kbn/core/public';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createStubDataView } from '@kbn/data-views-plugin/common/mocks';
import type { DataView } from '@kbn/data-views-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { openSourceModal } from '../services/source_modal';

import type { GraphStore } from '../state_management';
import { setDatasource, submitSearchSaga } from '../state_management';
import { createMockGraphStore } from '../state_management/mocks';
import { Provider } from 'react-redux';
import { createQueryStringInput } from '@kbn/kql/public/components/query_string_input/get_query_string_input';
import { kqlPluginMock } from '@kbn/kql/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';

jest.mock('../services/source_modal', () => ({ openSourceModal: jest.fn() }));

const getServiceMocks = () => {
  const docLinks = {
    links: {
      query: {
        kueryQuerySyntax: '',
        luceneQuerySyntax: '',
      },
    },
  } as DocLinksStart;
  const uiSettings = {
    get: () => 10,
  } as unknown as IUiSettingsClient;
  const kqlMock = kqlPluginMock.createStartContract();

  return {
    overlays: {} as OverlayStart,
    appName: 'graph',
    kql: {
      QueryStringInput: createQueryStringInput({
        docLinks,
        uiSettings,
        storage: {
          get: () => {},
          set: () => {},
          remove: () => {},
          clear: () => {},
        } as IStorageWrapper,
        data: dataPluginMock.createStartContract(),
        autocomplete: kqlMock.autocomplete,
        notifications: {} as NotificationsStart,
        http: {
          post: jest.fn().mockResolvedValue(undefined),
        } as unknown as HttpStart,
        dataViews: dataViewPluginMocks.createStartContract(),
      }),
    },
  };
};

const SearchBarHarness = (props: SearchBarProps) => {
  const [currentIndexPattern, setCurrentIndexPattern] = useState<DataView | undefined>(
    props.currentIndexPattern
  );

  return (
    <SearchBar
      {...props}
      currentIndexPattern={currentIndexPattern}
      onIndexPatternChange={setCurrentIndexPattern}
    />
  );
};

describe('search_bar', () => {
  let dispatchSpy: jest.Mock;
  let store: GraphStore;
  const defaultProps: SearchBarProps = {
    isLoading: false,
    urlQuery: null,
    indexPatternProvider: {
      get: jest.fn(() =>
        Promise.resolve(createStubDataView({ spec: { fields: {}, name: 'Test Name' } }))
      ),
    },
    confirmWipeWorkspace: (callback: () => void) => {
      callback();
    },
    onIndexPatternChange: jest.fn(),
  };

  const renderSearchBar = (props: Partial<SearchBarProps> = {}) =>
    renderWithKibanaRenderContext(
      <Provider store={store}>
        <KibanaContextProvider services={getServiceMocks()}>
          <SearchBarHarness {...defaultProps} {...props} />
        </KibanaContextProvider>
      </Provider>
    );

  const renderSearchBarComponent = (props: SearchBarProps & SearchBarStateProps) =>
    renderWithKibanaRenderContext(
      <KibanaContextProvider services={getServiceMocks()}>
        <SearchBarComponent {...props} />
      </KibanaContextProvider>
    );

  const submitForm = () => {
    const form = screen.getByTestId('graph-explore-button').closest('form');
    if (!form) {
      throw new Error('Expected the graph search bar form to be rendered');
    }
    fireEvent.submit(form);
  };

  const enterQuery = async (query: string, language?: 'lucene') => {
    const user = userEvent.setup();

    if (language === 'lucene') {
      await user.click(await screen.findByTestId('switchQueryLanguageButton'));
      await user.click(await screen.findByTestId('luceneLanguageMenuItem'));
    }

    fireEvent.change(await screen.findByTestId('queryInput'), { target: { value: query } });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    store = createMockGraphStore({
      sagas: [submitSearchSaga],
    }).store;

    store.dispatch(
      setDatasource({
        type: 'indexpattern',
        id: '123',
        title: 'test-index',
      })
    );

    dispatchSpy = jest.fn(store.dispatch);
    store.dispatch = dispatchSpy;
  });

  it('should render search bar and fetch index pattern', async () => {
    renderSearchBar();

    await waitFor(() => {
      expect(defaultProps.indexPatternProvider.get).toHaveBeenCalledWith('123');
    });
  });

  it('should render search bar and submit queries', async () => {
    renderSearchBar();

    await waitFor(() => {
      expect(defaultProps.indexPatternProvider.get).toHaveBeenCalledWith('123');
    });
    await screen.findByText('Test Name');

    await enterQuery('testQuery', 'lucene');
    submitForm();

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'x-pack/graph/workspace/SUBMIT_SEARCH',
      payload: 'testQuery',
    });
  });

  it('should translate kql query into JSON dsl', async () => {
    renderSearchBar();

    await waitFor(() => {
      expect(defaultProps.indexPatternProvider.get).toHaveBeenCalledWith('123');
    });
    await screen.findByText('Test Name');

    await enterQuery('test: abc');
    submitForm();

    const parsedQuery = JSON.parse(dispatchSpy.mock.calls[0][0].payload);
    expect(parsedQuery).toEqual({
      bool: { should: [{ match: { test: 'abc' } }], minimum_should_match: 1 },
    });
  });

  it('should open index pattern picker', async () => {
    const user = userEvent.setup();
    renderSearchBar();

    await user.click(await screen.findByTestId('graphDatasourceButton'));

    expect(openSourceModal).toHaveBeenCalled();
  });

  it('should disable the graph button when no data view is configured', async () => {
    renderSearchBarComponent({
      ...defaultProps,
      submit: jest.fn(),
      onIndexPatternSelected: jest.fn(),
      currentDatasource: undefined,
      selectedFields: [
        {
          name: 'field1',
          color: 'black',
          icon: { id: 'a', package: 'eui', label: '', prevName: '' },
          selected: true,
          type: 'string',
          aggregatable: true,
        },
      ],
    });

    expect(await screen.findByTestId('graph-explore-button')).toBeDisabled();
  });

  it('should disable the graph button when no field is configured', async () => {
    renderSearchBarComponent({
      ...defaultProps,
      currentIndexPattern: createStubDataView({ spec: { fields: {}, name: 'Test Name' } }),
      submit: jest.fn(),
      onIndexPatternSelected: jest.fn(),
      currentDatasource: {
        type: 'indexpattern',
        id: '123',
        title: 'test-index',
      },
      selectedFields: [],
    });

    expect(await screen.findByTestId('graph-explore-button')).toBeDisabled();
  });
});
