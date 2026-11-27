/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMemoryHistory } from 'history';
import type { TimeState } from '@kbn/es-query';
import { EMPTY } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import {
  createKbnUrlStateStorage,
  type IKbnUrlStateStorage,
} from '@kbn/kibana-utils-plugin/public';
import { createStreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { STREAMS_DEFAULT_UNIT_ID } from '@kbn/streams-plugin/common';
import { createActor, createMachine, waitFor, type Actor, type SnapshotFrom } from 'xstate';
import {
  canConnectLine,
  connectLine,
  disconnectLine,
  withPublishedTelemetry,
} from '../../../../../services/unit_connections';
import type { ProcessingNodeRef } from '../../../../../services/unit_graph';
import { createDefaultUnit, type Unit } from '../../../../../services/unit_repository';
import type { UnitDestination } from '@kbn/streams-schema';
import {
  getUnitDestinations,
  withUnitDestinations,
} from '../../../../streams_layout/destinations/destination_models';
import { EMPTY_DESTINATION_CREATION_FORM } from '../../../../streams_layout/destinations/types';
import { canvasStateMachine, createCanvasMachineImplementations } from './canvas_state_machine';
import type { destinationsStateMachine } from '../../../../streams_layout/destinations/state_machines/destinations_state_machine';
import type { DestinationApiKeyGenerationDeps } from '../../../../streams_layout/destinations/destination_api_keys';
import type { sourcesStateMachine } from '../../../../streams_layout/sources/state_machines/sources_state_machine';
import { defaultCanvasUrlState } from './types';

const timeState: TimeState = {
  timeRange: { from: 'now-15m', to: 'now' },
  asAbsoluteTimeRange: {
    from: '2026-01-01T00:00:00.000Z',
    to: '2026-01-01T00:15:00.000Z',
    mode: 'absolute',
  },
  start: Date.parse('2026-01-01T00:00:00.000Z'),
  end: Date.parse('2026-01-01T00:15:00.000Z'),
};

const loadedUnit = (): Unit => ({
  unit: {
    sources: [{ id: 'src', type: 'otlp', supported_telemetry: ['logs'] }],
    destinations: [{ id: 'es', type: 'elasticsearch', supported_telemetry: ['logs'] }],
    pipelines: [
      {
        id: 'p-src',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['src'] },
          { name: 'destinations', value: ['es'] },
        ],
      },
    ],
  },
  ui_metadata: {},
});

const sourceSlot: ProcessingNodeRef = { kind: 'pipeline', pipelineId: 'p-src' };

const processor = {
  type: 'add_fields',
  supported_telemetry: ['logs' as const],
  config: [
    {
      name: 'fields',
      value: [{ action: 'upsert', location: 'attributes', path: 'team', value: 'x' }],
    },
  ],
};

const startCanvas = (
  persistUnitDefinition: (unit: Unit) => Promise<Unit>,
  unit: Unit = loadedUnit(),
  history = { hold: jest.fn(), reset: jest.fn(), discard: jest.fn() }
) => {
  const core = coreMock.createStart();
  // The destinations machine resolves each destination's indices when it loads.
  core.http.fetch.mockResolvedValue({ destinations: {} });
  const machine = canvasStateMachine.provide(
    createCanvasMachineImplementations({
      core,
      urlStateStorageContainer: createKbnUrlStateStorage({
        history: createMemoryHistory(),
        useHash: false,
      }),
      apiKeyGenerationDeps: {
        streamsRepositoryClient: createStreamsRepositoryClient(core),
        unitId: STREAMS_DEFAULT_UNIT_ID,
      },
      timeState,
      timeState$: EMPTY,
      loadSourceEnvironment: async () => ({ managedInputBaseUrl: 'https://inputs.example.com' }),
      loadUnitDefinition: async () => unit,
      persistUnitDefinition,
      createHistoryRef: { current: history },
    })
  );
  const canvas = createActor(machine, { input: defaultCanvasUrlState }).start();
  return { canvas, http: core.http, toasts: core.notifications.toasts };
};

type Canvas = ReturnType<typeof startCanvas>['canvas'];

const waitForUnitReady = (canvas: Canvas) =>
  waitFor(canvas, (snapshot) => snapshot.matches({ ready: { unit: 'ready' } }));

const openFlyout = (canvas: Canvas, slot: ProcessingNodeRef = sourceSlot) => {
  canvas.send({ type: 'processing.open', slot });
  const flyout = canvas.getSnapshot().context.processingFlyout;
  if (!flyout) {
    throw new Error('Expected the processing flyout to open');
  }
  return flyout;
};

const stageProcessorAndSave = (canvas: Canvas, slot: ProcessingNodeRef = sourceSlot) => {
  const flyout = openFlyout(canvas, slot);
  flyout.ref.send({ type: 'step.create' });
  flyout.ref.send({ type: 'step.commit', processor });
  flyout.ref.send({ type: 'flyout.save' });
  return flyout;
};

