/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useGetCaseUsers } from './use_get_case_users';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useGetCaseUsers', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'getCaseUsers');

    const { waitForNextUpdate } = renderHook(() => useGetCaseUsers('case-1'), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith({ caseId: 'case-1', signal: expect.any(AbortSignal) });
  });

  it('shows a toast error when the api return an error', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const spy = jest.spyOn(api, 'getCaseUsers').mockRejectedValue(new Error("C'est la vie"));
    const { waitForNextUpdate } = renderHook(() => useGetCaseUsers('case-1'), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith({ caseId: 'case-1', signal: expect.any(AbortSignal) });
    expect(addError).toHaveBeenCalled();
  });
});
