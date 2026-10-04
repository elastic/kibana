/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, renderHook } from '@testing-library/react';
import { useToasts } from '../common/lib/kibana';
import { usePostSyncCase } from './use_post_sync_case';
import { pushedCase } from './mock';
import * as api from './api';
import { casesQueriesKeys } from './constants';
import { TestProviders, createTestQueryClient } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('usePostSyncCase', () => {
  const caseId = pushedCase.id;
  const addSuccess = jest.fn();
  const addError = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the api and refreshes the case view', async () => {
    const spy = jest.spyOn(api, 'syncCase');
    const queryClient = createTestQueryClient();
    const queryClientSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => usePostSyncCase(), {
      wrapper: (props) => <TestProviders {...props} queryClient={queryClient} />,
    });

    act(() => {
      result.current.mutate({ caseId, connectorName: 'My SN connector' });
    });

    await waitFor(() => expect(spy).toHaveBeenCalledWith({ caseId }));
    await waitFor(() => {
      expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.caseView());
    });
    expect(addSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Synced from My SN connector' })
    );
  });

  it('shows an error toast when the sync fails', async () => {
    jest.spyOn(api, 'syncCase').mockRejectedValue(new Error('nope'));

    const { result } = renderHook(() => usePostSyncCase(), { wrapper: TestProviders });

    act(() => {
      result.current.mutate({ caseId, connectorName: 'My SN connector' });
    });

    await waitFor(() => expect(addError).toHaveBeenCalled());
    expect(addSuccess).not.toHaveBeenCalled();
  });
});
