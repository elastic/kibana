/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMemoryHistory } from 'history';
import { coreMock } from '@kbn/core/public/mocks';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createStreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { createActor, waitFor } from 'xstate';
import type { ProcessingNodeRef } from '../../../../../services/unit_graph';
import type { Unit } from '../../../../../services/unit_repository';
import { canvasStateMachine, createCanvasMachineImplementations } from './canvas_state_machine';
import { defaultCanvasUrlState } from './types';

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
  unit: Unit = loadedUnit()
) => {
  const core = coreMock.createStart();
  const machine = canvasStateMachine.provide(
    createCanvasMachineImplementations({
      core,
      urlStateStorageContainer: createKbnUrlStateStorage({
        history: createMemoryHistory(),
        useHash: false,
      }),
      apiKeyGenerationDeps: { streamsRepositoryClient: createStreamsRepositoryClient(core) },
      loadUnitDefinition: async () => unit,
      persistUnitDefinition,
      createHistoryRef: { current: { hold: () => {}, commit: () => {}, discard: () => {} } },
    })
  );
  const canvas = createActor(machine, { input: defaultCanvasUrlState }).start();
  return { canvas, toasts: core.notifications.toasts };
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
