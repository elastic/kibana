/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from './unit_repository';
import {
  applyProcessingDraft,
  getProcessingNodeProcessors,
  getProcessingSlotTelemetry,
  getSharedProcessorIds,
  type DraftProcessor,
  type ProcessingDraftResult,
} from './unit_processing';
import { removeComponentFromPipelines } from './unit_connections';

const draft = (path: string, id?: string): DraftProcessor => ({
  ...(id ? { id } : {}),
  type: 'add_fields',
  supported_telemetry: ['logs'],
  config: [
    { name: 'fields', value: [{ action: 'upsert', location: 'attributes', path, value: 'x' }] },
  ],
});

const baseUnit = (
  pipelines: Unit['unit']['pipelines'],
  processors?: Unit['unit']['processors']
): Unit => ({
  unit: {
    sources: [{ id: 'src', type: 'otlp', supported_telemetry: ['logs', 'metrics'] }],
    destinations: [
      { id: 'es', type: 'elasticsearch', supported_telemetry: ['logs', 'traces'] },
      { id: 'other', type: 'elasticsearch', supported_telemetry: ['logs'] },
    ],
    ...(processors ? { processors } : {}),
    pipelines,
  },
  ui_metadata: {},
});

const directUnit = (): Unit =>
  baseUnit([
    {
      id: 'p-src',
      supported_telemetry: ['logs', 'metrics'],
      config: [
        { name: 'sources', value: ['src'] },
        { name: 'destinations', value: ['es'] },
      ],
    },
  ]);

const routedUnit = (): Unit =>
  baseUnit(
    [
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['src'] },
          {
            name: 'routes',
            value: [
              {
                when: 'log.severity_number >= 13',
                action: 'copy',
                processors: ['tag'],
                destinations: ['es'],
              },
              { destinations: ['other'] },
            ],
          },
        ],
      },
    ],
    [{ id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] }]
  );

const pipelineSlot = (pipelineId: string) => ({ kind: 'pipeline' as const, pipelineId });
const routeSlot = (pipelineId: string, routeIndex: number) => ({
  kind: 'route' as const,
  pipelineId,
  routeIndex,
});

const savedUnit = (result: ProcessingDraftResult): Unit => {
  if (!result.ok) {
    throw new Error(`Expected the draft to apply, got ${result.reason}`);
  }
  return result.unit;
};

