/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActor, setup } from 'xstate';
import type { DraftProcessor, UnitProcessor } from '../../../services/unit_processing';
import {
  processingFlyoutMachine,
  type ProcessingFlyoutInput,
  type ProcessingSaveRequest,
} from './processing_flyout_machine';

const processor = (path: string): DraftProcessor => ({
  type: 'add_fields',
  supported_telemetry: ['logs'],
  config: [
    { name: 'fields', value: [{ action: 'upsert', location: 'attributes', path, value: 'x' }] },
  ],
});

const savedProcessor: UnitProcessor = { id: 'add-fields-1', ...processor('team') };

const startFlyout = (overrides: Partial<Omit<ProcessingFlyoutInput, 'parentRef'>> = {}) => {
  const requests: ProcessingSaveRequest[] = [];
  const parent = createActor(
    setup({ types: { events: {} as ProcessingSaveRequest } }).createMachine({
      on: { 'processing.save': { actions: ({ event }) => requests.push(event) } },
    })
  ).start();
  const flyout = createActor(processingFlyoutMachine, {
    input: {
      slot: { kind: 'pipeline', pipelineId: 'processing-1' },
      telemetry: ['logs'],
      processors: [savedProcessor],
      editable: true,
      parentRef: parent,
      ...overrides,
    },
  }).start();
  return { flyout, requests };
};

describe('processingFlyoutMachine', () => {
  it('starts from the node processors without unsaved changes', () => {
    const { flyout } = startFlyout();
    const { context } = flyout.getSnapshot();
    expect(context.steps).toEqual([
      { key: 'step-0', processor: { ...savedProcessor }, status: 'saved' },
    ]);
    expect(context.hasChanges).toBe(false);
  });

  it('stages new and edited processors', () => {
    const { flyout } = startFlyout();
    flyout.send({ type: 'step.create' });
    expect(flyout.getSnapshot().value).toBe('editing');
    flyout.send({ type: 'step.commit', processor: processor('tier') });
    flyout.send({ type: 'step.edit', key: 'step-0' });
    flyout.send({ type: 'step.commit', processor: processor('renamed') });

    const { context, value } = flyout.getSnapshot();
    expect(value).toBe('idle');
    expect(context.steps.map(({ status, processor: { id } }) => [status, id])).toEqual([
      ['updated', 'add-fields-1'],
      ['new', undefined],
    ]);
    expect(context.hasChanges).toBe(true);
  });

  it('opens straight into creating when asked, and prepends the new processor', () => {
    const { flyout } = startFlyout({ initialCreate: { position: 'start' } });
    expect(flyout.getSnapshot().value).toBe('editing');
    flyout.send({ type: 'step.commit', processor: processor('first') });

    expect(flyout.getSnapshot().context.steps.map(({ key }) => key)).toEqual(['step-1', 'step-0']);
  });

  it('appends processors created from the list', () => {
    const { flyout } = startFlyout();
    flyout.send({ type: 'step.create', position: 'end' });
    flyout.send({ type: 'step.commit', processor: processor('last') });

    expect(flyout.getSnapshot().context.steps.map(({ key }) => key)).toEqual(['step-0', 'step-1']);
  });

  it('ignores the initial create for read-only nodes', () => {
    const { flyout } = startFlyout({ editable: false, initialCreate: { position: 'start' } });
    expect(flyout.getSnapshot().value).toBe('idle');
  });

  it('reorders and deletes steps, closing the editor of a deleted step', () => {
    const { flyout } = startFlyout();
    flyout.send({ type: 'step.create' });
    flyout.send({ type: 'step.commit', processor: processor('tier') });
    flyout.send({ type: 'step.reorder', from: 1, to: 0 });
    expect(flyout.getSnapshot().context.steps.map(({ key }) => key)).toEqual(['step-1', 'step-0']);

    flyout.send({ type: 'step.edit', key: 'step-1' });
    flyout.send({ type: 'step.delete', key: 'step-1' });
    expect(flyout.getSnapshot().value).toBe('idle');
    expect(flyout.getSnapshot().context.steps.map(({ key }) => key)).toEqual(['step-0']);
  });

  it('deletes every step at once and saves an empty list', () => {
    const { flyout, requests } = startFlyout();
    flyout.send({ type: 'step.duplicate', key: 'step-0' });
    flyout.send({ type: 'step.edit', key: 'step-1' });

    flyout.send({ type: 'step.deleteAll' });
    const { context, value } = flyout.getSnapshot();
    expect(value).toBe('idle');
    expect(context.steps).toEqual([]);
    expect(context.editingKey).toBeUndefined();
    expect(context.hasChanges).toBe(true);
    expect(requests).toEqual([]);

    flyout.send({ type: 'flyout.save' });
    expect(requests).toEqual([
      {
        type: 'processing.save',
        slot: { kind: 'pipeline', pipelineId: 'processing-1' },
        processors: [],
      },
    ]);
  });

  it('duplicates a step right after the original as a new processor', () => {
    const { flyout } = startFlyout();
    flyout.send({ type: 'step.duplicate', key: 'step-0' });

    const { context } = flyout.getSnapshot();
    expect(context.steps.map(({ key, status, processor: { id } }) => [key, status, id])).toEqual([
      ['step-0', 'saved', 'add-fields-1'],
      ['step-1', 'new', undefined],
    ]);
    expect(context.steps[1].processor.config).toEqual(savedProcessor.config);
    expect(context.hasChanges).toBe(true);
  });

  it('asks the canvas to save and finishes when it succeeds', () => {
    const { flyout, requests } = startFlyout();
    flyout.send({ type: 'flyout.save' });
    expect(requests).toEqual([]);

    flyout.send({ type: 'step.delete', key: 'step-0' });
    flyout.send({ type: 'flyout.save' });
    expect(requests).toEqual([
      {
        type: 'processing.save',
        slot: { kind: 'pipeline', pipelineId: 'processing-1' },
        processors: [],
      },
    ]);
    expect(flyout.getSnapshot().value).toBe('saving');

    flyout.send({ type: 'save.succeeded' });
    expect(flyout.getSnapshot().status).toBe('done');
  });

  it('keeps the draft and shows diagnostics when the save fails', () => {
    const { flyout } = startFlyout();
    flyout.send({ type: 'step.create' });
    flyout.send({ type: 'step.commit', processor: processor('') });
    flyout.send({ type: 'flyout.save' });
    flyout.send({
      type: 'save.failed',
      message: 'Invalid unit',
      diagnostics: [{ code: 'E034', message: 'path too short', processorId: 'add-fields-1' }],
    });

    const { context, value } = flyout.getSnapshot();
    expect(value).toBe('idle');
    expect(context.saveError).toBe('Invalid unit');
    expect(context.diagnostics).toHaveLength(1);
    expect(context.steps).toHaveLength(2);
  });

  it('does not edit read-only nodes', () => {
    const { flyout } = startFlyout({ editable: false });
    flyout.send({ type: 'step.create' });
    expect(flyout.getSnapshot().value).toBe('idle');

    flyout.send({ type: 'step.deleteAll' });
    expect(flyout.getSnapshot().context.steps).toHaveLength(1);
    expect(flyout.getSnapshot().context.hasChanges).toBe(false);
  });
});
