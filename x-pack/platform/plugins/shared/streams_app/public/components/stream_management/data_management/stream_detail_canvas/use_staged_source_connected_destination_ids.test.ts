/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { Unit } from '../../../../services/unit_repository';
import { useStagedSourceConnectedDestinationIds } from './use_staged_source_connected_destination_ids';

const unitSendingTo = (destinationId: string): Unit => ({
  unit: {
    sources: [{ id: 'in', type: 'otlp', supported_telemetry: ['logs'] }],
    destinations: [
      { id: 'es-old', type: 'debug', supported_telemetry: ['logs'] },
      { id: 'es-new', type: 'debug', supported_telemetry: ['logs'] },
    ],
    pipelines: [
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['in'] },
          { name: 'destinations', value: [destinationId] },
        ],
      },
    ],
  },
  ui_metadata: {},
});

const mockSavedUnit = unitSendingTo('es-old');
const mockStagedUnit = unitSendingTo('es-new');

jest.mock('./state_management', () => ({
  useCanvasPersistedUnit: () => mockSavedUnit,
  useCanvasUnitDefinition: () => mockStagedUnit,
}));

describe('useStagedSourceConnectedDestinationIds', () => {
  it('follows connections changed on the Map before they are saved', () => {
    const { result } = renderHook(() => useStagedSourceConnectedDestinationIds());

    expect([...result.current]).toEqual(['es-new']);
  });
});
