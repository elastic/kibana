/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { Unit } from '../../../../services/unit_repository';
import { useSyncStatsWithSavedUnit } from './use_sync_stats_with_saved_unit';

const mockNotifyUnitPersisted = jest.fn();
const mockSavedUnit: { current: Unit } = { current: undefined as unknown as Unit };

jest.mock('./state_management', () => ({
  useCanvasPersistedUnit: () => mockSavedUnit.current,
}));

jest.mock('../../../unit_stats/state_management/use_stats_manager', () => ({
  useStatsUnitPersisted: () => mockNotifyUnitPersisted,
}));

const unitWithDestinations = (...destinationIds: string[]): Unit => ({
  unit: {
    sources: [{ id: 'in', type: 'otlp', supported_telemetry: ['logs'] }],
    processors: [{ id: 'shout', type: 'add_fields', supported_telemetry: ['logs'] }],
    destinations: destinationIds.map((id) => ({
      id,
      type: 'debug',
      supported_telemetry: ['logs' as const],
    })),
    pipelines: [
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['in'] },
          { name: 'processors', value: ['shout'] },
          { name: 'destinations', value: destinationIds },
        ],
      },
    ],
  },
  ui_metadata: {},
});

beforeEach(() => {
  mockNotifyUnitPersisted.mockReset();
  mockSavedUnit.current = unitWithDestinations('es-prod', 'es-dev');
});

describe('useSyncStatsWithSavedUnit', () => {
  it('sends nothing on the first render', () => {
    renderHook(() => useSyncStatsWithSavedUnit());

    expect(mockNotifyUnitPersisted).not.toHaveBeenCalled();
  });

  it('sends the ids of every component of the unit when the saved unit changes', () => {
    const { rerender } = renderHook(() => useSyncStatsWithSavedUnit());

    mockSavedUnit.current = unitWithDestinations('es-prod');
    rerender();

    expect(mockNotifyUnitPersisted).toHaveBeenCalledTimes(1);
    expect(mockNotifyUnitPersisted).toHaveBeenCalledWith(['in', 'shout', 'es-prod', 'main']);
  });

  it('sends nothing when the same saved unit renders again', () => {
    const { rerender } = renderHook(() => useSyncStatsWithSavedUnit());

    rerender();
    rerender();

    expect(mockNotifyUnitPersisted).not.toHaveBeenCalled();
  });

  it('sends again for each later change of the saved unit', () => {
    const { rerender } = renderHook(() => useSyncStatsWithSavedUnit());

    mockSavedUnit.current = unitWithDestinations('es-prod');
    rerender();
    mockSavedUnit.current = unitWithDestinations('es-prod', 'es-new');
    rerender();

    expect(mockNotifyUnitPersisted).toHaveBeenCalledTimes(2);
    expect(mockNotifyUnitPersisted).toHaveBeenLastCalledWith([
      'in',
      'shout',
      'es-prod',
      'es-new',
      'main',
    ]);
  });
});
