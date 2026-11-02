/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useKibana } from '../lib/kibana';
import { useSpaceId } from './use_space_id';

jest.mock('../lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createMockServices = (spaceId: string) => ({
  services: {
    spaces: {
      getActiveSpace: jest.fn().mockResolvedValue({ id: spaceId }),
    },
  },
});

describe('useSpaceId', () => {
  test('returns undefined initially, then resolves to space id', async () => {
    useKibanaMock.mockReturnValue(
      createMockServices('default') as unknown as ReturnType<typeof useKibana>
    );

    const { result } = renderHook(() => useSpaceId());

    expect(result.current).toBeUndefined();

    await act(async () => {});

    expect(result.current).toBe('default');
  });

  test('returns the active space id for non-default spaces', async () => {
    useKibanaMock.mockReturnValue(
      createMockServices('my-space') as unknown as ReturnType<typeof useKibana>
    );

    const { result } = renderHook(() => useSpaceId());

    await act(async () => {});

    expect(result.current).toBe('my-space');
  });

  test('returns default when spaces plugin is not available', async () => {
    useKibanaMock.mockReturnValue({
      services: {},
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useSpaceId());

    await act(async () => {});

    expect(result.current).toBe('default');
  });

  test('falls back to default when getActiveSpace rejects', async () => {
    useKibanaMock.mockReturnValue({
      services: {
        spaces: {
          getActiveSpace: jest.fn().mockRejectedValue(new Error('space not found')),
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useSpaceId());

    await act(async () => {});

    expect(result.current).toBe('default');
  });
});
