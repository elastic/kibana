/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook, act } from '@testing-library/react';

import { AppMockRenderer, createAppMockRenderer } from '../lib/test_utils';
import { useDeleteMaintenanceWindow } from './use_delete_maintenance_window';

const mockAddDanger = jest.fn();
const mockAddSuccess = jest.fn();

jest.mock('../utils/kibana_react', () => {
  const originalModule = jest.requireActual('../utils/kibana_react');
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
jest.mock('../services/maintenance_windows_api/delete', () => ({
  deleteMaintenanceWindow: jest.fn(),
}));

const { deleteMaintenanceWindow } = jest.requireMock('../services/maintenance_windows_api/delete');

// const maintenanceWindow = {
//   title: 'delete',
//   duration: 1,
//   rRule: {
//     dtstart: '2023-03-23T19:16:21.293Z',
//     tzid: 'America/New_York',
//   },
// };

let appMockRenderer: AppMockRenderer;

describe('useArchiveMaintenanceWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    appMockRenderer = createAppMockRenderer();
  });

  it('should call onSuccess if api succeeds', async () => {
    const { result } = renderHook(() => useDeleteMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      result.current.mutate({ maintenanceWindowId: '123' });
    });
    await waitFor(() => expect(mockAddSuccess).toBeCalledWith('Deleted maintenance window'));
  });

  it('should call onError if api fails', async () => {
    deleteMaintenanceWindow.mockRejectedValue('');

    const { result } = renderHook(() => useDeleteMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      result.current.mutate({ maintenanceWindowId: '123' });
    });

    await waitFor(() =>
      expect(mockAddDanger).toBeCalledWith('Failed to delete maintenance window.')
    );
  });
});
