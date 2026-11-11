/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, setup, type ActorRefFrom, type SnapshotFrom } from 'xstate';
import isEqual from 'lodash/isEqual';
import type { JsonModeContext, JsonModeEvent, JsonModeInput } from './types';

export const jsonModeMachine = setup({
  types: {
    input: {} as JsonModeInput,
    context: {} as JsonModeContext,
    events: {} as JsonModeEvent,
  },
  actions: {
    updateDefinition: assign(({ event }) => {
      if (event.type !== 'mode.definitionUpdated' && event.type !== 'json.contentChanged') {
        return {};
      }

      return {
        nextPipelineDefinition:
          event.type === 'mode.definitionUpdated' ? event.definition : event.pipelineDefinition,
      };
    }),
    updateSimulationMode: assign(({ event }) => {
      if (event.type !== 'dataSource.activeChanged') {
        return {};
      }

      return {
        simulationMode: event.simulationMode,
      };
    }),
    updateSchemaErrors: assign(({ event }) => {
      if (event.type !== 'mode.schemaErrorsChanged') {
        return {};
      }

      return {
        schemaErrors: event.errors,
      };
    }),
    sendDefinitionToParent: ({ context }) => {
      context.parentRef.send({
        type: 'mode.definitionUpdated',
        definition: context.nextPipelineDefinition,
      });
    },
    sendStepsToSimulator: ({ context, event }) => {
      context.parentRef.send({
        type: 'simulation.updateSteps',
        steps: getSimulatableSteps(
          context,
          event.type === 'json.runSimulation' ? event.stepIdBreakpoint : undefined
        ),
      });
    },
  },
  guards: {
    canSimulate: ({ context }) => {
      if (
        context.schemaErrors.length > 0 ||
        context.validationErrors.size > 0 ||
        !context.privileges.simulate
      ) {
        return false;
      }

      const additiveChanges = getAdditiveChanges(context);

      return (
        context.simulationMode === 'complete' ||
        (additiveChanges.isPurelyAdditive && additiveChanges.newStepIds.length > 0)
      );
    },
  },
}).createMachine({
  id: 'jsonMode',
  initial: 'editing',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    previousPipelineDefinition: input.previousPipelineDefinition,
    nextPipelineDefinition: input.nextPipelineDefinition,
    simulationMode: input.simulationMode,
    privileges: input.privileges,
    schemaErrors: input.schemaErrors,
    validationErrors: input.validationErrors,
  }),
  on: {
    'dataSource.activeChanged': {
      actions: ['updateSimulationMode', 'sendStepsToSimulator'],
    },
    'mode.schemaErrorsChanged': {
      actions: 'updateSchemaErrors',
    },
  },
  states: {
    editing: {
      on: {
        'mode.definitionUpdated': {
          actions: 'updateDefinition',
        },
        'json.contentChanged': {
          actions: ['updateDefinition', 'sendDefinitionToParent'],
        },
        'json.runSimulation': {
          guard: 'canSimulate',
          actions: 'sendStepsToSimulator',
        },
      },
    },
  },
});

const getAdditiveChanges = (context: JsonModeContext) => {
  const previousSteps = context.previousPipelineDefinition.steps;
  const nextSteps = context.nextPipelineDefinition.steps;

  if (nextSteps.length < previousSteps.length) {
    return { isPurelyAdditive: false, newStepIds: [] };
  }

  const previousStepsUnchanged = previousSteps.every((previousStep, index) =>
    isEqual(previousStep, nextSteps[index])
  );

  if (!previousStepsUnchanged) {
    return { isPurelyAdditive: false, newStepIds: [] };
  }

  const persistedIds = new Set(previousSteps.map((step) => step.customIdentifier));
  const newStepIds = nextSteps
    .map((step) => step.customIdentifier)
    .filter((stepId) => !persistedIds.has(stepId));

  return { isPurelyAdditive: true, newStepIds };
};

const getSimulatableSteps = (context: JsonModeContext, stepIdBreakpoint?: string) => {
  const additiveChanges = getAdditiveChanges(context);
  const steps =
    context.simulationMode === 'complete'
      ? context.nextPipelineDefinition.steps
      : additiveChanges.isPurelyAdditive
      ? context.nextPipelineDefinition.steps.filter((step) =>
          additiveChanges.newStepIds.includes(step.customIdentifier)
        )
      : [];

  return getStepsUpToBreakpoint(steps, stepIdBreakpoint);
};

const getStepsUpToBreakpoint = (
  steps: JsonModeContext['nextPipelineDefinition']['steps'],
  stepIdBreakpoint?: string
) => {
  if (!stepIdBreakpoint) {
    return steps;
  }

  const breakpointIndex = steps.findIndex((step) => step.customIdentifier === stepIdBreakpoint);
  return breakpointIndex === -1 ? steps : steps.slice(0, breakpointIndex + 1);
};

export type JsonModeActorRef = ActorRefFrom<typeof jsonModeMachine>;
export type JsonModeSnapshot = SnapshotFrom<typeof jsonModeMachine>;