describe('applyProcessingDraft', () => {
  it("creates a source pipeline's processors slot ahead of its destinations", () => {
    const result = applyProcessingDraft(directUnit(), pipelineSlot('p-src'), [
      draft('team'),
      draft('tier'),
    ]);
    expect(result).toMatchObject({ ok: true, processorIds: ['add-fields-1', 'add-fields-2'] });
    const next = savedUnit(result);
    expect(next.unit.pipelines).toEqual([
      {
        id: 'p-src',
        supported_telemetry: ['logs', 'metrics'],
        config: [
          { name: 'sources', value: ['src'] },
          { name: 'processors', value: ['add-fields-1', 'add-fields-2'] },
          { name: 'destinations', value: ['es'] },
        ],
      },
    ]);
    expect(next.unit.processors?.map(({ id }) => id)).toEqual(['add-fields-1', 'add-fields-2']);
  });

  it('creates a route slot and keeps the rest of the route', () => {
    const unit = baseUnit([
      {
        id: 'p-src',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['src'] },
          {
            name: 'routes',
            value: [
              { when: 'log.severity_number >= 13', action: 'copy', destinations: ['es'] },
              { destinations: ['other'] },
            ],
          },
        ],
      },
    ]);
    const next = savedUnit(applyProcessingDraft(unit, routeSlot('p-src', 0), [draft('team')]));
    expect(next.unit.pipelines[0].config[1]).toEqual({
      name: 'routes',
      value: [
        {
          when: 'log.severity_number >= 13',
          action: 'copy',
          destinations: ['es'],
          processors: ['add-fields-1'],
        },
        { destinations: ['other'] },
      ],
    });
  });

  it('writes the whole list to an existing slot, in the order given', () => {
    const next = savedUnit(
      applyProcessingDraft(routedUnit(), routeSlot('main', 0), [
        draft('first'),
        { ...draft('tagged'), id: 'tag' },
      ])
    );
    expect(getProcessingNodeProcessors(next, routeSlot('main', 0)).map(({ id }) => id)).toEqual([
      'add-fields-1',
      'tag',
    ]);
    expect(next.unit.pipelines).toHaveLength(1);
  });

  it('counts route indexes across routes entries', () => {
    const unit = baseUnit([
      {
        id: 'main',
        supported_telemetry: ['logs', 'traces'],
        config: [
          { name: 'sources', value: ['src'] },
          { name: 'routes', telemetry: ['logs'], value: [{ destinations: ['es'] }] },
          { name: 'routes', telemetry: ['traces'], value: [{ destinations: ['other'] }] },
        ],
      },
    ]);
    const next = savedUnit(applyProcessingDraft(unit, routeSlot('main', 1), [draft('team')]));
    expect(next.unit.pipelines[0].config.slice(1)).toEqual([
      { name: 'routes', telemetry: ['logs'], value: [{ destinations: ['es'] }] },
      {
        name: 'routes',
        telemetry: ['traces'],
        value: [{ destinations: ['other'], processors: ['add-fields-1'] }],
      },
    ]);
  });

  it('removes an emptied slot and the processors only it used', () => {
    const cleared = savedUnit(applyProcessingDraft(routedUnit(), routeSlot('main', 0), []));
    expect(cleared.unit.pipelines[0].config[1]).toEqual({
      name: 'routes',
      value: [
        { when: 'log.severity_number >= 13', action: 'copy', destinations: ['es'] },
        { destinations: ['other'] },
      ],
    });
    expect(cleared.unit.processors).toEqual([]);

    const unit = baseUnit(
      [
        {
          id: 'main',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['src'] },
            { name: 'processors', value: ['tag'] },
            { name: 'destinations', value: ['es'] },
          ],
        },
      ],
      [{ id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] }]
    );
    const next = savedUnit(applyProcessingDraft(unit, pipelineSlot('main'), []));
    expect(next.unit.pipelines[0].config).toEqual([
      { name: 'sources', value: ['src'] },
      { name: 'destinations', value: ['es'] },
    ]);
  });

  it('removes an unconnected processing node once its last processor is deleted', () => {
    const unit = baseUnit(
      [
        ...directUnit().unit.pipelines,
        {
          id: 'unhooked',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['src'] },
            { name: 'processors', value: ['tag'] },
          ],
        },
      ],
      [{ id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] }]
    );
    const next = savedUnit(applyProcessingDraft(unit, pipelineSlot('unhooked'), []));
    expect(next.unit.pipelines.map(({ id }) => id)).toEqual(['p-src']);
    expect(next.unit.processors).toEqual([]);
  });

  it('drops the delegation to an emptied child node and a parent left without outputs', () => {
    const unit = baseUnit(
      [
        ...directUnit().unit.pipelines,
        {
          id: 'parent',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['src'] },
            { name: 'routes', value: [{ pipelines: ['child'] }] },
          ],
        },
        {
          id: 'child',
          supported_telemetry: ['logs'],
          config: [{ name: 'processors', value: ['tag'] }],
        },
      ],
      [{ id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] }]
    );
    const next = savedUnit(applyProcessingDraft(unit, pipelineSlot('child'), []));
    expect(next.unit.pipelines.map(({ id }) => id)).toEqual(['p-src']);
    expect(next.unit.processors).toEqual([]);
  });

  it('keeps a processor another slot still references', () => {
    const unit = baseUnit(
      [
        {
          id: 'main',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['src'] },
            {
              name: 'routes',
              value: [
                { when: 'true', processors: ['shared'], destinations: ['es'] },
                { processors: ['shared'], destinations: ['other'] },
              ],
            },
          ],
        },
      ],
      [{ id: 'shared', type: 'add_fields', supported_telemetry: ['logs'] }]
    );
    const next = savedUnit(applyProcessingDraft(unit, routeSlot('main', 0), []));
    expect(next.unit.processors?.map(({ id }) => id)).toEqual(['shared']);
  });

  it('fails instead of saving when the slot is gone or read-only', () => {
    expect(applyProcessingDraft(directUnit(), pipelineSlot('missing'), [draft('team')])).toEqual({
      ok: false,
      reason: 'missing_slot',
    });
    expect(applyProcessingDraft(routedUnit(), routeSlot('main', 5), [draft('team')])).toEqual({
      ok: false,
      reason: 'missing_slot',
    });
    const perSignal = baseUnit([
      {
        id: 'main',
        supported_telemetry: ['logs', 'traces'],
        config: [
          { name: 'sources', value: ['src'] },
          { name: 'processors', telemetry: ['logs'], value: ['a'] },
          { name: 'destinations', value: ['es'] },
        ],
      },
    ]);
    expect(applyProcessingDraft(perSignal, pipelineSlot('main'), [draft('team')]).ok).toBe(false);
  });
});

