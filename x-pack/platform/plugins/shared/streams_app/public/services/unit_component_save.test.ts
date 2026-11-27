/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnitDestination } from '@kbn/streams-schema';
import type { UnitSource } from '../components/streams_layout/sources/source_models';
import {
  applyComponentCreate,
  transplantProcessingDraft,
  isProcessingSlotSaved,
} from './unit_component_save';
import type { Unit } from './unit_repository';

const input: UnitSource = { id: 'in', type: 'otlp', supported_telemetry: ['logs'] };
const elasticsearch: UnitDestination = {
  id: 'es',
  type: 'elasticsearch',
  supported_telemetry: ['logs'],
};
const web: UnitSource = { id: 'web', type: 'otlp', supported_telemetry: ['logs'] };

const saved: Unit = {
  unit: {
    sources: [input],
    destinations: [elasticsearch],
    pipelines: [
      {
        id: 'p-in',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['in'] },
          { name: 'destinations', value: ['es'] },
        ],
      },
    ],
  },
  ui_metadata: {},
};

const staged: Unit = {
  unit: { sources: [], destinations: [], pipelines: [] },
  ui_metadata: { nodes: { in: { x: 100, y: 200 } } },
};

type Pipeline = Unit['unit']['pipelines'][number];
type Processor = NonNullable<Unit['unit']['processors']>[number];

const pipeline = saved.unit.pipelines[0];
const other = { ...pipeline, id: 'other' };
const unsavedOther: Pipeline = { ...other, config: [] };
const processor: Processor = {
  id: 'add-fields-1',
  type: 'add_fields',
  supported_telemetry: ['logs'],
  config: [],
};
const added = { ...processor, id: 'add-fields-2' };
const attach = (owner: Pipeline, id: string): Pipeline => ({
  ...owner,
  config: [...owner.config, { name: 'processors', value: [id] }],
});
const route = (destination: string, ids: string[] = []): Pipeline => ({
  ...pipeline,
  config: [{ name: 'routes', value: [{ destinations: [destination], processors: ids }] }],
});
const graph = (pipelines: Pipeline[], processors: Processor[] = []): Unit => ({
  ...saved,
  unit: { ...saved.unit, pipelines, processors },
});
const split = { ...pipeline, id: 'p-in-2' };
const shared = attach(other, processor.id);
const edited = { ...processor, name: 'Edited' };
const slot = { kind: 'pipeline', pipelineId: pipeline.id } as const;
const routeSlot = { kind: 'route', pipelineId: pipeline.id, routeIndex: 0 } as const;
const line = { sourceId: 'in', destinationId: 'es' };
const splitSlot = { ...slot, pipelineId: split.id };

describe('isProcessingSlotSaved', () => {
  it.each([
    ['changed rule', graph([route('es')]), graph([route('archive')]), { slot: routeSlot }, false],
    ['saved line', saved, saved, { slot: splitSlot, line }, true],
    [
      'changed shared owner',
      saved,
      graph([{ ...pipeline, supported_telemetry: ['metrics'] }]),
      { slot: splitSlot, line },
      false,
    ],
    ['reserved split id', graph([pipeline, split]), saved, { slot: splitSlot, line }, false],
  ] as const)('%s', (_name, persisted, stagedUnit, target, expected) => {
    expect(isProcessingSlotSaved(persisted, stagedUnit, target)).toBe(expected);
  });
});

describe('transplantProcessingDraft', () => {
  const withProcessor = attach(pipeline, processor.id);
  const withAdded = attach(pipeline, added.id);
  const clean = graph([pipeline, other]);
  const unrelated = graph([pipeline, unsavedOther]);
  const applied = graph([withProcessor, other], [processor]);
  const dirty = { ...pipeline, config: [] };
  it.each([
    [
      'same pipeline changed',
      clean,
      graph([dirty]),
      graph([attach(dirty, processor.id)], [processor]),
      undefined,
    ],
    [
      'changed rule',
      graph([route('es')]),
      graph([route('archive')]),
      graph([route('archive', [processor.id])], [processor]),
      undefined,
    ],
    [
      'saved rule',
      graph([route('es'), other]),
      graph([route('es'), unsavedOther]),
      graph([route('es', [processor.id]), unsavedOther], [processor]),
      graph([route('es', [processor.id]), other], [processor]),
    ],
    [
      'split saved line',
      clean,
      unrelated,
      graph([dirty, unsavedOther, attach(split, processor.id)], [processor]),
      graph([dirty, other, attach(split, processor.id)], [processor]),
    ],
    [
      'colliding pipeline',
      clean,
      graph([pipeline]),
      graph([pipeline, shared], [processor]),
      undefined,
    ],
    [
      'reserved processor',
      graph([pipeline, shared], [processor]),
      graph([pipeline]),
      graph([withAdded], [added]),
      graph([withAdded, shared], [processor, added]),
    ],
    [
      'rewired processor owner',
      graph([withProcessor], [processor]),
      graph([attach(dirty, processor.id)], [processor]),
      graph([attach(dirty, processor.id)], [edited]),
      'shared_processor',
    ],
    [
      'removed shared owner',
      graph([withProcessor, shared], [processor]),
      graph([withProcessor], [processor]),
      graph([withProcessor], [edited]),
      'shared_processor',
    ],
    [
      'unchanged shared owners',
      graph([withProcessor, shared], [processor]),
      graph([withProcessor, shared], [processor]),
      graph([withProcessor, shared], [edited]),
      graph([withProcessor, shared], [edited]),
    ],
    [
      'saved-only reference keeps processor',
      graph([withProcessor, shared], [processor]),
      graph([withProcessor], [processor]),
      graph([pipeline]),
      graph([pipeline, shared], [processor]),
    ],
    ['removed final reference', applied, applied, clean, clean],
    [
      'colliding processor',
      graph([pipeline], [processor]),
      graph([pipeline]),
      graph([withProcessor], [processor]),
      undefined,
    ],
    [
      'changed processor definition',
      graph([withProcessor], [edited]),
      graph([withProcessor], [processor]),
      graph([withProcessor], [{ ...processor, name: 'Another edit' }]),
      undefined,
    ],
  ] as const)('%s', (_name, persisted, stagedUnit, drafted, expected) => {
    expect(transplantProcessingDraft({ persisted, staged: stagedUnit, drafted })).toEqual(
      expected && typeof expected !== 'string'
        ? { ok: true, unit: expected }
        : { ok: false, reason: expected ?? 'unsaved_slot' }
    );
  });

  it('keeps saved metadata when a processing save removes a pipeline', () => {
    const moved = { ...saved, ui_metadata: staged.ui_metadata };
    const drafted = { ...moved, unit: { ...moved.unit, pipelines: [] } };
    expect(transplantProcessingDraft({ persisted: saved, staged: moved, drafted })).toEqual({
      ok: true,
      unit: { ...saved, unit: { ...saved.unit, pipelines: [] } },
    });
  });
});

it('appends the created source while preserving the rest of the saved unit', () => {
  const created = { ...staged, unit: { ...staged.unit, sources: [web] } };

  expect(applyComponentCreate(saved, created, { kind: 'source', ids: ['web'] })).toEqual({
    ...saved,
    unit: { ...saved.unit, sources: [input, web] },
  });
});
