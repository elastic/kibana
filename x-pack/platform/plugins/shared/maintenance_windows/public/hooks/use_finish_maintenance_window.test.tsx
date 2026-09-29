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
import { useFinishMaintenanceWindow } from './use_finish_maintenance_window';

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
vi.mock('../services/finish', () => {
      const mocked = {
      finishMaintenanceWindow: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const { finishMaintenanceWindow } = (await vi.importMock('../services/finish'));

const maintenanceWindow = {
  title: 'cancel',
  duration: 1,
  rRule: {
    dtstart: '2023-03-23T19:16:21.293Z',
    tzid: 'America/New_York',
  },
};

let appMockRenderer: AppMockRenderer;

describe('useFinishMaintenanceWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    appMockRenderer = createAppMockRenderer();
    finishMaintenanceWindow.mockResolvedValue(maintenanceWindow);
  });

  it('should call onSuccess if api succeeds', async () => {
    const { result } = renderHook(() => useFinishMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      await result.current.mutate('123');
    });
    await waitFor(() =>
      expect(mockAddSuccess).toHaveBeenCalledWith("Cancelled running maintenance window 'cancel'")
    );
  });

  it('should call onError if api fails', async () => {
    finishMaintenanceWindow.mockRejectedValue('');

    const { result } = renderHook(() => useFinishMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      await result.current.mutate('123');
    });

    await waitFor(() =>
      expect(mockAddDanger).toHaveBeenCalledWith('Failed to cancel maintenance window.')
    );
  });
});
