/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useBreadcrumbs } from './use_breadcrumbs';
import { MAINTENANCE_WINDOW_DEEP_LINK_IDS } from '../../common';
import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';

const mockSetBreadcrumbs = vi.fn();
const mockSetTitle = vi.fn();

vi.mock('../utils/kibana_react', async () => {
  const originalModule = (await vi.importActual('../utils/kibana_react'));
  return {
    ...originalModule,
    useKibana: () => {
      const { services } = originalModule.useKibana();
      return {
        services: {
          ...services,
          chrome: { setBreadcrumbs: mockSetBreadcrumbs, docTitle: { change: mockSetTitle } },
        },
      };
    },
  };
});

vi.mock('./use_navigation', async () => {
  const originalModule = (await vi.importActual('./use_navigation'));
  return {
    ...originalModule,
    useNavigation: vi.fn().mockReturnValue({
      getAppUrl: vi.fn((params?: { deepLinkId: string }) => params?.deepLinkId ?? '/test'),
    }),
  };
});

let appMockRenderer: AppMockRenderer;

describe('useBreadcrumbs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  test('set maintenance windows breadcrumbs', () => {
    renderHook(() => useBreadcrumbs(MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindows), {
      wrapper: appMockRenderer.AppWrapper,
    });
    expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
      { href: '/test', onClick: expect.any(Function), text: 'Stack Management' },
      { text: 'Maintenance Windows' },
    ]);
  });

  test('set create maintenance windows breadcrumbs', () => {
    renderHook(() => useBreadcrumbs(MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindowsCreate), {
      wrapper: appMockRenderer.AppWrapper,
    });
    expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
      { href: '/test', onClick: expect.any(Function), text: 'Stack Management' },
      {
        href: MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindows,
        onClick: expect.any(Function),
        text: 'Maintenance Windows',
      },
      { text: 'Create' },
    ]);
  });

  test('set edit maintenance windows breadcrumbs', () => {
    renderHook(() => useBreadcrumbs(MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindowsEdit), {
      wrapper: appMockRenderer.AppWrapper,
    });
    expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
      { href: '/test', onClick: expect.any(Function), text: 'Stack Management' },
      {
        href: MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindows,
        onClick: expect.any(Function),
        text: 'Maintenance Windows',
      },
      { text: 'Edit' },
    ]);
  });
});
