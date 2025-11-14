/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { htmlIdGenerator } from '@elastic/eui';
import {
  assign,
  setup,
  stopChild,
  enqueueActions,
  type ActorRefFrom,
  type SnapshotFrom,
} from 'xstate5';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import {
  ALWAYS_CONDITION,
  type StreamlangProcessorDefinition,
  convertUIStepsToDSL,
  addDeterministicCustomIdentifiers,
  convertStepsForUI,
} from '@kbn/streamlang';
import type { StreamlangWhereBlock } from '@kbn/streamlang/types/streamlang';
import { stepMachine } from '../steps_state_machine';
import { getDefaultGrokProcessor, stepConverter } from '../../utils';
import {
  collectDescendantIds,
  findInsertIndex,
  insertAtIndex,
  reorderSteps,
} from '../stream_enrichment_state_machine/utils';
import type { InteractiveModeContext, InteractiveModeInput, InteractiveModeEvent } from './types';
import { getStepsForSimulation, spawnStep } from './utils';
import { selectWhetherAnyProcessorBeforePersisted } from './selectors';
import { selectPreviewRecords } from '../simulation_state_machine/selectors';
import type { StepParentActor } from '../steps_state_machine/types';

export type InteractiveModeActorRef = ActorRefFrom<typeof interactiveModeMachine>;
export type InteractiveModeSnapshot = SnapshotFrom<typeof interactiveModeMachine>;

const createId = htmlIdGenerator();

