/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from './constants';
import { useGetCases } from './use_get_cases';
import * as api from './api';
import { TestProviders, allCasesCapabilities } from '../common/mock';
import { useToasts } from '../common/lib/kibana/hooks';
import { OWNERS } from '../../common/constants';
import { coreMock } from '@kbn/core/public/mocks';

jest.mock('./api');
jest.mock('../common/lib/kibana/hooks');

// Failing: See https://github.com/elastic/kibana/issues/207955
describe('useGetCases', () => {
  const abortCtrl = new AbortController();
  const addSuccess = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError: jest.fn() });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls getCases with correct arguments', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');
    renderHook(() => useGetCases(), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toHaveBeenCalledWith({
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
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });

  it('should set all owners when no owner is provided', async () => {
    const coreStart = coreMock.createStart();

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      generalCasesV3: allCasesCapabilities(),
      observabilityCasesV3: allCasesCapabilities(),
      securitySolutionCasesV3: allCasesCapabilities(),
    };

    const spyOnGetCases = jest.spyOn(api, 'getCases');
    renderHook(() => useGetCases(), {
      wrapper: (props) => <TestProviders {...props} owner={[]} coreStart={coreStart} />,
    });

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toHaveBeenCalledWith({
      filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: [...OWNERS] },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('should set only the available owners when no owner is provided', async () => {
    const coreStart = coreMock.createStart();

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      generalCasesV3: allCasesCapabilities(),
    };

    const spyOnGetCases = jest.spyOn(api, 'getCases');

    renderHook(() => useGetCases(), {
      wrapper: (props) => <TestProviders {...props} owner={[]} coreStart={coreStart} />,
    });

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toHaveBeenCalledWith({
      filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: ['cases'] },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('should use the app owner when the filter options do not specify the owner', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');

    renderHook(() => useGetCases(), {
      wrapper: (props) => <TestProviders {...props} owner={['observability']} />,
    });

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toHaveBeenCalledWith({
      filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: ['observability'] },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('respects the owner in the filter options if provided', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');

    renderHook(() => useGetCases({ filterOptions: { owner: ['my-owner'] } }), {
      wrapper: (props) => <TestProviders {...props} owner={['observability']} />,
    });

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toHaveBeenCalledWith({
      filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: ['my-owner'] },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('should change search and searchFields for incremental id searches', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');

    renderHook(() => useGetCases({ filterOptions: { search: '#123' } }), {
      wrapper: (props) => <TestProviders {...props} />,
    });

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toHaveBeenCalledWith({
      filterOptions: {
        ...DEFAULT_FILTER_OPTIONS,
        search: '123',
        searchFields: ['cases.incremental_id.text'],
        owner: ['securitySolution'],
      },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('should change search and searchFields when incremental id and title are provided', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');

    renderHook(() => useGetCases({ filterOptions: { search: 'test #123' } }), {
      wrapper: (props) => <TestProviders {...props} />,
    });

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toHaveBeenCalledWith({
      filterOptions: {
        ...DEFAULT_FILTER_OPTIONS,
        search: 'test #123',
        owner: ['securitySolution'],
      },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('merges search-bar extendedFieldFilters with picker filters and strips matched tokens from search', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');

    renderHook(
      () =>
        useGetCases({
          filterOptions: {
            search: 'Escalate:true free text',
            extendedFieldFilters: [{ label: 'Customer Facing', value: 'false' }],
          },
        }),
      {
        wrapper: (props) => <TestProviders {...props} />,
      }
    );

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toBeCalledWith({
      filterOptions: {
        ...DEFAULT_FILTER_OPTIONS,
        search: 'free text',
        extendedFieldFilters: [
          { label: 'Customer Facing', value: 'false' },
          { label: 'Escalate', value: 'true' },
        ],
        owner: ['securitySolution'],
      },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('ignores search-bar extendedFieldFilters with empty values', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');

    renderHook(
      () =>
        useGetCases({
          filterOptions: {
            search: 'Escalate:"" free text',
          },
        }),
      {
        wrapper: (props) => <TestProviders {...props} />,
      }
    );

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toBeCalledWith({
      filterOptions: {
        ...DEFAULT_FILTER_OPTIONS,
        search: 'free text',
        extendedFieldFilters: [],
        owner: ['securitySolution'],
      },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('retains valid search-bar extendedFieldFilters alongside empty values', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');

    renderHook(
      () =>
        useGetCases({
          filterOptions: {
            search: 'Escalate:"" Customer:true free text',
          },
        }),
      {
        wrapper: (props) => <TestProviders {...props} />,
      }
    );

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toBeCalledWith({
      filterOptions: {
        ...DEFAULT_FILTER_OPTIONS,
        search: 'free text',
        extendedFieldFilters: [{ label: 'Customer', value: 'true' }],
        owner: ['securitySolution'],
      },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('dedupes overlapping search-bar and picker extendedFieldFilters', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');

    renderHook(
      () =>
        useGetCases({
          filterOptions: {
            search: 'Escalate:true',
            extendedFieldFilters: [{ label: 'Escalate', value: 'true' }],
          },
        }),
      {
        wrapper: (props) => <TestProviders {...props} />,
      }
    );

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toBeCalledWith({
      filterOptions: {
        ...DEFAULT_FILTER_OPTIONS,
        search: '',
        extendedFieldFilters: [{ label: 'Escalate', value: 'true' }],
        owner: ['securitySolution'],
      },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });
});
