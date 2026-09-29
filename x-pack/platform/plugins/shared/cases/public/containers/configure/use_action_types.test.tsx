/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { waitFor, renderHook } from '@testing-library/react';
import * as api from './api';

import { TestProviders } from '../../common/mock';
import { useGetActionTypes } from './use_action_types';
import { useToasts } from '../../common/lib/kibana';

vi.mock('./api');
vi.mock('../../common/lib/kibana');

describe('useActionTypes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch action types', async () => {
    const spy = vi.spyOn(api, 'fetchActionTypes');

    renderHook(() => useGetActionTypes(), {
      wrapper: TestProviders,
    });

    expect(spy).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
  });

  it('should show a toast error message if failed to fetch', async () => {
    const spyOnFetchActionTypes = vi.spyOn(api, 'fetchActionTypes');

    spyOnFetchActionTypes.mockRejectedValue(() => {
      throw new Error('Something went wrong');
    });

    const addErrorMock = vi.fn();

    (useToasts as Mock).mockReturnValue({ addError: addErrorMock });

    renderHook(() => useGetActionTypes(), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(addErrorMock).toHaveBeenCalled());
  });
});
