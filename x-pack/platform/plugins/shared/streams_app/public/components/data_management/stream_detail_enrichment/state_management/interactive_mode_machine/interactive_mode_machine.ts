/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { htmlIdGenerator } from '@elastic/eui';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import {
  ALWAYS_CONDITION,
  convertStepsForUI,
  convertUIStepsToDSL,
  type StreamlangProcessorDefinition,
} from '@kbn/streamlang';
import type { StreamlangConditionBlock, StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import type { MachineImplementationsFrom } from 'xstate';
import {
  assertEvent,
  assign,
  enqueueActions,
  setup,
  stopChild,
  type ActorRefFrom,
  type SnapshotFrom,
} from 'xstate';
import { getDefaultGrokProcessor, stepConverter } from '../../utils';
import { selectPreviewRecords } from '../simulation_state_machine/selectors';
import { stepMachine } from '../steps_state_machine';
import type { StepParentActor } from '../steps_state_machine/types';
import { hasErrorsInParentSnapshot } from '../stream_enrichment_state_machine/selectors';
import {
  findInsertIndex,
  insertAtIndex,
  reorderSteps,
  reorderStepsByDragDrop,
} from '../stream_enrichment_state_machine/utils';
import { collectDescendantStepIds } from '../utils';
import { selectWhetherAnyProcessorBeforePersisted } from './selectors';
import {
  createNotifySuggestionFailureNotifier,
  createSuggestPipelineActor,
} from './suggest_pipeline_actor';
import type {
  InteractiveModeContext,
  InteractiveModeEvent,
  InteractiveModeInput,
  InteractiveModeMachineDeps,
} from './types';
import {
  getActiveDataSourceSamplesFromParent,
  getStepsForSimulation,
  spawnStep,
  type StepSpawner,
} from './utils';
import { isNoSuggestionsError } from '../../steps/blocks/action/utils/no_suggestions_error';

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
    suggestPipeline: getPlaceholderFor(createSuggestPipelineActor),
  },
  actions: {
    notifySuggestionFailure: (_, __: { event: { error: unknown } }) => {},
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
        const newProcessorRef = spawnStep(
          convertedProcessor,
          parentRef,
          assignArgs.spawn as StepSpawner,
          assignArgs.context.grokCollection,
          { isNew: true }
        );
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
        assignArgs.spawn as StepSpawner,
        assignArgs.context.grokCollection,
        { isNew: true }
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
          condition?: StreamlangConditionBlock;
          options?: { parentId: StreamlangStepWithUIAttributes['parentId'] };
        }
      ) => {
        if (!condition) {
          condition = {
            condition: {
              ...ALWAYS_CONDITION,
              steps: [],
            },
          };
        }

        const conversionOptions = options ?? { parentId: null };
        const convertedCondition = stepConverter.toUIDefinition(condition, conversionOptions);

        const parentRef: StepParentActor = assignArgs.self;
        const newProcessorRef = spawnStep(
          convertedCondition,
          parentRef,
          assignArgs.spawn as StepSpawner,
          assignArgs.context.grokCollection,
          { isNew: true }
        );
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
      const steps = context.stepRefs.map((ref) => ref.getSnapshot().context.step);
      const idsToDelete = collectDescendantStepIds(steps, params.id);
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
    reorderStepsByDragDrop: enqueueActions(
      (
        { context, enqueue },
        params: {
          sourceStepId: string;
          targetStepId: string;
          operation: 'before' | 'after' | 'inside';
        }
      ) => {
        const steps = context.stepRefs.map((ref) => ref.getSnapshot().context.step);
        const targetStep = steps.find((s) => s.customIdentifier === params.targetStepId);

        if (!targetStep) {
          return;
        }

        // Determine the new parentId for the source step
        let newParentId: string | null;

        // Nested inside a where block
        if (params.operation === 'inside') {
          newParentId = params.targetStepId;
        } else {
          // Use sibling's parentId
          newParentId = targetStep.parentId ?? null;
        }

        // Reorder the steps
        const reorderedStepRefs = reorderStepsByDragDrop(
          context.stepRefs,
          params.sourceStepId,
          params.targetStepId,
          params.operation
        );

        // Update context with reordered steps
        enqueue.assign({
          stepRefs: [...reorderedStepRefs],
        });

        // Update the source step actor's parentId
        const sourceStepRef = reorderedStepRefs.find((ref) => ref.id === params.sourceStepId);

        if (sourceStepRef) {
          const currentParentId = sourceStepRef.getSnapshot().context.step.parentId;

          if (currentParentId !== newParentId) {
            // Send event to child actor to update its parentId
            enqueue.sendTo(sourceStepRef, { type: 'step.changeParent', parentId: newParentId });
          }
        }
      }
    ),
    reassignSteps: assign(({ context }) => ({
      stepRefs: [...context.stepRefs],
    })),
    syncToDSL: ({ context }) => {
      // Maintain custom identifiers when syncing to DSL, we'll link to these for the validation errors in the top level machine.
      const dsl = convertUIStepsToDSL(
        context.stepRefs.map((stepRef) => {
          return stepRef.getSnapshot().context.step;
        }),
        false
      );

      context.parentRef.send({
        type: 'mode.dslUpdated',
        dsl,
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
      // Check parent for any errors (schema or validation) - don't simulate if there are errors
      if (hasErrorsInParentSnapshot(context.parentRef.getSnapshot())) {
        return;
      }
      const { simulationMode, selectedConditionId } = context;

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
          selectedConditionId,
        }),
      });
    }),
    storeConditionFilter: assign((_, params: { conditionId: string | undefined }) => {
      return {
        selectedConditionId: params.conditionId,
      };
    }),
    /* Pipeline suggestion actions */
    overwriteSteps: assign((assignArgs, params: { steps: StreamlangDSL['steps'] }) => {
      // Clean-up existing step refs
      assignArgs.context.stepRefs.forEach(stopChild);

      // Convert new steps to UI format and spawn new step refs
      // Mark as isNew: true so they're tracked as new additions
      // Mark as isUpdated: true so they skip draft and go to configured state (can be simulated)
      const uiSteps = convertStepsForUI({ steps: params.steps });

      const parentRef: StepParentActor = assignArgs.self;

      const stepRefs = uiSteps.map((step) => {
        return spawnStep(
          step,
          parentRef,
          assignArgs.spawn as StepSpawner,
          assignArgs.context.grokCollection,
          {
            isNew: true,
            isUpdated: true,
          }
        );
      });

      return {
        stepRefs,
      };
    }),
    storeSuggestedPipeline: assign((_, params: { pipeline: StreamlangDSL }) => ({
      suggestedPipeline: params.pipeline,
    })),
    clearSuggestion: assign({ suggestedPipeline: undefined }),
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
      return spawnStep(step, parentRef, spawn as StepSpawner, input.grokCollection, {
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
      streamName: input.streamName,
      suggestedPipeline: undefined,
      grokCollection: input.grokCollection,
    };
  },
  type: 'parallel',
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
    pipelineSuggestion: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'suggestion.generate': {
              guard: ({ context }) => context.stepRefs.length === 0,
              target: 'generatingSuggestion',
            },
          },
        },
        generatingSuggestion: {
          invoke: {
            id: 'suggestPipelineActor',
            src: 'suggestPipeline',
            input: ({ context, event }) => {
              assertEvent(event, ['suggestion.generate', 'suggestion.regenerate']);
              // Get preview documents from parent's data sources
              const documents = getActiveDataSourceSamplesFromParent(context);

              return {
                streamName: context.streamName,
                connectorId: event.connectorId,
                documents,
              };
            },
            onDone: {
              target: 'viewingSuggestion',
              actions: [
                {
                  type: 'storeSuggestedPipeline',
                  params: ({ event }) => ({ pipeline: event.output }),
                },
                {
                  type: 'overwriteSteps',
                  params: ({ event }) => ({ steps: event.output.steps }),
                },
              ],
            },
            onError: [
              {
                guard: ({ event }) => isNoSuggestionsError(event.error),
                target: 'noSuggestionsFound',
              },
              {
                target: 'idle',
                actions: [
                  {
                    type: 'notifySuggestionFailure',
                    params: ({ event }: { event: { error: unknown } }) => ({ event }),
                  },
                ],
              },
            ],
          },
          on: {
            'suggestion.cancel': {
              target: 'idle',
              actions: [
                { type: 'clearSuggestion' },
                {
                  type: 'overwriteSteps',
                  params: () => ({ steps: [] }),
                },
                { type: 'syncToDSL' },
                { type: 'sendStepsToSimulator' },
              ],
            },
          },
        },
        noSuggestionsFound: {
          on: {
            'suggestion.generate': {
              target: 'generatingSuggestion',
            },
            'suggestion.dismiss': {
              target: 'idle',
            },
          },
        },
        viewingSuggestion: {
          entry: [{ type: 'syncToDSL' }, { type: 'sendStepsToSimulator' }],
          on: {
            'suggestion.accept': {
              target: 'idle',
              actions: [{ type: 'syncToDSL' }, { type: 'clearSuggestion' }],
            },
            'suggestion.dismiss': {
              target: 'idle',
              actions: [
                { type: 'clearSuggestion' },
                {
                  type: 'overwriteSteps',
                  params: () => ({ steps: [] }),
                },
                { type: 'syncToDSL' },
                { type: 'sendStepsToSimulator' },
              ],
            },
            'suggestion.regenerate': {
              target: 'generatingSuggestion',
              actions: [
                { type: 'clearSuggestion' },
                {
                  type: 'overwriteSteps',
                  params: () => ({ steps: [] }),
                },
                { type: 'syncToDSL' },
                { type: 'sendStepsToSimulator' },
              ],
            },
          },
        },
      },
    },
    steps: {
      initial: 'idle',
      states: {
        idle: {
          entry: [{ type: 'syncToDSL' }, { type: 'sendStepsToSimulator' }],
          on: {
            'step.change': {
              actions: [
                { type: 'reassignSteps' },
                { type: 'sendStepsToSimulator', params: ({ event }) => event },
              ],
            },
            'step.parentChanged': {
              actions: [
                { type: 'reassignSteps' },
                { type: 'syncToDSL' },
                { type: 'sendStepsToSimulator', params: ({ event }) => event },
              ],
            },
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
            'step.reorderByDragDrop': {
              guard: 'hasSimulatePrivileges',
              actions: [{ type: 'reorderStepsByDragDrop', params: ({ event }) => event }],
              target: 'idle',
              reenter: true,
              // Re-enter to trigger syncToDSL for sibling reordering.
              // If parent changes, child will also send a step.parentChanged event (additional sync but safe).
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
            'step.resetSteps': {
              guard: 'hasManagePrivileges',
              actions: [
                { type: 'overwriteSteps', params: ({ event }) => event },
                { type: 'sendStepsToSimulator' },
              ],
            },
            'step.filterByCondition': {
              actions: [
                { type: 'storeConditionFilter', params: ({ event }) => event },
                {
                  type: 'sendStepsToSimulator',
                },
              ],
            },
            'step.clearConditionFilter': {
              actions: [
                { type: 'storeConditionFilter', params: () => ({ conditionId: undefined }) },
                {
                  type: 'sendStepsToSimulator',
                },
              ],
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
    },
  },
});

export const createInteractiveModeMachineImplementations = ({
  streamsRepositoryClient,
  toasts,
  telemetryClient,
  notifications,
}: InteractiveModeMachineDeps): MachineImplementationsFrom<typeof interactiveModeMachine> => ({
  actors: {
    suggestPipeline: createSuggestPipelineActor({
      streamsRepositoryClient,
      telemetryClient,
      notifications,
    }),
  },
  actions: {
    notifySuggestionFailure: createNotifySuggestionFailureNotifier({ toasts }),
  },
});
