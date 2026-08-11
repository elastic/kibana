/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useCanSyncCloseReasonToAlerts } from './use_can_sync_close_reason_to_alerts';
import { useCasesFeatures } from '../../common/use_cases_features';

jest.mock('../../common/use_cases_features');

const mockUseCasesFeatures = useCasesFeatures as jest.Mock;

describe('useCanSyncCloseReasonToAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when alert sync feature is disabled', () => {
    mockUseCasesFeatures.mockReturnValue({
      isSyncAlertsEnabled: false,
    });

    const { result } = renderHook(() =>
      useCanSyncCloseReasonToAlerts({
        totalAlerts: 5,
        syncAlertsEnabled: true,
      })
    );

    expect(result.current).toBe(false);
  });

  it.each([
    {
      description: 'there are no alerts',
      totalAlerts: 0,
      syncAlertsEnabled: true,
      expected: false,
    },
    {
      description: 'sync alerts is disabled',
      totalAlerts: 2,
      syncAlertsEnabled: false,
      expected: false,
    },
    {
      description: 'there are alerts and sync alerts is enabled',
      totalAlerts: 2,
      syncAlertsEnabled: true,
      expected: true,
    },
  ])(
    'returns $expected for single case when $description',
    ({ totalAlerts, syncAlertsEnabled, expected }) => {
      mockUseCasesFeatures.mockReturnValue({
        isSyncAlertsEnabled: true,
      });

      const { result } = renderHook(() =>
        useCanSyncCloseReasonToAlerts({
          totalAlerts,
          syncAlertsEnabled,
        })
      );

      expect(result.current).toBe(expected);
    }
  );

  it.each([
    {
      description: 'no selected case has alerts with sync enabled',
      selectedCases: [
        { totalAlerts: 0, settings: { syncAlerts: true } },
        { totalAlerts: 2, settings: { syncAlerts: false } },
      ],
      expected: false,
    },
    {
      description: 'at least one selected case has alerts with sync enabled',
      selectedCases: [
        { totalAlerts: 0, settings: { syncAlerts: true } },
        { totalAlerts: 2, settings: { syncAlerts: true } },
      ],
      expected: true,
    },
  ])('returns $expected for bulk actions when $description', ({ selectedCases, expected }) => {
    mockUseCasesFeatures.mockReturnValue({
      isSyncAlertsEnabled: true,
    });

    const { result } = renderHook(() =>
      useCanSyncCloseReasonToAlerts({
        selectedCases,
      })
    );

    expect(result.current).toBe(expected);
  });
});
