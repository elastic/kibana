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
import { useFindMaintenanceWindows } from './use_find_maintenance_windows';

const mockAddDanger = vi.fn();
const mockedHttp = vi.fn();

vi.mock('../utils/kibana_react', async () => {
  const originalModule = (await vi.importActual('../utils/kibana_react'));
  return {
    ...originalModule,
    useKibana: () => {
      const { services } = originalModule.useKibana();
      return {
        services: {
          ...services,
          http: mockedHttp,
          notifications: { toasts: { addDanger: mockAddDanger } },
        },
      };
    },
  };
});
vi.mock('../services/find', () => {
      const mocked = {
      findMaintenanceWindows: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const { findMaintenanceWindows } = (await vi.importMock('../services/find'));

const defaultHookProps = { page: 1, perPage: 10, search: '', selectedStatus: [] };

let appMockRenderer: AppMockRenderer;

describe('useFindMaintenanceWindows', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    appMockRenderer = createAppMockRenderer();
  });

  it('should call findMaintenanceWindows with correct arguments on successful scenario', async () => {
    renderHook(() => useFindMaintenanceWindows({ ...defaultHookProps }), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await waitFor(() =>
      expect(findMaintenanceWindows).toHaveBeenCalledWith({ http: mockedHttp, ...defaultHookProps })
    );
  });

  it('should call onError if api fails', async () => {
    findMaintenanceWindows.mockRejectedValue('This is an error.');

    renderHook(() => useFindMaintenanceWindows({ ...defaultHookProps }), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await waitFor(() =>
      expect(mockAddDanger).toHaveBeenCalledWith('Unable to load maintenance windows.')
    );
  });

  it('should not try to find maintenance windows if not enabled', async () => {
    renderHook(() => useFindMaintenanceWindows({ enabled: false, ...defaultHookProps }), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await waitFor(() => expect(findMaintenanceWindows).toHaveBeenCalledTimes(0));
  });
});
