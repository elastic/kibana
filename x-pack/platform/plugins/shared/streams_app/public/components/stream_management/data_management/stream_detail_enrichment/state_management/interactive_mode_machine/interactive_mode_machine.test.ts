/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokCollection } from '@kbn/grok-ui';
import { ALWAYS_CONDITION, type StreamlangProcessorDefinition } from '@kbn/streamlang';
import type { StreamlangConditionBlock, StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import { createActor } from 'xstate';
import { interactiveModeMachine } from './interactive_mode_machine';
import type { InteractiveModeParentRef } from './types';

// Mock htmlIdGenerator to return unique IDs (the default EUI test-env mock returns
// the same 'generated-id' for all calls, which breaks tests that create multiple steps)
let mockIdCounter = 0;
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  htmlIdGenerator: () => () => `test-id-${mockIdCounter++}`,
}));

const createParentRef = () => {
  const send = jest.fn();

  const mockSimulatorRef = {
    getSnapshot: () => ({
      context: {
        samples: [],
        previewDocsFilter: undefined,
        simulation: undefined,
        selectedConditionId: undefined,
      },
    }),
  };

  const parentRef: InteractiveModeParentRef = {
    send,
    getSnapshot: () => ({
      context: {
        // Only required for some actions (e.g. default processor creation); keep minimal for this test.
        simulatorRef: mockSimulatorRef as unknown as ReturnType<
          InteractiveModeParentRef['getSnapshot']
        >['context']['simulatorRef'],
        dataSourcesRefs: [],
        schemaErrors: [],
        validationErrors: new Map(),
      },
    }),
  };

  return { parentRef, send };
};

describe('interactiveModeMachine condition focus behavior', () => {
  beforeEach(() => {
    // Reset the ID counter before each test
    mockIdCounter = 0;
  });

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
        grokCollection: { setCustomPatterns: jest.fn() } as unknown as GrokCollection,
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

    // Find the condition stepRef and save it (send to child, not parent)
    const conditionStepRef = actor
      .getSnapshot()
      .context.stepRefs.find((ref) => ref.id === conditionId);
    expect(conditionStepRef).toBeDefined();
    conditionStepRef!.send({ type: 'step.save' });

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

    // Find the processor stepRef
    const processorStepRef = actor.getSnapshot().context.stepRefs.find((ref) => {
      const { step } = ref.getSnapshot().context;
      return 'action' in step && step.action === 'set' && step.parentId === conditionId;
    });

    expect(processorStepRef).toBeDefined();
    const processorId = processorStepRef!.id;

    // Save the processor (send to child)
    processorStepRef!.send({ type: 'step.save' });

    // Start editing; the machine should auto-select the parent condition via a parent event.
    send.mockClear();
    actor.send({ type: 'step.edit', id: processorId });

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
    // Send save to the child stepRef (this is how the UI does it)
    processorStepRef!.send({ type: 'step.save' });

    const sentEventTypes = send.mock.calls.map(([event]) => event?.type);
    expect(sentEventTypes).not.toContain('simulation.clearAutoConditionFilter');
    expect(actor.getSnapshot().context.selectedConditionId).toBe(conditionId);

    actor.stop();
  });
});