describe('getProcessingSlotTelemetry', () => {
  it("uses the pipeline's signals for its own slot", () => {
    expect(getProcessingSlotTelemetry(directUnit(), pipelineSlot('p-src'))).toEqual([
      'logs',
      'metrics',
    ]);
  });

  it("narrows a route slot by the route's and its entry's telemetry", () => {
    const unit = baseUnit([
      {
        id: 'main',
        supported_telemetry: ['logs', 'metrics', 'traces'],
        config: [
          { name: 'sources', value: ['src'] },
          {
            name: 'routes',
            telemetry: ['logs', 'metrics'],
            value: [{ telemetry: ['metrics', 'traces'], destinations: ['es'] }],
          },
        ],
      },
    ]);
    expect(getProcessingSlotTelemetry(unit, routeSlot('main', 0))).toEqual(['metrics']);
  });
});

describe('getSharedProcessorIds', () => {
  const sharedUnit = () =>
    baseUnit(
      [
        {
          id: 'p-1',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['src'] },
            { name: 'processors', value: ['shared', 'own'] },
            { name: 'destinations', value: ['es'] },
          ],
        },
        {
          id: 'p-2',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['src'] },
            { name: 'routes', value: [{ processors: ['shared'], destinations: ['other'] }] },
          ],
        },
      ],
      [
        { id: 'shared', type: 'add_fields', supported_telemetry: ['logs'] },
        { id: 'own', type: 'add_fields', supported_telemetry: ['logs'] },
      ]
    );

  it('lists the processors of a slot that another slot also applies', () => {
    expect(getSharedProcessorIds(sharedUnit(), pipelineSlot('p-1'))).toEqual(new Set(['shared']));
    expect(getSharedProcessorIds(sharedUnit(), routeSlot('p-2', 0))).toEqual(new Set(['shared']));
  });

  it('lists nothing when only the slot itself applies its processors', () => {
    expect(getSharedProcessorIds(routedUnit(), routeSlot('main', 0))).toEqual(new Set());
    expect(getSharedProcessorIds(sharedUnit(), pipelineSlot('missing'))).toEqual(new Set());
  });
});

describe('removing components around processing', () => {
  const delegatedUnit = (): Unit =>
    baseUnit(
      [
        {
          id: 'main',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['src'] },
            {
              name: 'routes',
              value: [{ when: 'true', pipelines: ['enrich'] }, { destinations: ['other'] }],
            },
          ],
        },
        {
          id: 'enrich',
          supported_telemetry: ['logs'],
          config: [
            { name: 'processors', value: ['tag'] },
            { name: 'destinations', value: ['es'] },
          ],
        },
      ],
      [{ id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] }]
    );

  it('drops a child pipeline left without outputs, its delegation, and its processors', () => {
    const next = removeComponentFromPipelines(delegatedUnit(), 'es');
    expect(next.unit.pipelines).toEqual([
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['src'] },
          { name: 'routes', value: [{ destinations: ['other'] }] },
        ],
      },
    ]);
    expect(next.unit.processors).toEqual([]);
  });

  it('drops child pipelines no source reaches any more', () => {
    const next = removeComponentFromPipelines(delegatedUnit(), 'src');
    expect(next.unit.pipelines).toEqual([]);
    expect(next.unit.processors).toEqual([]);
  });

  it('leaves pipelines that were already unreachable before the deletion', () => {
    const unit = delegatedUnit();
    unit.unit.pipelines.push({
      id: 'draft',
      supported_telemetry: ['logs'],
      config: [{ name: 'destinations', value: ['es'] }],
    });
    const next = removeComponentFromPipelines(unit, 'other');
    expect(next.unit.pipelines.map(({ id }) => id)).toEqual(['main', 'enrich', 'draft']);
  });
});
