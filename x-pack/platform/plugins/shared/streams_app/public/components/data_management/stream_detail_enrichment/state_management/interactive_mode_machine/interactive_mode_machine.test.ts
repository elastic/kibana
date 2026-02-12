/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokCollection } from '@kbn/grok-ui';
import { ALWAYS_CONDITION, type StreamlangProcessorDefinition } from '@kbn/streamlang';
import type { StreamlangConditionBlock, StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import { createActor } from 'xstate5';
import { interactiveModeMachine } from './interactive_mode_machine';
import type { InteractiveModeParentRef } from './types';

const createParentRef = () => {
  const send = jest.fn();

  const parentRef: InteractiveModeParentRef = {
    send,
    getSnapshot: () => ({
      context: {
        // Only required for some actions (e.g. default processor creation); keep minimal for this test.
        simulatorRef: {
          getSnapshot: () => ({
            context: {
              samples: [],
              previewDocsFilter: undefined,
              simulation: undefined,
              selectedConditionId: undefined,
            },
          }),
        } as any,
        dataSourcesRefs: [],
        schemaErrors: [],
        validationErrors: new Map(),
      },
    }),
  };

  return { parentRef, send };
};

describe('interactiveModeMachine condition focus behavior', () => {
  it('does not clear auto-selected condition focus on processor save (Update)', () => {
    const { parentRef, send } = createParentRef();

    const actor = createActor(interactiveModeMachine, {
      input: {
        dsl: { steps: [] } as unknown as StreamlangDSL,
        newStepIds: [],
        parentRef,
        privileges: { manage: true, simulate: true },
        simulationMode: 'partial',
        streamName: 'test-stream',
        grokCollection: {} as unknown as GrokCollection,
      },
    });

    actor.start();
    send.mockClear(); // ignore initial sync/simulation traffic

    // Create a condition block and persist it (exit `creating` state).
    actor.send({
      type: 'step.addCondition',
      condition: { condition: { ...ALWAYS_CONDITION, steps: [] } } as StreamlangConditionBlock,
    });

    const autoFilterEvent = send.mock.calls
      .map(([event]) => event)
      .find((event) => event?.type === 'simulation.filterByConditionAuto') as
      | { type: 'simulation.filterByConditionAuto'; conditionId: string }
      | undefined;

    expect(autoFilterEvent).toBeDefined();
    const conditionId = autoFilterEvent!.conditionId;

    actor.send({ type: 'step.save', id: conditionId });

    // Create a processor under that condition and persist it.
    const processor: StreamlangProcessorDefinition = {
      action: 'set',
      to: 'foo',
      value: 'bar',
      override: true,
      ignore_failure: false,
      where: ALWAYS_CONDITION,
    };

    actor.send({
      type: 'step.addProcessor',
      processor,
      options: { parentId: conditionId },
    });

    const processorId = actor
      .getSnapshot()
      .context.stepRefs.map((ref) => ref.getSnapshot().context.step)
      .find((step) => (step as any).action === 'set' && step.parentId === conditionId)?.customIdentifier;

    expect(processorId).toBeDefined();
    actor.send({ type: 'step.save', id: processorId! });

    // Start editing; the machine should auto-select the parent condition via a parent event.
    send.mockClear();
    actor.send({ type: 'step.edit', id: processorId! });

    const editAutoSelect = send.mock.calls
      .map(([event]) => event)
      .find((event) => event?.type === 'simulation.filterByConditionAuto') as
      | { type: 'simulation.filterByConditionAuto'; conditionId: string }
      | undefined;

    expect(editAutoSelect?.conditionId).toBe(conditionId);

    // Simulate parent applying the filter back to the interactive mode machine.
    actor.send({ type: 'step.filterByCondition', conditionId });
    expect(actor.getSnapshot().context.selectedConditionId).toBe(conditionId);

    // Saving (clicking "Update") must NOT clear the auto condition filter/focus.
    send.mockClear();
    actor.send({ type: 'step.save', id: processorId! });

    const sentEventTypes = send.mock.calls.map(([event]) => event?.type);
    expect(sentEventTypes).not.toContain('simulation.clearAutoConditionFilter');
    expect(actor.getSnapshot().context.selectedConditionId).toBe(conditionId);

    actor.stop();
  });
});

