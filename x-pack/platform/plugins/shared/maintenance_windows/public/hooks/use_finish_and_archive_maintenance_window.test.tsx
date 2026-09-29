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
import { useFinishAndArchiveMaintenanceWindow } from './use_finish_and_archive_maintenance_window';

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
vi.mock('../services/finish', () => {
  const mocked = {
    finishMaintenanceWindow: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../services/archive', () => {
  const mocked = {
    archiveMaintenanceWindow: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const { finishMaintenanceWindow } = await vi.importMock('../services/finish');
const { archiveMaintenanceWindow } = await vi.importMock('../services/archive');

const maintenanceWindow = {
  title: 'test',
  duration: 1,
  rRule: {
    dtstart: '2023-03-23T19:16:21.293Z',
    tzid: 'America/New_York',
  },
};

let appMockRenderer: AppMockRenderer;

describe('useFinishAndArchiveMaintenanceWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    appMockRenderer = createAppMockRenderer();
    finishMaintenanceWindow.mockResolvedValue(maintenanceWindow);
    archiveMaintenanceWindow.mockResolvedValue(maintenanceWindow);
  });

  it('should call onSuccess if api succeeds', async () => {
    const { result } = renderHook(() => useFinishAndArchiveMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      await result.current.mutate('123');
    });
    await waitFor(() =>
      expect(mockAddSuccess).toHaveBeenCalledWith(
        "Cancelled and archived running maintenance window 'test'"
      )
    );
  });

  it('should call onError if finish api fails', async () => {
    finishMaintenanceWindow.mockRejectedValue('');

    const { result } = renderHook(() => useFinishAndArchiveMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      await result.current.mutate('123');
    });

    await waitFor(() =>
      expect(mockAddDanger).toHaveBeenCalledWith('Failed to cancel and archive maintenance window.')
    );
  });

  it('should call onError if archive api fails', async () => {
    archiveMaintenanceWindow.mockRejectedValue('');

    const { result } = renderHook(() => useFinishAndArchiveMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      await result.current.mutate('123');
    });

    await waitFor(() =>
      expect(mockAddDanger).toHaveBeenCalledWith('Failed to cancel and archive maintenance window.')
    );
  });
});
