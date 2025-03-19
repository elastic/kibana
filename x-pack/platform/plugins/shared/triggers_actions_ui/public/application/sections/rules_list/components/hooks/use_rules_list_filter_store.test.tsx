/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import * as useLocalStorage from 'react-use/lib/useLocalStorage';
import { useRulesListFilterStore } from './use_rules_list_filter_store';

jest.mock('@kbn/kibana-utils-plugin/public');
const { createKbnUrlStateStorage } = jest.requireMock('@kbn/kibana-utils-plugin/public');

const useUrlStateStorageGetMock = jest.fn();
const useUrlStateStorageSetMock = jest.fn();
const setRulesListFilterLocalMock = jest.fn();
const LOCAL_STORAGE_KEY = 'test_local';
describe('useRulesListFilterStore', () => {
  beforeAll(() => {
    createKbnUrlStateStorage.mockReturnValue({
      get: useUrlStateStorageGetMock,
      set: useUrlStateStorageSetMock,
    });
  });

  beforeEach(() => {
    jest
      .spyOn(useLocalStorage, 'default')
      .mockImplementation(() => [null, setRulesListFilterLocalMock, () => {}]);
    useUrlStateStorageGetMock.mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should return empty filter when url query param and local storage and props are empty', async () => {
    const { result } = renderHook(() =>
      useRulesListFilterStore({
        rulesListKey: LOCAL_STORAGE_KEY,
      })
    );
    expect(result.current.filters).toEqual({
      actionTypes: [],
      kueryNode: undefined,
      ruleExecutionStatuses: [],
      ruleLastRunOutcomes: [],
      ruleParams: {},
      ruleStatuses: [],
      searchText: '',
      tags: [],
      types: [],
    });
    expect(result.current.numberOfFiltersStore).toEqual(0);
  });

  it('Should return the props as filter when url query param and local storage are empty', () => {
    const { result } = renderHook(() =>
      useRulesListFilterStore({
        lastResponseFilter: ['props-lastResponse-filter'],
        lastRunOutcomeFilter: ['props-lastRunOutcome-filter'],
        rulesListKey: LOCAL_STORAGE_KEY,
        ruleParamFilter: { propsRuleParams: 'props-ruleParams-filter' },
        statusFilter: ['enabled'],
        searchFilter: 'props-search-filter',
        typeFilter: ['props-ruleType-filter'],
      })
    );
    expect(result.current.filters).toEqual({
      actionTypes: [],
      kueryNode: undefined,
      ruleExecutionStatuses: ['props-lastResponse-filter'],
      ruleLastRunOutcomes: ['props-lastRunOutcome-filter'],
      ruleParams: {
        propsRuleParams: 'props-ruleParams-filter',
      },
      ruleStatuses: ['enabled'],
      searchText: 'props-search-filter',
      tags: [],
      types: ['props-ruleType-filter'],
    });
    expect(result.current.numberOfFiltersStore).toEqual(6);
  });

  it('Should return the local storage params as filter when url query param is empty', () => {
    jest.spyOn(useLocalStorage, 'default').mockImplementation(() => [
      {
        actionTypes: ['localStorage-actionType-filter'],
        lastResponse: ['localStorage-lastResponse-filter'],
        params: { localStorageRuleParams: 'localStorage-ruleParams-filter' },
        search: 'localStorage-search-filter',
        status: ['disabled'],
        tags: ['localStorage-tag-filter'],
        type: ['localStorage-ruleType-filter'],
      },
      () => null,
      () => {},
    ]);
    const { result } = renderHook(() =>
      useRulesListFilterStore({
        lastResponseFilter: ['props-lastResponse-filter'],
        lastRunOutcomeFilter: ['props-lastRunOutcome-filter'],
        rulesListKey: LOCAL_STORAGE_KEY,
        ruleParamFilter: { propsRuleParams: 'props-ruleParams-filter' },
        statusFilter: ['enabled'],
        searchFilter: 'props-search-filter',
        typeFilter: ['ruleType-filter'],
      })
    );
    expect(result.current.filters).toEqual({
      actionTypes: ['localStorage-actionType-filter'],
      kueryNode: undefined,
      // THIS is valid because we are not using this param in local storage
      ruleExecutionStatuses: ['props-lastResponse-filter'],
      ruleLastRunOutcomes: ['localStorage-lastResponse-filter'],
      ruleParams: {
        localStorageRuleParams: 'localStorage-ruleParams-filter',
      },
      ruleStatuses: ['disabled'],
      searchText: 'localStorage-search-filter',
      tags: ['localStorage-tag-filter'],
      types: ['localStorage-ruleType-filter'],
    });
    expect(result.current.numberOfFiltersStore).toEqual(8);
  });

  it('Should return the url params as filter when url query param is empty', () => {
    jest.spyOn(useLocalStorage, 'default').mockImplementation(() => [
      {
        actionTypes: ['localStorage-actionType-filter'],
        lastResponse: ['localStorage-lastResponse-filter'],
        params: { localStorageRuleParams: 'localStorage-ruleParams-filter' },
        search: 'localStorage-search-filter',
        status: ['disabled'],
        tags: ['localStorage-tag-filter'],
        type: ['localStorage-ruleType-filter'],
      },
      () => null,
      () => {},
    ]);
    useUrlStateStorageGetMock.mockReturnValue({
      actionTypes: ['urlQueryParams-actionType-filter'],
      lastResponse: ['urlQueryParams-lastResponse-filter'],
      params: { urlQueryParamsRuleParams: 'urlQueryParams-ruleParams-filter' },
      search: 'urlQueryParams-search-filter',
      status: ['snoozed'],
      tags: ['urlQueryParams-tag-filter'],
      type: ['urlQueryParams-ruleType-filter'],
    });
    const { result } = renderHook(() =>
      useRulesListFilterStore({
        lastResponseFilter: ['props-lastResponse-filter'],
        lastRunOutcomeFilter: ['props-lastRunOutcome-filter'],
        rulesListKey: LOCAL_STORAGE_KEY,
        ruleParamFilter: { propsRuleParams: 'props-ruleParams-filter' },
        statusFilter: ['enabled'],
        searchFilter: 'props-search-filter',
        typeFilter: ['ruleType-filter'],
      })
    );
    expect(result.current.filters).toEqual({
      actionTypes: ['urlQueryParams-actionType-filter'],
      kueryNode: undefined,
      // THIS is valid because we are not using this param in url query params
      ruleExecutionStatuses: ['props-lastResponse-filter'],
      ruleLastRunOutcomes: ['urlQueryParams-lastResponse-filter'],
      ruleParams: {
        urlQueryParamsRuleParams: 'urlQueryParams-ruleParams-filter',
      },
      ruleStatuses: ['snoozed'],
      searchText: 'urlQueryParams-search-filter',
      tags: ['urlQueryParams-tag-filter'],
      types: ['urlQueryParams-ruleType-filter'],
    });
    expect(result.current.numberOfFiltersStore).toEqual(8);
  });

  it('Should clear filter when resetFiltersStore has been called', async () => {
    useUrlStateStorageGetMock.mockReturnValue({
      actionTypes: ['urlQueryParams-actionType-filter'],
      lastResponse: ['urlQueryParams-lastResponse-filter'],
      params: { urlQueryParamsRuleParams: 'urlQueryParams-ruleParams-filter' },
      search: 'urlQueryParams-search-filter',
      status: ['snoozed'],
      tags: ['urlQueryParams-tag-filter'],
      type: ['urlQueryParams-ruleType-filter'],
    });
    const { result } = renderHook(() =>
      useRulesListFilterStore({
        rulesListKey: LOCAL_STORAGE_KEY,
      })
    );
    expect(result.current.filters).toEqual({
      actionTypes: ['urlQueryParams-actionType-filter'],
      kueryNode: undefined,
      ruleExecutionStatuses: [],
      ruleLastRunOutcomes: ['urlQueryParams-lastResponse-filter'],
      ruleParams: {
        urlQueryParamsRuleParams: 'urlQueryParams-ruleParams-filter',
      },
      ruleStatuses: ['snoozed'],
      searchText: 'urlQueryParams-search-filter',
      tags: ['urlQueryParams-tag-filter'],
      types: ['urlQueryParams-ruleType-filter'],
    });
    expect(result.current.numberOfFiltersStore).toEqual(7);

    act(() => {
      result.current.resetFiltersStore();
    });

    expect(result.current.filters).toEqual({
      actionTypes: [],
      kueryNode: undefined,
      ruleExecutionStatuses: [],
      ruleLastRunOutcomes: [],
      ruleParams: {},
      ruleStatuses: [],
      searchText: '',
      tags: [],
      types: [],
    });
    expect(result.current.numberOfFiltersStore).toEqual(0);
    expect(useUrlStateStorageSetMock).toBeCalledTimes(1);
    expect(setRulesListFilterLocalMock).toBeCalledTimes(1);
  });

  it('Should set filter when setFiltersStore has been called', async () => {
    const { result } = renderHook(() =>
      useRulesListFilterStore({
        rulesListKey: LOCAL_STORAGE_KEY,
      })
    );
    expect(result.current.filters).toEqual({
      actionTypes: [],
      kueryNode: undefined,
      ruleExecutionStatuses: [],
      ruleLastRunOutcomes: [],
      ruleParams: {},
      ruleStatuses: [],
      searchText: '',
      tags: [],
      types: [],
    });
    expect(result.current.numberOfFiltersStore).toEqual(0);

    act(() => {
      result.current.setFiltersStore({ filter: 'tags', value: ['my-tags'] });
    });

    expect(result.current.filters).toEqual({
      actionTypes: [],
      kueryNode: undefined,
      ruleExecutionStatuses: [],
      ruleLastRunOutcomes: [],
      ruleParams: {},
      ruleStatuses: [],
      searchText: '',
      tags: ['my-tags'],
      types: [],
    });
    expect(result.current.numberOfFiltersStore).toEqual(1);
    expect(useUrlStateStorageSetMock).toBeCalledTimes(1);
    expect(setRulesListFilterLocalMock).toBeCalledTimes(1);
  });
});
