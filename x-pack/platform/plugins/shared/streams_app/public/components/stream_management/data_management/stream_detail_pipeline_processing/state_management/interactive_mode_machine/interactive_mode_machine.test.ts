/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { GrokCollection } from '@kbn/grok-ui';
import { createActor } from 'xstate';
import { interactiveModeMachine } from './interactive_mode_machine';
import type { InteractiveModeParentRef } from './types';
import type { PipelineProcessorsUiDefinition } from '../../types';

// Mock htmlIdGenerator to return unique IDs (the default EUI test-env mock returns
// the same 'generated-id' for all calls, which breaks tests that create multiple steps)
let mockIdCounter = 0;
vi.mock('@elastic/eui', async () => {
  const mocked = {
    ...(await vi.importActual('@elastic/eui')),
    htmlIdGenerator: () => () => `test-id-${mockIdCounter++}`,
  };
  return { ...mocked, default: mocked };
});

const createParentRef = () => {
  const send = vi.fn();

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

describe('interactiveModeMachine native pipeline definition behavior', () => {
  beforeEach(() => {
    // Reset the ID counter before each test
    mockIdCounter = 0;
  });

  it('loads native pipeline steps and syncs a native pipeline definition', () => {
    const { parentRef, send } = createParentRef();
    const definition: PipelineProcessorsUiDefinition = {
      steps: [
        {
          action: 'set',
          customIdentifier: 'set-step',
          parentId: null,
          field: 'foo',
          value: 'bar',
          override: true,
          ignore_failure: false,
        },
      ],
    };

    const actor = createActor(interactiveModeMachine, {
      input: {
        definition,
        newStepIds: [],
        parentRef,
        privileges: { manage: true, simulate: true },
        simulationMode: 'partial',
        streamName: 'test-stream',
        grokCollection: { setCustomPatterns: vi.fn() } as unknown as GrokCollection,
      },
    });

    actor.start();
    expect(actor.getSnapshot().context.stepRefs).toHaveLength(1);
    expect(actor.getSnapshot().context.stepRefs[0].getSnapshot().context.step).toEqual(
      definition.steps[0]
    );

    const syncEvent = send.mock.calls
      .map(([event]) => event)
      .find((event) => event?.type === 'mode.definitionUpdated') as
      | { type: 'mode.definitionUpdated'; definition: PipelineProcessorsUiDefinition }
      | undefined;

    expect(syncEvent?.definition).toEqual(definition);

    actor.stop();
  });
});
