/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, renderHook } from '@testing-library/react';
import { basicCase } from './mock';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';
import { casesQueriesKeys } from './constants';
import { useUpdateComment } from './use_update_comment';
import { TestProviders, createTestQueryClient } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useUpdateComment', () => {
  const sampleUpdate = {
    caseId: basicCase.id,
    commentId: basicCase.comments[0].id,
    commentUpdate: 'updated comment',
    version: basicCase.comments[0].version,
  };

  const addSuccess = jest.fn();
  const addError = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('patch case and refresh the case page', async () => {
    const queryClient = createTestQueryClient();
    const queryClientSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateComment(), {
      wrapper: (props) => <TestProviders {...props} queryClient={queryClient} />,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitFor(() => {
      expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.caseView());
    });

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const patchCommentSpy = jest.spyOn(api, 'patchComment');
    const { result } = renderHook(() => useUpdateComment(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitFor(() =>
      expect(patchCommentSpy).toHaveBeenCalledWith({
        ...sampleUpdate,
        owner: 'securitySolution',
      })
    );
  });

  it('shows a toast error when the api return an error', async () => {
    jest.spyOn(api, 'patchComment').mockRejectedValue(new Error('useUpdateComment: Test error'));

    const { result } = renderHook(() => useUpdateComment(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitFor(() => expect(addError).toHaveBeenCalled());
  });
});
