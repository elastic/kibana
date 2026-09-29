/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { waitFor, renderHook } from '@testing-library/react';
import { useToasts, useKibana } from '../../common/lib/kibana';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';

import * as api from './api';
import { useGetCurrentUserProfile } from './use_get_current_user_profile';
import { TestProviders } from '../../common/mock';

vi.mock('../../common/lib/kibana');
vi.mock('./api');

const useKibanaMock = useKibana as Mock;

describe('useGetCurrentUserProfile', () => {
  const addSuccess = vi.fn();
  (useToasts as Mock).mockReturnValue({ addSuccess, addError: vi.fn() });

  beforeEach(() => {
    vi.clearAllMocks();

    useKibanaMock.mockReturnValue({
      services: { ...createStartServicesMock() },
    });
  });

  it('calls getCurrentUserProfile with correct arguments', async () => {
    const spyOnGetCurrentUserProfile = vi.spyOn(api, 'getCurrentUserProfile');

    renderHook(() => useGetCurrentUserProfile(), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(spyOnGetCurrentUserProfile).toHaveBeenCalled();
    });

    expect(spyOnGetCurrentUserProfile).toHaveBeenCalledWith({
      security: expect.anything(),
    });
  });

  it('shows a toast error message when an error occurs in the response', async () => {
    const spyOnGetCurrentUserProfile = vi.spyOn(api, 'getCurrentUserProfile');

    spyOnGetCurrentUserProfile.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = vi.fn();
    (useToasts as Mock).mockReturnValue({ addSuccess, addError });

    renderHook(() => useGetCurrentUserProfile(), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });

  it('does not show a toast error message when a 404 error is returned', async () => {
    const spyOnGetCurrentUserProfile = vi.spyOn(api, 'getCurrentUserProfile');

    spyOnGetCurrentUserProfile.mockImplementation(() => {
      throw new MockServerError('profile not found', 404);
    });

    const addError = vi.fn();
    (useToasts as Mock).mockReturnValue({ addSuccess, addError });

    renderHook(() => useGetCurrentUserProfile(), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(addError).not.toHaveBeenCalled();
    });
  });
});

class MockServerError extends Error {
  public readonly body: {
    statusCode: number;
  };

  constructor(message?: string, statusCode: number = 200) {
    super(message);
    this.name = this.constructor.name;
    this.body = { statusCode };
  }
}
