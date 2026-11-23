/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';

import { COMMENT_ATTACHMENT_TYPE, SECURITY_SOLUTION_OWNER } from '../../common/constants';
import { useCreateAttachments } from './use_create_attachments';
import { basicCaseId } from './mock';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';
import { TestProviders } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const useToastMock = useToasts as jest.Mock;

describe('useCreateAttachments', () => {
  const addError = jest.fn();
  const addSuccess = jest.fn();

  useToastMock.mockReturnValue({
    addError,
    addSuccess,
  });

  const commentAttachment = {
    type: COMMENT_ATTACHMENT_TYPE,
    data: { content: 'a comment' },
  };

  const request = {
    caseId: basicCaseId,
    caseOwner: SECURITY_SOLUTION_OWNER,
    attachments: [commentAttachment],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'createAttachments');

    const { result } = renderHook(() => useCreateAttachments(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate(request);
    });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({
        attachments: [{ ...commentAttachment, owner: SECURITY_SOLUTION_OWNER }],
        caseId: request.caseId,
      })
    );
  });

  it('does not show a success toaster', async () => {
    const { result } = renderHook(() => useCreateAttachments(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate(request);
    });

    await waitFor(() => expect(addSuccess).not.toHaveBeenCalled());
  });

  it('shows a toast error when the api return an error', async () => {
    jest
      .spyOn(api, 'createAttachments')
      .mockRejectedValue(new Error('useCreateAttachments: Test error'));

    const { result } = renderHook(() => useCreateAttachments(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate(request);
    });

    await waitFor(() => expect(addError).toHaveBeenCalled());
  });
});