export const interactiveModeMachine = setup({
  types: {
    input: {} as InteractiveModeInput,
    context: {} as InteractiveModeContext,
    events: {} as InteractiveModeEvent,
  },
  actors: {
    stepMachine,
  },
  actions: {
    addProcessor: assign(
      (
        assignArgs,
        {
          processor,
          options,
        }: {
          processor?: StreamlangProcessorDefinition;
          options?: { parentId: StreamlangStepWithUIAttributes['parentId'] };
        }
      ) => {
        if (!processor) {
          const previewRecords = selectPreviewRecords(
            assignArgs.context.parentRef.getSnapshot().context.simulatorRef.getSnapshot().context
          );
          processor = getDefaultGrokProcessor({ sampleDocs: previewRecords });
        }

        const conversionOptions = options ?? { parentId: null };
        const convertedProcessor = stepConverter.toUIDefinition(processor, conversionOptions);

        const parentRef: StepParentActor = assignArgs.self;
        const newProcessorRef = spawnStep(convertedProcessor, parentRef, assignArgs.spawn, {
          isNew: true,
        });
        const insertIndex = findInsertIndex(
          assignArgs.context.stepRefs,
          conversionOptions.parentId
        );

        return {
          stepRefs: insertAtIndex(assignArgs.context.stepRefs, newProcessorRef, insertIndex),
        };
      }
    ),
    duplicateProcessor: assign((assignArgs, params: { processorStepId: string }) => {
      const targetStepUIDefinition = assignArgs.context.stepRefs
        .map((stepRef) => stepRef.getSnapshot().context.step)
        .find((stepDefinition) => {
          return stepDefinition.customIdentifier === params.processorStepId;
        });

      if (!targetStepUIDefinition) {
        return {};
      }

      const parentId = targetStepUIDefinition.parentId;
      const parentRef: StepParentActor = assignArgs.self;
      const newProcessorRef = spawnStep(
        {
          ...targetStepUIDefinition,
          customIdentifier: createId(),
        },
        parentRef,
        assignArgs.spawn,
        {
          isNew: true,
        }
      );
      const insertIndex = findInsertIndex(assignArgs.context.stepRefs, parentId);

      return {
        stepRefs: insertAtIndex(assignArgs.context.stepRefs, newProcessorRef, insertIndex),
      };
    }),
    addCondition: assign(
      (
        assignArgs,
        {
          condition,
          options,
        }: {
          condition?: StreamlangWhereBlock;
          options?: { parentId: StreamlangStepWithUIAttributes['parentId'] };
        }
      ) => {
        if (!condition) {
          condition = {
            where: {
              ...ALWAYS_CONDITION,
              steps: [],
            },
          };
        }

        const conversionOptions = options ?? { parentId: null };
        const convertedCondition = stepConverter.toUIDefinition(condition, conversionOptions);

        const parentRef: StepParentActor = assignArgs.self;
        const newProcessorRef = spawnStep(convertedCondition, parentRef, assignArgs.spawn, {
          isNew: true,
        });
        const insertIndex = findInsertIndex(
          assignArgs.context.stepRefs,
          conversionOptions.parentId
        );

        return {
          stepRefs: insertAtIndex(assignArgs.context.stepRefs, newProcessorRef, insertIndex),
        };
      }
    ),
    deleteStep: assign(({ context }, params: { id: string }) => {
      const idsToDelete = collectDescendantIds(params.id, context.stepRefs);
      idsToDelete.add(params.id);
      return {
        stepRefs: context.stepRefs.filter((proc) => !idsToDelete.has(proc.id)),
      };
    }),
    reorderSteps: assign(({ context }, params: { stepId: string; direction: 'up' | 'down' }) => {
      return {
        stepRefs: [...reorderSteps(context.stepRefs, params.stepId, params.direction)],
      };
    }),
    reassignSteps: assign(({ context }) => ({
      stepRefs: [...context.stepRefs],
    })),
    syncToDSL: ({ context }) => {
      // Convert step refs to DSL and send to parent
      const dsl = convertUIStepsToDSL(
        context.stepRefs.map((stepRef) => {
          return stepRef.getSnapshot().context.step;
        })
      );
      const dslWithIdentifiers = addDeterministicCustomIdentifiers(dsl);

      context.parentRef.send({
        type: 'mode.dslUpdated',
        dsl: dslWithIdentifiers,
      });
    },
    setActiveDataSource: assign(
      (
        context,
        params: {
          simulationMode: InteractiveModeContext['simulationMode'];
        }
      ) => ({
        simulationMode: params.simulationMode,
      })
    ),
    sendStepsToSimulator: enqueueActions(({ context }) => {
      const { simulationMode } = context;

      if (simulationMode === 'partial' && selectWhetherAnyProcessorBeforePersisted(context)) {
        // Send reset to simulator via parent
        context.parentRef.send({ type: 'simulation.reset' });
        return;
      }

      // Send steps update to simulator via parent
      context.parentRef.send({
        type: 'simulation.updateSteps',
        steps: getStepsForSimulation({
          stepRefs: context.stepRefs,
          simulationMode,
        }),
      });
    }),
  },
  guards: {
    hasStagedChanges: ({ context }) => {
      const { initialStepRefs, stepRefs } = context;
      return (
        // Deleted steps
        initialStepRefs.length !== stepRefs.length ||
        // New/updated processors
        stepRefs.some((processorRef) => {
          const state = processorRef.getSnapshot();
          return state.matches('configured') && state.context.isUpdated;
        }) ||
        // Step order changed
        stepRefs.some((stepRef, pos) => initialStepRefs[pos]?.id !== stepRef.id)
      );
    },
    hasManagePrivileges: ({ context }) => {
      return context.privileges.manage;
    },
    hasSimulatePrivileges: ({ context }) => {
      return context.privileges.simulate;
    },
  },
}).createMachine({
  id: 'interactiveMode',
  context: ({ input, spawn, self }) => {
    const uiSteps = convertStepsForUI(input.dsl);
    const parentRef: StepParentActor = self;
    const stepRefs = uiSteps.map((step) => {
      // When switching from YAML mode new steps will be denoted in the input. These steps should be marked as
      // "new" and also "updated" (to mimic being fully configured in interactive mode). "new" alone would just
      // denote a draft state.
      const shouldBeMarkedAsNewAndUpdated = input.newStepIds.includes(step.customIdentifier);
      return spawnStep(step, parentRef, spawn, {
        isNew: shouldBeMarkedAsNewAndUpdated,
        isUpdated: shouldBeMarkedAsNewAndUpdated,
      });
    });

    return {
      stepRefs,
      initialStepRefs: stepRefs,
      parentRef: input.parentRef,
      privileges: input.privileges,
      simulationMode: input.simulationMode,
    };
  },
  initial: 'idle',
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
    idle: {
      entry: [{ type: 'syncToDSL' }, { type: 'sendStepsToSimulator' }],
      on: {
        'step.edit': {
          guard: 'hasSimulatePrivileges',
          target: 'editing',
        },
        'step.reorder': {
          guard: 'hasSimulatePrivileges',
          actions: [{ type: 'reorderSteps', params: ({ event }) => event }],
          target: 'idle',
          reenter: true,
        },
        'step.delete': {
          target: 'idle',
          guard: 'hasManagePrivileges',
          actions: [
            stopChild(({ event }) => event.id),
            { type: 'deleteStep', params: ({ event }) => event },
          ],
          reenter: true,
        },
        'step.duplicateProcessor': {
          target: 'creating',
          guard: 'hasManagePrivileges',
          actions: [{ type: 'duplicateProcessor', params: ({ event }) => event }],
        },
        'step.addProcessor': {
          guard: 'hasSimulatePrivileges',
          target: 'creating',
          actions: [{ type: 'addProcessor', params: ({ event }) => event }],
        },
        'step.addCondition': {
          guard: 'hasSimulatePrivileges',
          target: 'creating',
          actions: [{ type: 'addCondition', params: ({ event }) => event }],
        },
      },
    },
    creating: {
      entry: [{ type: 'syncToDSL' }, { type: 'sendStepsToSimulator' }],
      on: {
        'step.change': {
          actions: [
            { type: 'reassignSteps' },
            { type: 'syncToDSL' },
            { type: 'sendStepsToSimulator' },
          ],
        },
        'step.delete': {
          target: 'idle',
          guard: 'hasManagePrivileges',
          actions: [
            stopChild(({ event }) => event.id),
            { type: 'deleteStep', params: ({ event }) => event },
          ],
        },
        'step.save': {
          target: 'idle',
          actions: [{ type: 'reassignSteps' }, { type: 'syncToDSL' }],
        },
      },
    },
    editing: {
      entry: [{ type: 'syncToDSL' }, { type: 'sendStepsToSimulator' }],
      on: {
        'step.change': {
          actions: [{ type: 'syncToDSL' }, { type: 'sendStepsToSimulator' }],
        },
        'step.cancel': 'idle',
        'step.delete': {
          target: 'idle',
          guard: 'hasManagePrivileges',
          actions: [
            stopChild(({ event }) => event.id),
            { type: 'deleteStep', params: ({ event }) => event },
          ],
        },
        'step.save': {
          target: 'idle',
          actions: [{ type: 'reassignSteps' }, { type: 'syncToDSL' }],
        },
      },
    },
  },
});