describe('canvas processing flyout', () => {
  it('preserves a shared, untouched processor when adding a separate processor', async () => {
    const saved = loadedUnit();
    const shared = { ...processor, id: 'shared', description: '' };
    saved.unit.processors = [shared];
    const [pipeline] = saved.unit.pipelines;
    pipeline.config.splice(1, 0, { name: 'processors', value: [shared.id] });
    saved.unit.sources.push({ id: 'other', type: 'otlp', supported_telemetry: ['logs'] });
    saved.unit.pipelines.push({
      ...pipeline,
      id: 'other-pipeline',
      config: [{ name: 'sources', value: ['other'] }, ...pipeline.config.slice(1)],
    });
    const staged = disconnectLine(
      saved,
      { kind: 'processing', ref: { kind: 'pipeline', pipelineId: 'other-pipeline' } },
      { kind: 'destination', id: 'es' }
    );
    const persist = jest.fn(async (unit: Unit) => unit);
    const { canvas } = startCanvas(persist, saved);
    await waitForUnitReady(canvas);
    canvas.send({ type: 'unit.stage', unitDefinition: staged });
    stageProcessorAndSave(canvas);
    await waitForUnitReady(canvas);

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0][0].unit.processors).toStrictEqual([
      shared,
      expect.objectContaining({ id: 'add-fields-1' }),
    ]);
    expect(canvas.getSnapshot().context.nextUnit.unit.pipelines[1]).toEqual(
      staged.unit.pipelines[1]
    );
  });

  it('keeps a clean map clean after adding and removing the first draft processor', async () => {
    const persist = jest.fn(async (unit: Unit) => unit);
    const { canvas } = startCanvas(persist);
    await waitForUnitReady(canvas);
    const flyout = openFlyout(canvas);
    flyout.ref.send({ type: 'step.create' });
    flyout.ref.send({ type: 'step.commit', processor });
    flyout.ref.send({ type: 'step.delete', key: 'step-0' });
    flyout.ref.send({ type: 'flyout.save' });
    await waitFor(canvas, (snapshot) => snapshot.context.processingFlyout === undefined);

    const { unit, nextUnit } = canvas.getSnapshot().context;
    expect(nextUnit).toBe(unit);
    expect(unit.unit).not.toHaveProperty('processors');
  });

  it('rejects processing on a pipeline with unsaved changes', async () => {
    const persist = jest.fn(async (unit: Unit) => unit);
    const { canvas } = startCanvas(persist);
    await waitForUnitReady(canvas);
    const staged = loadedUnit();
    staged.unit.pipelines[0].config.pop();
    canvas.send({ type: 'unit.stage', unitDefinition: staged });

    const flyout = stageProcessorAndSave(canvas);
    expect(flyout.ref.getSnapshot().context.saveError).toBe(
      "This processing is on a connection you haven't saved yet. Save the map, then apply the processing."
    );
    expect(persist).not.toHaveBeenCalled();
    expect(canvas.getSnapshot().context.nextUnit).toEqual(staged);
  });

  it('keeps unrelated unhooked wiring staged after a processing save', async () => {
    const saved = loadedUnit();
    const persist = jest.fn(async (unit: Unit) => unit);
    const { canvas } = startCanvas(persist, saved);
    await waitForUnitReady(canvas);
    const staged = loadedUnit();
    const other = {
      ...staged.unit.pipelines[0],
      id: 'other',
      config: [],
    };
    staged.unit.pipelines.push(other);
    canvas.send({ type: 'unit.stage', unitDefinition: staged });
    stageProcessorAndSave(canvas);
    await waitFor(canvas, (snapshot) => snapshot.context.processingFlyout === undefined);
    const { unit, nextUnit } = canvas.getSnapshot().context;
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0][0]).toEqual(unit);
    expect(unit.unit.pipelines.map(({ id }) => id)).toEqual(['p-src']);
    expect(unit.unit.processors).toEqual([expect.objectContaining({ id: 'add-fields-1' })]);
    expect(nextUnit.unit.pipelines).toEqual([...unit.unit.pipelines, other]);
  });

  it('saves the staged map after processing persistence fails', async () => {
    const persist = jest.fn(async (unit: Unit) => unit).mockRejectedValueOnce(new Error('boom'));
    const { canvas } = startCanvas(persist);
    await waitForUnitReady(canvas);
    const staged = loadedUnit();
    staged.unit.sources[0].name = 'Renamed';
    canvas.send({ type: 'unit.stage', unitDefinition: staged });
    stageProcessorAndSave(canvas);
    await waitFor(canvas, (snapshot) => snapshot.matches({ ready: { unit: 'saveFailed' } }));
    const { nextUnit, savingUnit, savingStagedUnit, stagedRollbackUnit } =
      canvas.getSnapshot().context;
    expect(nextUnit).toEqual(staged);
    expect([savingUnit, savingStagedUnit, stagedRollbackUnit]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    canvas.send({ type: 'unit.save' });
    await waitForUnitReady(canvas);
    expect(persist.mock.calls.at(-1)?.[0]).toEqual(withPublishedTelemetry(staged));
  });

  it("saves new processing into the source pipeline's own slot", async () => {
    const persisted: Unit[] = [];
    const { canvas, toasts } = startCanvas(async (unit) => {
      persisted.push(unit);
      return unit;
    });
    await waitForUnitReady(canvas);

    const flyout = stageProcessorAndSave(canvas);
    expect(flyout.slot).toEqual(sourceSlot);

    await waitFor(canvas, (snapshot) => snapshot.context.processingFlyout === undefined);
    await waitForUnitReady(canvas);

    expect(persisted).toHaveLength(1);
    expect(persisted[0].unit.pipelines).toEqual([
      {
        id: 'p-src',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['src'] },
          { name: 'processors', value: ['add-fields-1'] },
          { name: 'destinations', value: ['es'] },
        ],
      },
    ]);
    expect(canvas.getSnapshot().context.unit).toBe(persisted[0]);
    expect(toasts.addSuccess).toHaveBeenCalledWith({ title: 'Processing saved and applied' });
  });

  it('starts creating at the requested end of the list when opened from a line', async () => {
    const { canvas } = startCanvas(async (unit) => unit);
    await waitForUnitReady(canvas);

    canvas.send({ type: 'processing.open', slot: sourceSlot, position: 'start' });
    const flyout = canvas.getSnapshot().context.processingFlyout;
    expect(flyout?.ref.getSnapshot().value).toBe('editing');
    expect(flyout?.ref.getSnapshot().context.createPosition).toBe('start');
  });

  it('rejects a save whose slot no longer exists without persisting', async () => {
    const persisted: Unit[] = [];
    const { canvas } = startCanvas(async (unit) => {
      persisted.push(unit);
      return unit;
    });
    await waitForUnitReady(canvas);

    const flyout = openFlyout(canvas);
    flyout.ref.send({ type: 'step.create' });
    flyout.ref.send({ type: 'step.commit', processor });
    const staged = canvas.getSnapshot().context.nextUnit;
    canvas.send({
      type: 'unit.stage',
      unitDefinition: {
        ...staged,
        unit: {
          ...staged.unit,
          pipelines: staged.unit.pipelines.map((pipeline) => ({ ...pipeline, id: 'p-renamed' })),
        },
      },
    });
    flyout.ref.send({ type: 'flyout.save' });

    expect(persisted).toEqual([]);
    expect(flyout.ref.getSnapshot().value).toBe('idle');
    expect(flyout.ref.getSnapshot().context.saveError).toBe(
      'This processing no longer exists in the configuration. Close the flyout and try again.'
    );
  });

  it('restores the staged unit and keeps the flyout open when the save fails', async () => {
    const { canvas } = startCanvas(async () => {
      throw new Error('Distributor rejected the unit');
    });
    await waitForUnitReady(canvas);
    const staged = canvas.getSnapshot().context.nextUnit;

    const flyout = stageProcessorAndSave(canvas);

    await waitFor(canvas, (snapshot) => snapshot.matches({ ready: { unit: 'saveFailed' } }));
    expect(canvas.getSnapshot().context.nextUnit).toBe(staged);
    expect(flyout.ref.getSnapshot().value).toBe('idle');
    expect(flyout.ref.getSnapshot().context.saveError).toBe('Distributor rejected the unit');
  });

  it('restores the node positions from before the save when the save fails', async () => {
    const { canvas } = startCanvas(async () => {
      throw new Error('Distributor rejected the unit');
    });
    await waitForUnitReady(canvas);
    canvas.send({ type: 'nodes.positions.change', positions: { es: { x: 10, y: 20 } } });
    const positionsBeforeSave = canvas.getSnapshot().context.nodePositions;

    stageProcessorAndSave(canvas);
    // The canvas tidies the flow the new processing node joined while it saves.
    canvas.send({ type: 'nodes.positions.change', positions: { es: { x: 370, y: 20 } } });

    await waitFor(canvas, (snapshot) => snapshot.matches({ ready: { unit: 'saveFailed' } }));
    expect(canvas.getSnapshot().context.nodePositions).toBe(positionsBeforeSave);
  });

  it('keeps the node positions written during the save when it succeeds', async () => {
    const { canvas } = startCanvas(async (unit) => unit);
    await waitForUnitReady(canvas);

    stageProcessorAndSave(canvas);
    canvas.send({ type: 'nodes.positions.change', positions: { es: { x: 370, y: 20 } } });

    await waitFor(canvas, (snapshot) => snapshot.context.processingFlyout === undefined);
    await waitForUnitReady(canvas);
    expect(canvas.getSnapshot().context.nodePositions).toEqual({ es: { x: 370, y: 20 } });
  });

  it('keeps shared source wiring after adding and removing the first draft processor', async () => {
    const saved = loadedUnit();
    saved.unit.destinations.push({ id: 'debug', type: 'debug', supported_telemetry: ['logs'] });
    saved.unit.pipelines[0].config[1] = { name: 'destinations', value: ['es', 'debug'] };
    const persist = jest.fn(async (unit: Unit) => unit);
    const { canvas } = startCanvas(persist, saved);
    await waitForUnitReady(canvas);

    canvas.send({ type: 'processing.open', line: { sourceId: 'src', destinationId: 'debug' } });
    const flyout = canvas.getSnapshot().context.processingFlyout;
    expect(flyout).toBeDefined();
    flyout?.ref.send({ type: 'step.create' });
    flyout?.ref.send({ type: 'step.commit', processor });
    flyout?.ref.send({ type: 'step.delete', key: 'step-0' });
    flyout?.ref.send({ type: 'flyout.save' });
    await waitFor(canvas, (snapshot) => snapshot.context.processingFlyout === undefined);

    expect(canvas.getSnapshot().context.unit.unit).toEqual(saved.unit);
  });

  it('moves a shared source line onto its own pipeline only when its processing saves', async () => {
    const fanOut = loadedUnit();
    fanOut.unit.destinations.push({ id: 'debug', type: 'debug', supported_telemetry: ['logs'] });
    fanOut.unit.pipelines[0].config = [
      { name: 'sources', value: ['src'] },
      { name: 'destinations', value: ['es', 'debug'] },
    ];
    const persisted: Unit[] = [];
    const { canvas } = startCanvas(async (unit) => {
      persisted.push(unit);
      return unit;
    }, fanOut);
    await waitForUnitReady(canvas);
    const staged = canvas.getSnapshot().context.nextUnit;

    canvas.send({ type: 'processing.open', line: { sourceId: 'src', destinationId: 'debug' } });
    const flyout = canvas.getSnapshot().context.processingFlyout;
    expect(flyout?.slot).toEqual({ kind: 'pipeline', pipelineId: 'p-src-2' });
    expect(canvas.getSnapshot().context.nextUnit).toBe(staged);

    flyout?.ref.send({ type: 'step.create' });
    flyout?.ref.send({ type: 'step.commit', processor });
    flyout?.ref.send({ type: 'flyout.save' });
    await waitFor(canvas, (snapshot) => snapshot.context.processingFlyout === undefined);

    expect(persisted).toHaveLength(1);
    expect(persisted[0].unit.pipelines).toEqual([
      {
        id: 'p-src',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['src'] },
          { name: 'destinations', value: ['es'] },
        ],
      },
      {
        id: 'p-src-2',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['src'] },
          { name: 'processors', value: ['add-fields-1'] },
          { name: 'destinations', value: ['debug'] },
        ],
      },
    ]);
  });

  it('closes the flyout without touching the unit', async () => {
    const { canvas } = startCanvas(async (unit) => unit);
    await waitForUnitReady(canvas);
    const staged = canvas.getSnapshot().context.nextUnit;

    openFlyout(canvas);
    canvas.send({ type: 'processing.close' });

    expect(canvas.getSnapshot().context.processingFlyout).toBeUndefined();
    expect(canvas.getSnapshot().context.nextUnit).toBe(staged);
  });
});

