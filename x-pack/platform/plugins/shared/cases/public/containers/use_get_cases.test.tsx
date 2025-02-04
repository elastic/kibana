/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from './constants';
import { useGetCases } from './use_get_cases';
import * as api from './api';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer, allCasesCapabilities } from '../common/mock';
import { useToasts } from '../common/lib/kibana/hooks';
import { OWNERS } from '../../common/constants';

jest.mock('./api');
jest.mock('../common/lib/kibana/hooks');

// Failing: See https://github.com/elastic/kibana/issues/207955
describe.skip('useGetCases', () => {
  const abortCtrl = new AbortController();
  const addSuccess = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError: jest.fn() });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('calls getCases with correct arguments', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');
    renderHook(() => useGetCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(spyOnGetCases).toBeCalled();
    });

    expect(spyOnGetCases).toBeCalledWith({
      filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: ['securitySolution'] },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('shows a toast error message when an error occurs in the response', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');
    spyOnGetCases.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

    renderHook(() => useGetCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });

  it('should set all owners when no owner is provided', async () => {
    appMockRender = createAppMockRenderer({ owner: [] });

    appMockRender.coreStart.application.capabilities = {
      ...appMockRender.coreStart.application.capabilities,
      generalCasesV3: allCasesCapabilities(),
      observabilityCasesV3: allCasesCapabilities(),
      securitySolutionCasesV3: allCasesCapabilities(),
    };

    const spyOnGetCases = jest.spyOn(api, 'getCases');
    renderHook(() => useGetCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toBeCalledWith({
      filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: [...OWNERS] },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('should set only the available owners when no owner is provided', async () => {
    appMockRender = createAppMockRenderer({ owner: [] });

    appMockRender.coreStart.application.capabilities = {
      ...appMockRender.coreStart.application.capabilities,
      generalCasesV3: allCasesCapabilities(),
    };

    const spyOnGetCases = jest.spyOn(api, 'getCases');

    renderHook(() => useGetCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toBeCalledWith({
      filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: ['cases'] },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('should use the app owner when the filter options do not specify the owner', async () => {
    appMockRender = createAppMockRenderer({ owner: ['observability'] });
    const spyOnGetCases = jest.spyOn(api, 'getCases');

    renderHook(() => useGetCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toBeCalledWith({
      filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: ['observability'] },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('respects the owner in the filter options if provided', async () => {
    appMockRender = createAppMockRenderer({ owner: ['observability'] });
    const spyOnGetCases = jest.spyOn(api, 'getCases');

    renderHook(() => useGetCases({ filterOptions: { owner: ['my-owner'] } }), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toBeCalledWith({
      filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: ['my-owner'] },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });
});
