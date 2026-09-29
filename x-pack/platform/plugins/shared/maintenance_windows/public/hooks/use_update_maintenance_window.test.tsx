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
import { useUpdateMaintenanceWindow } from './use_update_maintenance_window';

const mockAddDanger = vi.fn();
const mockAddSuccess = vi.fn();

vi.mock('../utils/kibana_react', async () => {
  const originalModule = await vi.importActual('../utils/kibana_react');
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
vi.mock('../services/update', () => {
  const mocked = {
    updateMaintenanceWindow: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const { updateMaintenanceWindow } = await vi.importMock('../services/update');

const updateParams = {
  title: 'updated',
  duration: 1,
  rRule: {
    dtstart: '2023-03-23T19:16:21.293Z',
    tzid: 'America/New_York',
  },
};

let appMockRenderer: AppMockRenderer;

describe('useUpdateMaintenanceWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    appMockRenderer = createAppMockRenderer();
    updateMaintenanceWindow.mockResolvedValue(updateParams);
  });

  it('should call onSuccess if api succeeds', async () => {
    const { result } = renderHook(() => useUpdateMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      await result.current.mutate({ maintenanceWindowId: '123', updateParams });
    });
    await waitFor(() =>
      expect(mockAddSuccess).toHaveBeenCalledWith("Updated maintenance window 'updated'")
    );
  });

  it('should call onError if api fails', async () => {
    updateMaintenanceWindow.mockRejectedValue('');

    const { result } = renderHook(() => useUpdateMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      await result.current.mutate({ maintenanceWindowId: '123', updateParams });
    });

    await waitFor(() =>
      expect(mockAddDanger).toHaveBeenCalledWith('Failed to update maintenance window.')
    );
  });
});
