/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';

import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';
import { useGetMaintenanceWindow } from './use_get_maintenance_window';

const mockAddDanger = jest.fn();

jest.mock('../utils/kibana_react', () => {
  const originalModule = jest.requireActual('../utils/kibana_react');
  return {
    ...originalModule,
    useKibana: () => {
      const { services } = originalModule.useKibana();
      return {
        services: {
          ...services,
          notifications: { toasts: { addDanger: mockAddDanger } },
        },
      };
    },
  };
});
jest.mock('../services/get', () => ({
  getMaintenanceWindow: jest.fn(),
}));
jest.mock('../helpers/convert_from_maintenance_window_to_form', () => ({
  convertFromMaintenanceWindowToForm: jest.fn(),
}));

const { getMaintenanceWindow } = jest.requireMock('../services/get');

let appMockRenderer: AppMockRenderer;

describe('useGetMaintenanceWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    appMockRenderer = createAppMockRenderer();
  });

  it('should call onError if api fails', async () => {
    getMaintenanceWindow.mockRejectedValue('');

    renderHook(() => useGetMaintenanceWindow('testId'), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await waitFor(() => expect(mockAddDanger).toBeCalledWith('Unable to get maintenance window.'));
  });

  it('should return an object where showMultipleSolutionsWarning is false when disabled scoped query filter', async () => {
    getMaintenanceWindow.mockResolvedValue({
      categoryIds: ['observability', 'management', 'securitySolution'],
      scopedQuery: undefined,
    });

    const { result } = renderHook(() => useGetMaintenanceWindow('testId'), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        showMultipleSolutionsWarning: false,
        isError: false,
        isLoading: false,
        maintenanceWindow: undefined,
      })
    );
  });

  it('should return object with a hasOldChosenSolutions is true when disabled scoped query filter', async () => {
    getMaintenanceWindow.mockResolvedValue({
      categoryIds: ['observability', 'management'],
      scopedQuery: undefined,
    });

    const { result } = renderHook(() => useGetMaintenanceWindow('testId'), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        showMultipleSolutionsWarning: true,
        isError: false,
        isLoading: false,
        maintenanceWindow: undefined,
      })
    );
  });

  it('should return an object where a hasOldChosenSolutions is false if scopedQuery is defined', async () => {
    getMaintenanceWindow.mockResolvedValue({
      categoryIds: ['observability'],
      scopedQuery: { filter: 'filter' },
    });

    const { result } = renderHook(() => useGetMaintenanceWindow('testId'), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        showMultipleSolutionsWarning: false,
        isError: false,
        isLoading: false,
        maintenanceWindow: undefined,
      })
    );
  });
});
