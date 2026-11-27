/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsUnitIdentifierSchema } from '@kbn/streams-schema';
import { allocateComponentId, withReservedComponents } from './unit_pipeline';
import type { Unit } from './unit_repository';

describe('allocateComponentId', () => {
  it('numbers from 1 by default and marks the id taken', () => {
    const taken = new Set(['add-fields-1']);
    expect(allocateComponentId('add_fields', taken)).toBe('add-fields-2');
    expect(taken.has('add-fields-2')).toBe(true);
  });

  it('tries the bare stem first, then numbers from 2', () => {
    const taken = new Set<string>();
    expect(allocateComponentId('p-otlp', taken, { bareFirst: true })).toBe('p-otlp');
    expect(allocateComponentId('p-otlp', taken, { bareFirst: true })).toBe('p-otlp-2');
  });

  it('keeps long ids within the identifier grammar', () => {
    const stem = `p-${'a'.repeat(300)}`;
    const taken = new Set<string>();
    const bare = allocateComponentId(stem, taken, { bareFirst: true });
    const numbered = allocateComponentId(stem, taken, { bareFirst: true });

    expect(bare).toHaveLength(256);
    expect(numbered).toHaveLength(256);
    expect(numbered.endsWith('-2')).toBe(true);
    expect(streamsUnitIdentifierSchema.safeParse(numbered).success).toBe(true);
  });

  it('falls back to a generic stem when nothing usable is left', () => {
    expect(allocateComponentId('___', new Set())).toBe('component-1');
  });
});

describe('withReservedComponents', () => {
  it('appends the components only the saved unit still has', () => {
    const saved: Unit = {
      unit: {
        sources: [
          { id: 'us-store', type: 'otlp', name: 'US Store', supported_telemetry: ['logs'] },
          { id: 'web', type: 'otlp', name: 'Web', supported_telemetry: ['logs'] },
        ],
        destinations: [
          { id: 'es-us-store', type: 'elasticsearch', supported_telemetry: ['logs'] },
          { id: 'es-web', type: 'elasticsearch', supported_telemetry: ['logs'] },
        ],
        processors: [{ id: 'add-fields-1', type: 'add_fields', supported_telemetry: ['logs'] }],
        pipelines: [
          {
            id: 'p-us-store',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['us-store'] },
              { name: 'processors', value: ['add-fields-1'] },
              { name: 'destinations', value: ['es-us-store'] },
            ],
          },
          {
            id: 'p-web',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['web'] },
              { name: 'destinations', value: ['es-web'] },
            ],
          },
        ],
      },
      ui_metadata: {},
    };
    const staged: Unit = {
      ...saved,
      unit: {
        sources: [{ ...saved.unit.sources[1], name: 'Web logs' }],
        destinations: [saved.unit.destinations[1]],
        pipelines: [saved.unit.pipelines[1]],
      },
    };

    expect(withReservedComponents(staged, saved).unit).toEqual({
      sources: [...staged.unit.sources, saved.unit.sources[0]],
      destinations: [...staged.unit.destinations, saved.unit.destinations[0]],
      processors: saved.unit.processors,
      pipelines: [...staged.unit.pipelines, saved.unit.pipelines[0]],
    });
  });
});
