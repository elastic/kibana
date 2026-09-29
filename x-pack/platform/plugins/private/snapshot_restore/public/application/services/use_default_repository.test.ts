/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';

import { useDefaultRepository } from './use_default_repository';

const mockGetDefaultRepository = vi.fn();
const mockSetDefaultRepository = vi.fn();

vi.mock('./http/repository_requests', () => {
      const mocked = {
      getDefaultRepository: (...args: unknown[]) => mockGetDefaultRepository(...args),
      setDefaultRepository: (...args: unknown[]) => mockSetDefaultRepository(...args),
    };
      return { ...mocked, default: mocked };
    });

describe('useDefaultRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes empty string repositoryName to null', async () => {
    mockGetDefaultRepository.mockResolvedValue({
      data: { repositoryName: '' },
      error: null,
    });

    const { result } = renderHook(() => useDefaultRepository());

    await waitFor(() => {
      expect(result.current.defaultRepositoryStatus).toBe('loaded');
    });

    expect(result.current.defaultRepository).toBeNull();
  });

  it('keeps a non-empty repositoryName', async () => {
    mockGetDefaultRepository.mockResolvedValue({
      data: { repositoryName: 'repoA' },
      error: null,
    });

    const { result } = renderHook(() => useDefaultRepository());

    await waitFor(() => {
      expect(result.current.defaultRepositoryStatus).toBe('loaded');
    });

    expect(result.current.defaultRepository).toBe('repoA');
  });
});
