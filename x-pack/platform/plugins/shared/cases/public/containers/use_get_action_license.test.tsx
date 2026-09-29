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
import { useGetActionLicense } from './use_get_action_license';
import { useToasts } from '../common/lib/kibana';
import { TestProviders } from '../common/mock';

vi.mock('./api');
vi.mock('../common/lib/kibana');

describe('useGetActionLicense', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getActionLicense with correct arguments', async () => {
    const spyOnGetActionLicense = vi.spyOn(api, 'getActionLicense');
    renderHook(() => useGetActionLicense(), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(spyOnGetActionLicense).toHaveBeenCalledWith(expect.any(AbortSignal)));
  });

  it('unhappy path', async () => {
    const addError = vi.fn();

    (useToasts as Mock).mockReturnValue({ addError });
    const spyOnGetActionLicense = vi.spyOn(api, 'getActionLicense');
    spyOnGetActionLicense.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    renderHook(() => useGetActionLicense(), {
      wrapper: TestProviders,
    });
    await waitFor(() => expect(addError).toHaveBeenCalled());
  });
});
