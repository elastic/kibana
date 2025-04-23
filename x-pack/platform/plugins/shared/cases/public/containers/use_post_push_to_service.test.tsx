/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, renderHook } from '@testing-library/react';
import { useToasts } from '../common/lib/kibana';
import { usePostPushToService } from './use_post_push_to_service';
import { pushedCase } from './mock';
import * as api from './api';
import type { CaseConnector } from '../../common/types/domain';
import { ConnectorTypes } from '../../common/types/domain';
import { casesQueriesKeys } from './constants';
import { TestProviders, createTestQueryClient } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('usePostPushToService', () => {
  const connector = {
    id: '123',
    name: 'My connector',
    type: ConnectorTypes.jira,
    fields: { issueType: 'Task', priority: 'Low', parent: null },
  } as CaseConnector;
  const caseId = pushedCase.id;

  const addSuccess = jest.fn();
  const addError = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refresh the case after pushing', async () => {
    const queryClient = createTestQueryClient();
    const queryClientSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => usePostPushToService(), {
      wrapper: (props) => <TestProviders {...props} queryClient={queryClient} />,
    });

    act(() => {
      result.current.mutate({ caseId, connector });
    });

    await waitFor(() => {
      expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.caseView());
    });

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'pushCase');
    const { result } = renderHook(() => usePostPushToService(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ caseId, connector });
    });

    await waitFor(() => expect(spy).toHaveBeenCalledWith({ caseId, connectorId: connector.id }));
  });

  it('shows a success toaster', async () => {
    const { result } = renderHook(() => usePostPushToService(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ caseId, connector });
    });

    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith({
        title: 'Successfully sent to My connector',
        className: 'eui-textBreakWord',
      })
    );
  });

  it('shows a toast error when the api return an error', async () => {
    jest.spyOn(api, 'pushCase').mockRejectedValue(new Error('usePostPushToService: Test error'));

    const { result } = renderHook(() => usePostPushToService(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ caseId, connector });
    });

    await waitFor(() => expect(addError).toHaveBeenCalled());
  });
});
