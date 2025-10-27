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
      const { isValid, errors } = validateStreamlang(params.streamlangDSL);

      if (isValid) {
        // Add deterministic identifiers to the DSL
        const dslWithIds = addDeterministicCustomIdentifiers(params.streamlangDSL);

        // Check if changes are purely additive
        const additiveChanges = checkAdditiveChanges(context.previousStreamlangDSL, dslWithIds);

        return {
          nextStreamlangDSL: dslWithIds,
          additiveChanges,
          errors: [],
        };
      } else {
        return {
          nextStreamlangDSL: params.streamlangDSL,
          additiveChanges: context.additiveChanges,
          errors: [...errors],
        };
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
      if (
        !context.additiveChanges.isPurelyAdditive ||
        context.additiveChanges.newSteps.length === 0
      ) {
        context.parentRef.send({ type: 'simulation.updateSteps', steps: [] });
        return;
      }

      const newStepsDsl: StreamlangDSL = {
        steps: context.additiveChanges.newSteps,
      };

      const uiSteps = convertStepsForUI(newStepsDsl);
      const stepsToSend = filterStepsUpToBreakpoint(uiSteps, params?.stepIdBreakpoint);

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
      return !additiveChanges.isPurelyAdditive || additiveChanges.newSteps.length > 0;
    },
    canSimulate: ({ context }) => {
      return (
        context.errors.length === 0 &&
        (context.simulationMode === 'complete' ||
          (context.additiveChanges.isPurelyAdditive && context.additiveChanges.newSteps.length > 0))
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
