/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { waitFor, renderHook, act } from '@testing-library/react';

import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';
import { useCreateMaintenanceWindow } from './use_create_maintenance_window';

const mockAddDanger = vi.fn();
const mockAddSuccess = vi.fn();

vi.mock('../utils/kibana_react', async () => {
  const originalModule = (await vi.importActual('../utils/kibana_react'));
  return {
    ...originalModule,
    useKibana: () => {
      const { services } = originalModule.useKibana();
      return {
        services: {
          ...services,
          notifications: { toasts: { addSuccess: mockAddSuccess, addDanger: mockAddDanger } },
        },
      };
    },
  };
});
vi.mock('../services/create', () => {
      const mocked = {
      createMaintenanceWindow: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const { createMaintenanceWindow } = (await vi.importMock('../services/create'));

const maintenanceWindow = {
  title: 'test',
  duration: 1,
  rRule: {
    dtstart: '2023-03-23T19:16:21.293Z',
    tzid: 'America/New_York',
    freq: 3 as const,
    interval: 1,
    byweekday: ['TH'],
  },
};

let appMockRenderer: AppMockRenderer;

describe('useCreateMaintenanceWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    appMockRenderer = createAppMockRenderer();
    createMaintenanceWindow.mockResolvedValue(maintenanceWindow);
  });

  it('should call onSuccess if api succeeds', async () => {
    const { result } = renderHook(() => useCreateMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      await result.current.mutate(maintenanceWindow);
    });
    await waitFor(() =>
      expect(mockAddSuccess).toHaveBeenCalledWith("Created maintenance window 'test'")
    );
  });

  it('should call onError if api fails', async () => {
    createMaintenanceWindow.mockRejectedValue('');

    const { result } = renderHook(() => useCreateMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      await result.current.mutate(maintenanceWindow);
    });

    await waitFor(() =>
      expect(mockAddDanger).toHaveBeenCalledWith('Failed to create maintenance window')
    );
  });

  it('should show 400 error messages', async () => {
    createMaintenanceWindow.mockRejectedValue({
      body: { statusCode: 400, message: 'Bad request' },
    });

    const { result } = renderHook(() => useCreateMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    act(() => {
      result.current.mutate(maintenanceWindow);
    });

    await waitFor(() =>
      expect(mockAddDanger).toHaveBeenCalledWith('Failed to create maintenance window: Bad request')
    );
  });
});