describe('canvas node positions', () => {
  it('merges changed positions and replaces them all on restore', async () => {
    const { canvas } = startCanvas(async (unit) => unit);
    await waitForUnitReady(canvas);

    canvas.send({ type: 'nodes.positions.change', positions: { src: { x: 1, y: 2 } } });
    canvas.send({ type: 'nodes.positions.change', positions: { es: { x: 3, y: 4 } } });
    expect(canvas.getSnapshot().context.nodePositions).toEqual({
      src: { x: 1, y: 2 },
      es: { x: 3, y: 4 },
    });

    canvas.send({ type: 'nodes.positions.restore', positions: { src: { x: 1, y: 2 } } });
    expect(canvas.getSnapshot().context.nodePositions).toEqual({ src: { x: 1, y: 2 } });
  });
});

describe('canvas routing flyout', () => {
  const line = { origin: { kind: 'source' as const, id: 'src' }, destinationId: 'es' };

  const openRouting = (canvas: Canvas) => {
    canvas.send({ type: 'routing.open', target: { kind: 'line', line } });
    const ref = canvas.getSnapshot().context.routingFlyout?.ref;
    if (!ref) {
      throw new Error('Expected the routing flyout to open');
    }
    return ref;
  };

  it('stages a new routing node on the line without persisting it', async () => {
    const persist = jest.fn(async (unit: Unit) => unit);
    const { canvas } = startCanvas(persist);
    await waitForUnitReady(canvas);
    const persisted = canvas.getSnapshot().context.unit;

    const ref = openRouting(canvas);
    ref.send({ type: 'rule.add' });
    ref.send({
      type: 'rule.update',
      key: 'rule-1',
      changes: {
        when: 'resource.attributes["service.name"] == "x"',
        action: 'copy',
      },
    });
    ref.send({ type: 'flyout.save' });

    const { context } = canvas.getSnapshot();
    expect(context.routingFlyout).toBeUndefined();
    expect(context.unit).toBe(persisted);
    // The canvas tidies the flow of a routing node it sees staged here.
    expect(context.routingStagedUnit).toBe(context.nextUnit);
    expect(context.nextUnit.unit.pipelines[0].config).toEqual([
      { name: 'sources', value: ['src'] },
      {
        name: 'routes',
        value: [
          { when: 'resource.attributes["service.name"] == "x"', action: 'copy', destinations: [] },
          { destinations: ['es'] },
        ],
      },
    ]);
    expect(canvas.getSnapshot().matches({ ready: { unit: 'ready' } })).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('edits the rules of an existing routing node', async () => {
    const { canvas } = startCanvas(async (unit) => unit);
    await waitForUnitReady(canvas);
    const ref = openRouting(canvas);
    ref.send({ type: 'flyout.save' });

    canvas.send({ type: 'routing.open', target: { kind: 'pipeline', pipelineId: 'p-src' } });
    const editRef = canvas.getSnapshot().context.routingFlyout?.ref;
    expect(editRef?.getSnapshot().context.target).toEqual({
      kind: 'pipeline',
      pipelineId: 'p-src',
    });
    editRef?.send({ type: 'rule.update', key: 'rule-0', changes: { action: 'copy' } });
    editRef?.send({ type: 'flyout.save' });

    expect(canvas.getSnapshot().context.nextUnit.unit.pipelines[0].config).toEqual([
      { name: 'sources', value: ['src'] },
      { name: 'routes', value: [{ action: 'copy', destinations: ['es'] }] },
    ]);
  });

  it('opens the rules read-only for a user who cannot manage the stream, staging nothing', async () => {
    const { canvas } = startCanvas(async (unit) => unit);
    await waitForUnitReady(canvas);
    const ref = openRouting(canvas);
    ref.send({ type: 'flyout.save' });
    const staged = canvas.getSnapshot().context.nextUnit;

    canvas.send({
      type: 'routing.open',
      target: { kind: 'pipeline', pipelineId: 'p-src' },
      readOnly: true,
    });
    const viewRef = canvas.getSnapshot().context.routingFlyout?.ref;
    expect(viewRef?.getSnapshot().context).toMatchObject({ editable: false, readOnly: true });
    viewRef?.send({ type: 'rule.update', key: 'rule-0', changes: { action: 'copy' } });
    viewRef?.send({ type: 'flyout.save' });

    expect(canvas.getSnapshot().context.nextUnit).toBe(staged);
  });

  it('puts a routing node on a rule line through a new child pipeline', async () => {
    const routed = loadedUnit();
    routed.unit.pipelines[0].config = [
      { name: 'sources', value: ['src'] },
      { name: 'routes', value: [{ when: 'body == "x"', destinations: ['es'] }] },
    ];
    const { canvas } = startCanvas(async (unit) => unit, routed);
    await waitForUnitReady(canvas);

    canvas.send({
      type: 'routing.open',
      target: {
        kind: 'line',
        line: {
          origin: { kind: 'rule', rule: { pipelineId: 'p-src', ruleIndex: 0 } },
          destinationId: 'es',
        },
      },
    });
    canvas.getSnapshot().context.routingFlyout?.ref?.send({ type: 'flyout.save' });

    const { pipelines } = canvas.getSnapshot().context.nextUnit.unit;
    expect(canvas.getSnapshot().context.routingFlyout).toBeUndefined();
    expect(pipelines.map(({ id, config }) => [id, config])).toEqual([
      [
        'p-src',
        [
          { name: 'sources', value: ['src'] },
          { name: 'routes', value: [{ when: 'body == "x"', pipelines: ['p-src-routing'] }] },
        ],
      ],
      ['p-src-routing', [{ name: 'routes', value: [{ destinations: ['es'] }] }]],
    ]);
  });

  it('shows the missing state for a line or routing node it cannot configure', async () => {
    const { canvas } = startCanvas(async (unit) => unit);
    await waitForUnitReady(canvas);

    const unroutable = {
      kind: 'line' as const,
      line: { origin: { kind: 'source' as const, id: 'src' }, destinationId: 'missing' },
    };
    canvas.send({ type: 'routing.open', target: unroutable });
    expect(canvas.getSnapshot().context.routingFlyout).toEqual({ target: unroutable });

    const missing = { kind: 'pipeline' as const, pipelineId: 'missing' };
    canvas.send({ type: 'routing.open', target: missing });
    expect(canvas.getSnapshot().context.routingFlyout).toEqual({ target: missing });

    canvas.send({ type: 'routing.close' });
    expect(canvas.getSnapshot().context.routingFlyout).toBeUndefined();
  });

  it('rejects a save whose line can no longer be routed', async () => {
    const { canvas } = startCanvas(async (unit) => unit);
    await waitForUnitReady(canvas);
    const ref = openRouting(canvas);
    const staged = disconnectLine(
      canvas.getSnapshot().context.nextUnit,
      { kind: 'source', id: 'src' },
      { kind: 'destination', id: 'es' }
    );
    canvas.send({ type: 'unit.stage', unitDefinition: staged });
    ref.send({ type: 'flyout.save' });

    expect(ref.getSnapshot().value).toBe('idle');
    expect(ref.getSnapshot().context.saveError).toMatch(/no longer be applied/);
    expect(canvas.getSnapshot().context.nextUnit).toBe(staged);
  });
});

describe('canvas deletes', () => {
  it.each([
    { type: 'source.delete', sourceId: 'src' },
    { type: 'destination.delete', destinationId: 'es' },
  ] as const)('resyncs the children without persisting a $type event', async (event) => {
    const persist = jest.fn(async (unit: Unit) => unit);
    const { canvas } = startCanvas(persist);
    await waitForUnitReady(canvas);
    const { sourcesRef, destinationsRef } = canvas.getSnapshot().context;

    if (event.type === 'source.delete') {
      sourcesRef.send(event);
    } else {
      destinationsRef.send(event);
    }
    await waitForUnitReady(canvas);

    expect(persist).not.toHaveBeenCalled();
    const { nextUnit } = canvas.getSnapshot().context;
    expect(nextUnit).toEqual(loadedUnit());
    expect(sourcesRef.getSnapshot().context.unitDefinition).toEqual(nextUnit);
    expect(destinationsRef.getSnapshot().context.unitDefinition).toEqual(nextUnit);
    expect(sourcesRef.getSnapshot().context.persistedUnitDefinition).toEqual(nextUnit);
    expect(destinationsRef.getSnapshot().context.persistedUnitDefinition).toEqual(nextUnit);
    canvas.stop();
  });

  it('closes a removed source and restores its metadata on undo without revoking keys', async () => {
    const persist = jest.fn(async (unit: Unit) => unit);
    const unit = loadedUnit();
    const { canvas, http } = startCanvas(persist, unit);
    await waitForUnitReady(canvas);
    const { sourcesRef } = canvas.getSnapshot().context;
    await waitFor(sourcesRef, (snapshot) => snapshot.matches({ environment: 'ready' }));
    const metadata = sourcesRef.getSnapshot().context.metadataBySourceId.src;
    expect(metadata.endpoint).toContain('https://inputs.example.com');
    sourcesRef.send({ type: 'source.view', sourceId: 'src' });
    expect(sourcesRef.getSnapshot().context.selectedSourceId).toBe('src');

    canvas.send({
      type: 'unit.stage',
      unitDefinition: { ...unit, unit: { ...unit.unit, sources: [], pipelines: [] } },
    });
    expect(sourcesRef.getSnapshot().context.selectedSourceId).toBeUndefined();
    expect(sourcesRef.getSnapshot().context.metadataBySourceId.src).toBeUndefined();
    canvas.send({ type: 'unit.stage', unitDefinition: unit });

    expect(sourcesRef.getSnapshot().context.metadataBySourceId.src).toEqual(metadata);
    expect(persist).not.toHaveBeenCalled();
    expect(http.fetch).not.toHaveBeenCalledWith(
      '/internal/streams/sources/api_key',
      expect.objectContaining({ method: 'DELETE' })
    );
    canvas.stop();
  });
});

describe('canvas id allocation', () => {
  const staged = loadedUnit();
  const saved: Unit = {
    ...staged,
    unit: {
      ...staged.unit,
      sources: [
        ...staged.unit.sources,
        { id: 'us-store', name: 'Legacy', type: 'otlp', supported_telemetry: ['logs'] },
        { id: 'intake', type: 'otlp', supported_telemetry: ['logs'] },
      ],
    },
  };

  const openSourceCreation = async () => {
    const persist = jest.fn(async (unit: Unit) => unit);
    const { canvas } = startCanvas(persist, saved);
    await waitForUnitReady(canvas);
    const { sourcesRef } = canvas.getSnapshot().context;
    await waitFor(sourcesRef, (snapshot) => snapshot.matches({ environment: 'ready' }));
    canvas.send({ type: 'unit.stage', unitDefinition: staged });
    sourcesRef.send({ type: 'modal.openCreate' });
    return { canvas, persist, sourcesRef };
  };

  it('gives a new source an id the saved unit does not use', async () => {
    const { canvas, persist, sourcesRef } = await openSourceCreation();

    sourcesRef.send({
      type: 'source.create',
      formData: { sourceType: 'otlp', sourceName: 'US Store', signals: ['logs'] },
    });
    await waitForUnitReady(canvas);

    expect(persist.mock.calls[0]?.[0].unit.sources.map(({ id }) => id)).toContain('us-store-2');
    canvas.stop();
  });

  it('reserves the displayed id of an unnamed saved source', async () => {
    const { canvas, persist, sourcesRef } = await openSourceCreation();

    sourcesRef.send({
      type: 'source.create',
      formData: { sourceType: 'otlp', sourceName: 'Intake', signals: ['logs'] },
    });
    await waitForUnitReady(canvas);

    expect(persist).not.toHaveBeenCalled();
    expect(sourcesRef.getSnapshot().matches({ configuring: 'supplyingConfiguration' })).toBe(true);
    canvas.stop();
  });
});

describe('canvas save', () => {
  const archive: UnitDestination = {
    id: 'archive',
    type: 'elasticsearch',
    supported_telemetry: ['logs'],
  };
  const withArchive = (unit: Unit): Unit =>
    withUnitDestinations(unit, [...getUnitDestinations(unit), archive]);

  const processedUnit = (): Unit => {
    const processed = loadedUnit();
    processed.unit.processors = [{ id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] }];
    processed.unit.pipelines[0].config = [
      { name: 'sources', value: ['src'] },
      { name: 'processors', value: ['tag'] },
      { name: 'destinations', value: ['es'] },
    ];
    return processed;
  };

  const routedUnit = (): Unit => {
    const routed = loadedUnit();
    routed.unit.sources = [
      ...routed.unit.sources,
      { id: 'metrics-src', type: 'otlp', supported_telemetry: ['metrics'] },
    ];
    routed.unit.destinations = [
      ...routed.unit.destinations,
      { id: 'es-metrics', type: 'elasticsearch', supported_telemetry: ['metrics'] },
    ];
    routed.unit.pipelines[0].supported_telemetry = ['logs', 'metrics'];
    routed.unit.pipelines[0].config = [
      { name: 'sources', value: ['src', 'metrics-src'] },
      {
        name: 'routes',
        value: [
          { telemetry: ['logs'], destinations: ['es'] },
          { telemetry: ['metrics'], destinations: ['es-metrics'] },
        ],
      },
    ];
    return routed;
  };

  const refuseToSave = async (processed: Unit, unhooked: Unit) => {
    const persisted: Unit[] = [];
    const { canvas } = startCanvas(async (unit) => {
      persisted.push(unit);
      return unit;
    }, processed);
    await waitForUnitReady(canvas);

    canvas.send({ type: 'unit.stage', unitDefinition: unhooked });
    canvas.send({ type: 'unit.save' });
    await waitFor(canvas, (snapshot) => snapshot.matches({ ready: { unit: 'saveFailed' } }));

    expect(persisted).toEqual([]);
    expect(canvas.getSnapshot().context.nextUnit).toBe(unhooked);
    return canvas.getSnapshot().context.error?.message;
  };

  it('keeps a processing node without a destination staged but refuses to save it', async () => {
    const processed = processedUnit();
    const unhooked = disconnectLine(
      processed,
      { kind: 'processing', ref: sourceSlot },
      { kind: 'destination', id: 'es' }
    );
    expect(unhooked.unit.pipelines[0].config).toEqual([
      { name: 'sources', value: ['src'] },
      { name: 'processors', value: ['tag'] },
    ]);

    expect(await refuseToSave(processed, unhooked)).toBe(
      'Connect each processing node to a destination before saving. To remove processors, undo the disconnect or reconnect the node and save the map first.'
    );
  });

  it('allows removal of processors after undoing the disconnect', async () => {
    const saved = processedUnit();
    const persist = jest.fn(async (unit: Unit) => unit);
    const { canvas } = startCanvas(persist, saved);
    await waitForUnitReady(canvas);
    const unhooked = disconnectLine(
      saved,
      { kind: 'processing', ref: sourceSlot },
      { kind: 'destination', id: 'es' }
    );
    canvas.send({ type: 'unit.stage', unitDefinition: unhooked });
    canvas.send({ type: 'unit.save' });
    await waitFor(canvas, (snapshot) => snapshot.matches({ ready: { unit: 'saveFailed' } }));
    expect(persist).not.toHaveBeenCalled();

    canvas.send({ type: 'unit.stage', unitDefinition: saved });
    const flyout = openFlyout(canvas);
    flyout.ref.send({ type: 'step.deleteAll' });
    flyout.ref.send({ type: 'flyout.save' });
    await waitFor(canvas, (snapshot) => snapshot.context.processingFlyout === undefined);
    const { nextUnit } = canvas.getSnapshot().context;
    expect(nextUnit.unit.processors).toEqual([]);

    canvas.send({
      type: 'unit.stage',
      unitDefinition: disconnectLine(
        nextUnit,
        { kind: 'source', id: 'src' },
        { kind: 'destination', id: 'es' }
      ),
    });
    canvas.send({ type: 'unit.save' });
    await waitForUnitReady(canvas);
    expect(persist.mock.calls[1][0].unit.pipelines).toEqual([]);
  });

  it('keeps a processing node nothing feeds staged but refuses to save it', async () => {
    const processed = processedUnit();
    const unhooked = disconnectLine(
      processed,
      { kind: 'source', id: 'src' },
      { kind: 'pipeline', id: 'p-src' }
    );
    expect(unhooked.unit.pipelines[0].config).toEqual([
      { name: 'processors', value: ['tag'] },
      { name: 'destinations', value: ['es'] },
    ]);

    expect(await refuseToSave(processed, unhooked)).toBe(
      'Connect a source or a routing rule to each processing and routing node before saving. To remove processors, undo the disconnect or reconnect the node and save the map first.'
    );
  });

  it('keeps a routing rule without a target staged but refuses to save it', async () => {
    const routed = loadedUnit();
    routed.unit.pipelines[0].config = [
      { name: 'sources', value: ['src'] },
      { name: 'routes', value: [{ when: 'true', destinations: ['es'] }, { destinations: ['es'] }] },
    ];
    const unhooked = disconnectLine(
      routed,
      { kind: 'rule', rule: { pipelineId: 'p-src', ruleIndex: 0 } },
      { kind: 'destination', id: 'es' }
    );
    expect(unhooked.unit.pipelines[0].config).toEqual([
      { name: 'sources', value: ['src'] },
      { name: 'routes', value: [{ when: 'true', destinations: [] }, { destinations: ['es'] }] },
    ]);

    expect(await refuseToSave(routed, unhooked)).toBe(
      'Connect each routing rule to a destination or a pipeline before saving, or remove the rule.'
    );
  });

  it('keeps a scoped rule whose source was unhooked staged but refuses to save it', async () => {
    const routed = routedUnit();
    const unhooked = disconnectLine(
      routed,
      { kind: 'source', id: 'metrics-src' },
      { kind: 'pipeline', id: 'p-src' }
    );
    expect(unhooked.unit.pipelines[0].config[0]).toEqual({ name: 'sources', value: ['src'] });

    expect(await refuseToSave(routed, unhooked)).toBe(
      'A routing rule of p-src only handles metrics, but no source connected to it sends metrics. Connect such a source before saving, or remove the rule.'
    );
  });

  it('keeps a destination the processing node cannot feed staged but refuses to save it', async () => {
    const processed = processedUnit();
    processed.unit.destinations = [
      ...processed.unit.destinations,
      { id: 'es-traces', type: 'elasticsearch', supported_telemetry: ['traces'] },
    ];
    const unfed = connectLine(
      processed,
      { kind: 'processing', ref: sourceSlot },
      { kind: 'destination', id: 'es-traces' }
    );
    expect(unfed.unit.pipelines[0].config).toEqual([
      { name: 'sources', value: ['src'] },
      { name: 'processors', value: ['tag'] },
      { name: 'destinations', value: ['es', 'es-traces'] },
    ]);

    expect(await refuseToSave(processed, unfed)).toBe(
      'p-src forwards none of the signals es-traces accepts. Connect a source that sends them before saving, or unhook es-traces.'
    );
  });

  it('writes only the created destination alongside the saved wiring and destinations', async () => {
    const processed = processedUnit();
    const saved = withUnitDestinations(processed, [
      ...getUnitDestinations(processed),
      { id: 'legacy', type: 'elasticsearch', supported_telemetry: ['logs'] },
    ]);
    const unhooked = disconnectLine(
      processed,
      { kind: 'processing', ref: sourceSlot },
      { kind: 'destination', id: 'es' }
    );
    const withNewDestination = withArchive(unhooked);
    const persist = jest.fn(async (unit: Unit) => unit);
    const history = { hold: jest.fn(), reset: jest.fn(), discard: jest.fn() };
    const { canvas } = startCanvas(persist, saved, history);
    await waitForUnitReady(canvas);

    canvas.send({ type: 'unit.stage', unitDefinition: unhooked });
    canvas.send({
      type: 'unit.changed',
      unitDefinition: withNewDestination,
      destinationIds: ['archive'],
      intent: 'create',
    });
    await waitForUnitReady(canvas);

    const written = withArchive(saved);
    expect(persist).toHaveBeenCalledWith(written, undefined);
    const { unit, nextUnit, sourcesRef, destinationsRef } = canvas.getSnapshot().context;
    expect(getUnitDestinations(unit).map(({ id }) => id)).toEqual(['es', 'legacy', 'archive']);
    expect(nextUnit).toEqual(withNewDestination);
    expect(getUnitDestinations(nextUnit).map(({ id }) => id)).toEqual(['es', 'archive']);
    expect(sourcesRef.getSnapshot().context.unitDefinition).toEqual(withNewDestination);
    expect(sourcesRef.getSnapshot().context.persistedUnitDefinition).toEqual(written);
    expect(destinationsRef.getSnapshot().context.unitDefinition).toEqual(withNewDestination);
    expect(destinationsRef.getSnapshot().context.persistedUnitDefinition).toEqual(written);
    expect(history.hold).toHaveBeenCalledTimes(1);
    expect(history.reset).toHaveBeenCalledTimes(1);
    expect(history.discard).not.toHaveBeenCalled();

    canvas.stop();
  });

  it('restores staged edits after a failed destination create and keeps them through a same-id retry', async () => {
    const saved = processedUnit();
    const staged = disconnectLine(
      saved,
      { kind: 'processing', ref: sourceSlot },
      { kind: 'destination', id: 'es' }
    );
    const persist = jest.fn(async (unit: Unit) => unit).mockRejectedValueOnce(new Error('boom'));
    const history = { hold: jest.fn(), reset: jest.fn(), discard: jest.fn() };
    const { canvas } = startCanvas(persist, saved, history);
    await waitForUnitReady(canvas);
    const { destinationsRef } = canvas.getSnapshot().context;
    canvas.send({ type: 'unit.stage', unitDefinition: staged });

    const submit = () => {
      destinationsRef.send({ type: 'modal.openCreate' });
      destinationsRef.send({
        type: 'destination.create',
        formData: {
          ...EMPTY_DESTINATION_CREATION_FORM,
          destinationName: 'Archive',
          storageKind: 'external_storage',
          s3: {
            region: 'eu-west-1',
            bucket: 'demo-bucket',
            prefix: '',
            accessKeyId: 'AKIA',
            secretAccessKey: 'shh',
          },
        },
      });
    };

    submit();
    await waitFor(canvas, failed);
    const { nextUnit: afterFailure } = canvas.getSnapshot().context;
    const destinationAfterFailure = destinationsRef.getSnapshot();
    expect(destinationAfterFailure.matches({ configuring: 'failed' })).toBe(true);
    expect(history.hold).toHaveBeenCalledTimes(1);
    expect(history.discard).toHaveBeenCalledTimes(1);
    expect(history.reset).not.toHaveBeenCalled();

    destinationsRef.send({ type: 'modal.closeCreate' });
    submit();
    await waitForUnitReady(canvas);

    expect(persist).toHaveBeenCalledTimes(2);
    const written = persist.mock.calls.map(([unit]) => unit);
    expect(written.map((unit) => getUnitDestinations(unit).map(({ id }) => id))).toEqual([
      ['es', 'archive'],
      ['es', 'archive'],
    ]);
    expect(written.map(({ unit }) => unit.pipelines)).toEqual([
      saved.unit.pipelines,
      saved.unit.pipelines,
    ]);
    expect(afterFailure).toBe(staged);
    expect(destinationAfterFailure.context.unitDefinition).toBe(staged);
    expect(destinationAfterFailure.context.persistedUnitDefinition).toBe(saved);
    const { nextUnit } = canvas.getSnapshot().context;
    expect(nextUnit.unit.pipelines).toEqual(staged.unit.pipelines);
    expect(getUnitDestinations(nextUnit).map(({ id }) => id)).toEqual(['es', 'archive']);
    expect(destinationsRef.getSnapshot().matches({ configuring: 'idle' })).toBe(true);
    canvas.stop();
  });

  it('keeps the router open to reconnecting a staged-disconnected signal after a create', async () => {
    const saved = routedUnit();
    const from = { kind: 'source', id: 'metrics-src' } as const;
    const to = { kind: 'pipeline', id: 'p-src' } as const;
    const staged = disconnectLine(saved, from, to);
    const stagedWithArchive = withArchive(staged);
    const { canvas } = startCanvas(async (unit) => unit, saved);
    await waitForUnitReady(canvas);

    canvas.send({ type: 'unit.stage', unitDefinition: staged });
    canvas.send({
      type: 'unit.changed',
      unitDefinition: stagedWithArchive,
      destinationIds: ['archive'],
      intent: 'create',
    });
    await waitForUnitReady(canvas);

    const { nextUnit } = canvas.getSnapshot().context;
    expect(canConnectLine(nextUnit, from, to)).toBe(true);
    expect(nextUnit).toEqual(stagedWithArchive);
    expect(nextUnit.unit.pipelines[0].supported_telemetry).toEqual(['logs', 'metrics']);
    canvas.stop();
  });
});

type CanvasActor = Actor<typeof canvasStateMachine>;
type CanvasSnapshot = SnapshotFrom<typeof canvasStateMachine>;

const ready = (snapshot: CanvasSnapshot) => snapshot.matches({ ready: { unit: 'ready' } });
const failed = (snapshot: CanvasSnapshot) => snapshot.matches({ ready: { unit: 'saveFailed' } });

const s3Node: UnitDestination = {
  id: 's3-archive',
  name: 'S3 archive',
  type: 's3',
  supported_telemetry: ['logs'],
  config: [],
};

describe('canvasStateMachine', () => {
  const unit = createDefaultUnit();
  const unitWithS3 = withUnitDestinations(unit, [...getUnitDestinations(unit), s3Node]);
  const secrets = { 's3-archive-secret-access-key': 'shh' };
  let core: ReturnType<typeof coreMock.createStart>;
  let persist: jest.Mock;
  let load: jest.Mock;
  let actor: CanvasActor;

  beforeEach(async () => {
    core = coreMock.createStart();
    persist = jest.fn(async (unitDefinition: Unit) => unitDefinition);
    load = jest.fn(async () => unit);
    const implementations = createCanvasMachineImplementations({
      core,
      urlStateStorageContainer: {
        get: () => undefined,
        set: jest.fn(),
      } as unknown as IKbnUrlStateStorage,
      apiKeyGenerationDeps: {
        streamsRepositoryClient: { fetch: jest.fn() },
        unitId: STREAMS_DEFAULT_UNIT_ID,
      } as unknown as DestinationApiKeyGenerationDeps,
      timeState,
      timeState$: EMPTY,
      loadUnitDefinition: load,
      persistUnitDefinition: persist,
      createHistoryRef: { current: { hold: jest.fn(), reset: jest.fn(), discard: jest.fn() } },
    });
    const idle = createMachine({ initial: 'idle', states: { idle: {} } });
    actor = createActor(
      canvasStateMachine.provide({
        ...implementations,
        actors: {
          ...implementations.actors,
          sourcesMachine: idle as unknown as typeof sourcesStateMachine,
          destinationsMachine: idle as unknown as typeof destinationsStateMachine,
        },
      }),
      { input: defaultCanvasUrlState }
    );
    actor.start();
    await waitFor(actor, ready);
  });

  afterEach(() => {
    actor.stop();
  });

  it('persists a destination create with its secrets and then forgets them', async () => {
    actor.send({
      type: 'unit.changed',
      unitDefinition: unitWithS3,
      destinationIds: ['s3-archive'],
      intent: 'create',
      secrets,
    });
    await waitFor(actor, ready);
    expect(persist).toHaveBeenCalledWith(unitWithS3, secrets);
    expect(JSON.stringify(actor.getSnapshot().context)).not.toContain('shh');
  });

  it('forgets the secrets when persistence fails', async () => {
    persist.mockRejectedValueOnce(new Error('boom'));
    actor.send({
      type: 'unit.changed',
      unitDefinition: unitWithS3,
      destinationIds: ['s3-archive'],
      intent: 'create',
      secrets,
    });
    await waitFor(actor, failed);
    expect(JSON.stringify(actor.getSnapshot().context)).not.toContain('shh');
  });

  it('sends no secrets on a later plain save', async () => {
    actor.send({
      type: 'unit.changed',
      unitDefinition: unitWithS3,
      destinationIds: ['s3-archive'],
      intent: 'create',
      secrets,
    });
    await waitFor(actor, ready);
    const stagedUnit: Unit = {
      ...unitWithS3,
      ui_metadata: { nodes: { 's3-archive': { x: 1, y: 2 } } },
    };
    actor.send({ type: 'unit.stage', unitDefinition: stagedUnit });
    actor.send({ type: 'unit.save' });
    await waitFor(actor, ready);
    expect(persist).toHaveBeenLastCalledWith(stagedUnit, undefined);
  });

  it('does not toast a failed destination create but still toasts a failed reload after it', async () => {
    persist.mockRejectedValueOnce(new Error('boom'));
    actor.send({
      type: 'unit.changed',
      unitDefinition: unitWithS3,
      destinationIds: ['s3-archive'],
      intent: 'create',
      secrets,
    });
    await waitFor(actor, failed);
    expect(core.notifications.toasts.addError).not.toHaveBeenCalled();
    load.mockRejectedValueOnce(new Error('offline'));
    actor.send({ type: 'unit.reload' });
    await waitFor(actor, (snapshot) => snapshot.matches({ ready: { unit: 'reloadFailed' } }));
    expect(core.notifications.toasts.addError).toHaveBeenCalledTimes(1);
  });
});

describe('canvas routing save diagnostics', () => {
  const routedUnit = (): Unit => {
    const routed = loadedUnit();
    routed.unit.pipelines[0].config = [
      { name: 'sources', value: ['src'] },
      {
        name: 'routes',
        value: [{ when: 'attributes["a"] ==', destinations: ['es'] }, { destinations: ['es'] }],
      },
    ];
    return routed;
  };

  const rejected = (diagnostics: object[]) =>
    Object.assign(new Error('Bad Request'), {
      name: 'HttpFetchError',
      request: {},
      body: { statusCode: 400, attributes: { data: { valid: false, diagnostics } } },
    });

  const failSave = async () => {
    const persist = jest.fn(async (unit: Unit) => unit);
    persist.mockRejectedValueOnce(
      rejected([
        {
          severity: 'error',
          code: 'E050',
          message: 'unexpected end of condition',
          path: '/pipelines/0/config/1/value/0/when',
        },
      ])
    );
    const { canvas } = startCanvas(persist, routedUnit());
    await waitForUnitReady(canvas);
    const staged = routedUnit();
    staged.unit.pipelines[0].name = 'Routing';
    canvas.send({ type: 'unit.stage', unitDefinition: staged });
    canvas.send({ type: 'unit.save' });
    await waitFor(canvas, (snapshot) => snapshot.matches({ ready: { unit: 'saveFailed' } }));
    return canvas;
  };

  it('traces a rejected save back to the routing rule and hands it to the flyout', async () => {
    const canvas = await failSave();
    expect(canvas.getSnapshot().context.routingDiagnostics).toEqual([
      { code: 'E050', message: 'unexpected end of condition', pipelineId: 'p-src', ruleIndex: 0 },
    ]);

    canvas.send({ type: 'routing.open', target: { kind: 'pipeline', pipelineId: 'p-src' } });
    const rules = canvas.getSnapshot().context.routingFlyout?.ref?.getSnapshot().context.rules;
    expect(rules?.map(({ diagnostics }) => diagnostics)).toEqual([
      ['unexpected end of condition'],
      undefined,
    ]);
  });

  it('drops the routing node diagnostics once its rules are staged again', async () => {
    const canvas = await failSave();
    canvas.send({ type: 'routing.open', target: { kind: 'pipeline', pipelineId: 'p-src' } });
    const ref = canvas.getSnapshot().context.routingFlyout?.ref;
    ref?.send({
      type: 'rule.update',
      key: 'rule-0',
      changes: { when: 'attributes["a"] == "b"' },
    });
    ref?.send({ type: 'flyout.save' });
    expect(canvas.getSnapshot().context.routingDiagnostics).toEqual([]);
  });
});
