/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import * as api from './api';
import { useCasesToast } from '../common/use_cases_toast';
import { casesQueriesKeys } from './constants';
import { useReplaceCustomField } from './use_replace_custom_field';
import { basicCaseFixture } from './test_fixtures';
import { CustomFieldTypes } from '../../common/types/domain';

jest.mock('./api', () => ({
  getCase: jest.fn(),
  replaceCustomField: jest.fn(),
}));
jest.mock('../common/use_cases_toast', () => ({
  useCasesToast: jest.fn(),
}));

describe('useReplaceCustomField', () => {
  const sampleData = {
    caseId: basicCaseFixture.id,
    customFieldId: 'test_key_1',
    customFieldValue: 'this is an updated custom field',
    caseVersion: basicCaseFixture.version,
    caseData: basicCaseFixture,
  };

  const showErrorToast = jest.fn();
  (useCasesToast as jest.Mock).mockReturnValue({ showErrorToast });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  const getWrapper = (queryClient: QueryClient) =>
    function Wrapper({ children }: React.PropsWithChildren<{}>) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };

  it('replace a customField and refresh the case page', async () => {
    const queryClient = createQueryClient();
    const queryClientSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useReplaceCustomField(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(sampleData);
    });

    await waitFor(() => {
      expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.caseView());
    });

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const patchCustomFieldSpy = jest.spyOn(api, 'replaceCustomField');
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useReplaceCustomField(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(sampleData);
    });

    await waitFor(() =>
      expect(patchCustomFieldSpy).toHaveBeenCalledWith({
        caseId: sampleData.caseId,
        customFieldId: sampleData.customFieldId,
        request: {
          value: sampleData.customFieldValue,
          caseVersion: sampleData.caseVersion,
        },
      })
    );
  });

  it('calls the api when invoked with the correct parameters of toggle field', async () => {
    const newData = {
      caseId: basicCaseFixture.id,
      customFieldId: 'test_key_2',
      customFieldValue: false,
      caseVersion: basicCaseFixture.version,
      caseData: basicCaseFixture,
    };
    const patchCustomFieldSpy = jest.spyOn(api, 'replaceCustomField');
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useReplaceCustomField(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(newData);
    });

    await waitFor(() =>
      expect(patchCustomFieldSpy).toHaveBeenCalledWith({
        caseId: newData.caseId,
        customFieldId: newData.customFieldId,
        request: {
          value: newData.customFieldValue,
          caseVersion: newData.caseVersion,
        },
      })
    );
  });

  it('calls the api when invoked with the correct parameters with null value', async () => {
    const newData = {
      caseId: basicCaseFixture.id,
      customFieldId: 'test_key_3',
      customFieldValue: null,
      caseVersion: basicCaseFixture.version,
      caseData: basicCaseFixture,
    };
    const patchCustomFieldSpy = jest.spyOn(api, 'replaceCustomField');
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useReplaceCustomField(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(newData);
    });

    await waitFor(() =>
      expect(patchCustomFieldSpy).toHaveBeenCalledWith({
        caseId: newData.caseId,
        customFieldId: newData.customFieldId,
        request: {
          value: newData.customFieldValue,
          caseVersion: newData.caseVersion,
        },
      })
    );
  });

  it('retries once with the latest version when only system-managed fields changed', async () => {
    const latestCase = {
      ...basicCaseFixture,
      incrementalId: 42,
      updatedAt: '2024-01-01T00:00:00.000Z',
      version: 'WzQ4LDFd',
    };
    const conflictError = Object.assign(new Error('Conflict'), {
      body: { statusCode: 409 },
    });

    const replaceCustomFieldSpy = jest
      .spyOn(api, 'replaceCustomField')
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce({
        key: sampleData.customFieldId,
        type: CustomFieldTypes.TEXT,
        value: sampleData.customFieldValue,
      });
    const getCaseSpy = jest.spyOn(api, 'getCase').mockResolvedValue(latestCase);
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useReplaceCustomField(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(sampleData);
    });

    await waitFor(() => expect(replaceCustomFieldSpy).toHaveBeenCalledTimes(2));

    expect(getCaseSpy).toHaveBeenCalledWith({ caseId: basicCaseFixture.id });
    expect(replaceCustomFieldSpy).toHaveBeenNthCalledWith(2, {
      caseId: sampleData.caseId,
      customFieldId: sampleData.customFieldId,
      request: {
        value: sampleData.customFieldValue,
        caseVersion: latestCase.version,
      },
    });
  });

  it('shows a toast error when the api return an error', async () => {
    jest
      .spyOn(api, 'replaceCustomField')
      .mockRejectedValue(new Error('useUpdateComment: Test error'));
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useReplaceCustomField(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(sampleData);
    });

    await waitFor(() => expect(showErrorToast).toHaveBeenCalled());
  });
});
