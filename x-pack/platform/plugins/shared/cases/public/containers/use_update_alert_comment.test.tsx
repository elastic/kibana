/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, renderHook } from '@testing-library/react';
import { alertCommentPatch } from './mock';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';
import { casesQueriesKeys } from './constants';
import { TestProviders, createTestQueryClient } from '../common/mock';
import { useUpdateAlertComment } from './use_update_alert_comment';
import type { AlertAttachmentPayload } from '../../common/types/domain';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useUpdateAlertComment', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleUpdate: {
    caseId: string;
    commentUpdate: AlertAttachmentPayload & {
      id: string;
      version: string;
    };
    successToasterTitle: string;
  } = {
    caseId: 'test-id',
    commentUpdate: alertCommentPatch,
    successToasterTitle: 'Done!',
  };

  it('patch case and refresh the case page', async () => {
    const queryClient = createTestQueryClient();
    const queryClientSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateAlertComment(), {
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
    const patchAlertCommentSpy = jest.spyOn(api, 'patchAlertComment');
    const { result } = renderHook(() => useUpdateAlertComment(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitFor(() =>
      expect(patchAlertCommentSpy).toHaveBeenCalledWith({
        caseId: 'test-id',
        commentUpdate: alertCommentPatch,
      })
    );
  });

  it('shows a success toaster', async () => {
    const { result } = renderHook(() => useUpdateAlertComment(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith({
        title: 'Done!',
        className: 'eui-textBreakWord',
      })
    );
  });

  it('shows a toast error when the api return an error', async () => {
    jest.spyOn(api, 'patchAlertComment').mockRejectedValue(new Error('useUpdateCase: Test error'));

    const { result } = renderHook(() => useUpdateAlertComment(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitFor(() => expect(addError).toHaveBeenCalled());
  });
});
