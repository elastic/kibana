/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, setup, sendParent, type ActorRefFrom, type SnapshotFrom, and } from 'xstate5';
import {
  checkAdditiveChanges,
  addDeterministicCustomIdentifiers,
  convertStepsForUI,
  validateStreamlang,
  StreamlangValidationError,
} from '@kbn/streamlang';
import type { StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import type { YamlModeContext, YamlModeInput, YamlModeEvent } from './types';

export type YamlModeActorRef = ActorRefFrom<typeof yamlModeMachine>;
export type YamlModeSnapshot = SnapshotFrom<typeof yamlModeMachine>;

export const yamlModeMachine = setup({
  types: {
    input: {} as YamlModeInput,
    context: {} as YamlModeContext,
    events: {} as YamlModeEvent,
  },
  actions: {
    updateDSL: assign(({ context }, params: { streamlangDSL: StreamlangDSL; yaml: string }) => {
      try {
        validateStreamlang(params.streamlangDSL);
        // Add deterministic identifiers to the DSL
        const dslWithIds = addDeterministicCustomIdentifiers(params.streamlangDSL);

        // Check if changes are purely additive
        const additiveChanges = checkAdditiveChanges(context.previousStreamlangDSL, dslWithIds);

        return {
          nextStreamlangDSL: dslWithIds,
          additiveChanges,
          errors: [],
        };
      } catch (error) {
        if (error instanceof StreamlangValidationError) {
          return {
            nextStreamlangDSL: params.streamlangDSL,
            additiveChanges: context.additiveChanges,
            errors: [...error.errors],
          };
        }
        throw error;
      }
    }),
    sendDSLToParent: ({ context }) => {
      context.parentRef.send({
        type: 'mode.dslUpdated',
        dsl: context.nextStreamlangDSL,
      });
    },
    setActiveDataSource: assign(
      (
        _,
        params: {
          simulationMode: YamlModeContext['simulationMode'];
        }
      ) => ({
        simulationMode: params.simulationMode,
      })
    ),
    sendStepsToSimulator: ({ context }, params?: { stepIdBreakpoint?: string }) => {
      const filterStepsUpToBreakpoint = (
        steps: ReturnType<typeof convertStepsForUI>,
        breakpoint?: string
      ) => {
        if (!breakpoint) {
          return steps;
        }

        const breakpointIndex = steps.findIndex((step) => step.customIdentifier === breakpoint);

        if (breakpointIndex === -1) {
          return steps;
        }

        return steps.slice(0, breakpointIndex + 1);
      };

      // A truly complete simulation
      if (context.simulationMode === 'complete') {
        const uiSteps = convertStepsForUI(context.nextStreamlangDSL);
        const stepsToSend = filterStepsUpToBreakpoint(uiSteps, params?.stepIdBreakpoint);
        context.parentRef.send({ type: 'simulation.updateSteps', steps: stepsToSend });
        return;
      }

      // Partial simulation mode, but steps are not purely additive. We cannot simulate.
      const newStepIds = context.additiveChanges.newStepIds ?? [];

      if (!context.additiveChanges.isPurelyAdditive || newStepIds.length === 0) {
        context.parentRef.send({ type: 'simulation.updateSteps', steps: [] });
        return;
      }

      const allSteps = convertStepsForUI(context.nextStreamlangDSL);
      const additiveIds = new Set(newStepIds);
      const parentLookup = new Map<string, string | null>();

      for (const step of allSteps) {
        if (step.customIdentifier) {
          parentLookup.set(step.customIdentifier, step.parentId ?? null);
        }
      }

      for (const id of newStepIds) {
        let current = parentLookup.get(id);
        while (current) {
          if (!additiveIds.has(current)) {
            additiveIds.add(current);
          }
          current = parentLookup.get(current);
        }
      }

      const additiveSteps = allSteps.filter((step) =>
        step.customIdentifier ? additiveIds.has(step.customIdentifier) : false
      );

      const stepsToSend = filterStepsUpToBreakpoint(additiveSteps, params?.stepIdBreakpoint);

      context.parentRef.send({ type: 'simulation.updateSteps', steps: stepsToSend });
    },
  },
  guards: {
    hasSimulatePrivileges: ({ context }) => {
      return context.privileges.simulate;
    },
    hasStagedChanges: ({ context }) => {
      const { additiveChanges } = context;

      // Check if there are any changes (either additive or non-additive)
      return !additiveChanges.isPurelyAdditive || (additiveChanges.newStepIds?.length ?? 0) > 0;
    },
    canSimulate: ({ context }) => {
      return (
        context.errors.length === 0 &&
        (context.simulationMode === 'complete' ||
          (context.additiveChanges.isPurelyAdditive &&
            (context.additiveChanges.newStepIds?.length ?? 0) > 0))
      );
    },
    isValidDSL: ({ context }) => {
      return context.errors.length === 0;
    },
  },
}).createMachine({
  id: 'yamlMode',
  context: ({ input }) => ({
    nextStreamlangDSL: input.nextStreamlangDSL,
    previousStreamlangDSL: input.previousStreamlangDSL,
    additiveChanges: checkAdditiveChanges(input.previousStreamlangDSL, input.nextStreamlangDSL),
    parentRef: input.parentRef,
    errors: [],
    privileges: input.privileges,
    simulationMode: input.simulationMode,
  }),
  initial: 'editing',
  on: {
    'dataSource.activeChanged': {
      actions: [
        {
          type: 'setActiveDataSource',
          params: ({ event }) => event,
        },
        { type: 'sendStepsToSimulator' },
      ],
    },
  },
  states: {
    editing: {
      entry: 'sendStepsToSimulator',
      on: {
        'yaml.contentChanged': {
          guard: 'hasSimulatePrivileges',
          actions: [
            { type: 'updateDSL', params: ({ event }) => event },
            { type: 'sendDSLToParent' },
            sendParent({ type: 'simulation.reset' }),
          ],
        },
        'yaml.runSimulation': {
          guard: and(['hasSimulatePrivileges', 'canSimulate']),
          actions: {
            type: 'sendStepsToSimulator',
            params: ({ event }) => ({ stepIdBreakpoint: event.stepIdBreakpoint }),
          },
        },
      },
    },
  },
});
