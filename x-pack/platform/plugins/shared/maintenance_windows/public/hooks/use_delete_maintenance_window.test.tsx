/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { waitFor, renderHook } from '@testing-library/react';

import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';
import { useDeleteMaintenanceWindow } from './use_delete_maintenance_window';

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
vi.mock('../services/delete', () => {
      const mocked = {
      deleteMaintenanceWindow: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const { deleteMaintenanceWindow } = (await vi.importMock('../services/delete'));

let appMockRenderer: AppMockRenderer;

describe('useDeleteMaintenanceWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    appMockRenderer = createAppMockRenderer();
  });

  it('should call onSuccess if api succeeds', async () => {
    const { result } = renderHook(() => useDeleteMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    result.current.mutate({ maintenanceWindowId: '123' });

    await waitFor(() => expect(mockAddSuccess).toHaveBeenCalledWith('Deleted maintenance window'));
  });

  it('should call onError if api fails', async () => {
    deleteMaintenanceWindow.mockRejectedValue('');

    const { result } = renderHook(() => useDeleteMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    result.current.mutate({ maintenanceWindowId: '123' });

    await waitFor(() =>
      expect(mockAddDanger).toHaveBeenCalledWith('Failed to delete maintenance window.')
    );
  });
});
