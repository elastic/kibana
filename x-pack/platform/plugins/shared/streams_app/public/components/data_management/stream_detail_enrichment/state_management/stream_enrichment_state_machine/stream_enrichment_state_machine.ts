/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MachineImplementationsFrom, ActorRefFrom, SnapshotFrom } from 'xstate5';
import {
  assign,
  enqueueActions,
  forwardTo,
  setup,
  sendTo,
  stopChild,
  and,
  raise,
  cancel,
  stateIn,
} from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import type { Streams } from '@kbn/streams-schema';
import { GrokCollection } from '@kbn/grok-ui';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import {
  ALWAYS_CONDITION,
  convertStepsForUI,
  type StreamlangProcessorDefinition,
} from '@kbn/streamlang';
import type { StreamlangWhereBlock } from '@kbn/streamlang/types/streamlang';
import type { EnrichmentDataSource, EnrichmentUrlState } from '../../../../../../common/url_schema';
import { getStreamTypeFromDefinition } from '../../../../../util/get_stream_type_from_definition';
import type {
  StreamEnrichmentContextType,
  StreamEnrichmentEvent,
  StreamEnrichmentInput,
  StreamEnrichmentServiceDependencies,
} from './types';
import { getDefaultGrokProcessor, stepConverter } from '../../utils';
import {
  createUpsertStreamActor,
  createUpsertStreamFailureNofitier,
  createUpsertStreamSuccessNofitier,
} from './upsert_stream_actor';

import {
  simulationMachine,
  createSimulationMachineImplementations,
} from '../simulation_state_machine';
import {
  validationMachine,
  createValidationMachineImplementations,
} from '../validation_state_machine/validation_state_machine';
import { stepMachine } from '../steps_state_machine';
import {
  collectDescendantIds,
  defaultEnrichmentUrlState,
  findInsertIndex,
  getConfiguredSteps,
  getDataSourcesSamples,
  getDataSourcesUrlState,
  getUpsertFields,
  getStepsForSimulation,
  insertAtIndex,
  spawnDataSource,
  spawnStep,
  reorderSteps,
} from './utils';
import { createUrlInitializerActor, createUrlSyncAction } from './url_state_actor';
import {
  createDataSourceMachineImplementations,
  dataSourceMachine,
} from '../data_source_state_machine';
import { setupGrokCollectionActor } from './setup_grok_collection_actor';
import { selectPreviewRecords } from '../simulation_state_machine/selectors';
import { selectWhetherAnyProcessorBeforePersisted } from './selectors';

export type StreamEnrichmentActorRef = ActorRefFrom<typeof streamEnrichmentMachine>;
export type StreamEnrichmentActorSnapshot = SnapshotFrom<typeof streamEnrichmentMachine>;

export const streamEnrichmentMachine = setup({
  types: {
    input: {} as StreamEnrichmentInput,
    context: {} as StreamEnrichmentContextType,
    events: {} as StreamEnrichmentEvent,
  },
  actors: {
    initializeUrl: getPlaceholderFor(createUrlInitializerActor),
    upsertStream: getPlaceholderFor(createUpsertStreamActor),
    dataSourceMachine: getPlaceholderFor(() => dataSourceMachine),
    setupGrokCollection: getPlaceholderFor(setupGrokCollectionActor),
    stepMachine: getPlaceholderFor(() => stepMachine),
    simulationMachine: getPlaceholderFor(() => simulationMachine),
    validationMachine: getPlaceholderFor(() => validationMachine),
  },
  actions: {
    notifyUpsertStreamSuccess: getPlaceholderFor(createUpsertStreamSuccessNofitier),
    notifyUpsertStreamFailure: getPlaceholderFor(createUpsertStreamFailureNofitier),
    refreshDefinition: () => {},
    /* URL state actions */
    storeUrlState: assign((_, params: { urlState: EnrichmentUrlState }) => ({
      urlState: params.urlState,
    })),
    syncUrlState: getPlaceholderFor(createUrlSyncAction),
    storeDefinition: assign((_, params: { definition: Streams.ingest.all.GetResponse }) => ({
      definition: params.definition,
    })),
    /* Steps actions */
    setupSteps: assign(({ context, spawn, self }) => {
      // Clean-up pre-existing steps
      context.stepRefs.forEach(stopChild);
      // Setup processors from the stream definition
      const uiSteps = convertStepsForUI(context.definition.stream.ingest.processing);
      const stepRefs = uiSteps.map((step) => {
        return spawnStep(step, { self, spawn });
      });

      return {
        initialStepRefs: stepRefs,
        stepRefs,
      };
    }),
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
          processor = getDefaultGrokProcessor({
            sampleDocs: selectPreviewRecords(assignArgs.context.simulatorRef.getSnapshot().context),
          });
        }

        const conversionOptions = options ?? { parentId: null };
        const convertedProcessor = stepConverter.toUIDefinition(processor, conversionOptions);

        const newProcessorRef = spawnStep(convertedProcessor, assignArgs, { isNew: true });
        const insertIndex = findInsertIndex(
          assignArgs.context.stepRefs,
          conversionOptions.parentId
        );

        return {
          stepRefs: insertAtIndex(assignArgs.context.stepRefs, newProcessorRef, insertIndex),
        };
      }
    ),
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

        const newProcessorRef = spawnStep(convertedCondition, assignArgs, { isNew: true });
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
    /* Data sources actions */
    setupDataSources: assign((assignArgs) => ({
      dataSourcesRefs: assignArgs.context.urlState.dataSources.map((dataSource) =>
        spawnDataSource(dataSource, assignArgs)
      ),
    })),
    addDataSource: assign((assignArgs, { dataSource }: { dataSource: EnrichmentDataSource }) => {
      const newDataSourceRef = spawnDataSource(dataSource, assignArgs);

      return {
        dataSourcesRefs: [newDataSourceRef, ...assignArgs.context.dataSourcesRefs],
      };
    }),
    deleteDataSource: assign(({ context }, params: { id: string }) => ({
      dataSourcesRefs: context.dataSourcesRefs.filter((proc) => proc.id !== params.id),
    })),
    refreshDataSources: ({ context }) => {
      context.dataSourcesRefs.forEach((dataSourceRef) =>
        dataSourceRef.send({ type: 'dataSource.refresh' })
      );
    },
    /* @ts-expect-error The error is thrown because the type of the event is not inferred correctly when using enqueueActions during setup */
    sendStepsEventToSimulator: enqueueActions(
      ({ context, enqueue }, params: { type: StreamEnrichmentEvent['type'] }) => {
        /**
         * When any processor is before persisted, we need to reset the simulator
         * because the processors are not in a valid order.
         * If the order allows it, notify the simulator to run the simulation based on the received event.
         */
        if (selectWhetherAnyProcessorBeforePersisted(context)) {
          enqueue('sendResetEventToSimulator');
        } else {
          enqueue.sendTo('simulator', {
            type: params.type,
            steps: getStepsForSimulation({ stepRefs: context.stepRefs }),
          });
        }
      }
    ),
    sendDataSourcesSamplesToSimulator: sendTo(
      'simulator',
      ({ context }) => ({
        type: 'simulation.receive_samples',
        samples: getDataSourcesSamples(context),
      }),
      { delay: 800, id: 'send-samples-to-simulator' }
    ),
    sendResetEventToSimulator: sendTo('simulator', { type: 'simulation.reset' }),
    sendStepsToValidator: sendTo('validator', ({ context }) => ({
      type: 'validation.updateSteps',
      steps: getStepsForSimulation({ stepRefs: context.stepRefs, includeExistingSteps: true }),
    })),
    triggerValidation: sendTo('validator', { type: 'validation.trigger' }),
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
    hasManagePrivileges: ({ context }) => context.definition.privileges.manage,
    hasSimulatePrivileges: ({ context }) => context.definition.privileges.simulate,
    canUpdateStream: and(['hasStagedChanges', stateIn('#managingProcessors.idle')]),
    isStagedStep: ({ context }, params: { id: string }) => {
      const stepRef = context.stepRefs.find((p) => p.id === params.id);

      if (!stepRef) return false;
      return stepRef.getSnapshot().context.isNew;
    },
  },
}).createMachine({
  id: 'enrichStream',
  context: ({ input, spawn }) => ({
    definition: input.definition,
    dataSourcesRefs: [],
    grokCollection: new GrokCollection(),
    initialStepRefs: [],
    stepRefs: [],
    urlState: defaultEnrichmentUrlState,
    simulatorRef: spawn('simulationMachine', {
      id: 'simulator',
      input: {
        steps: [],
        streamName: input.definition.stream.name,
        streamType: getStreamTypeFromDefinition(input.definition.stream),
      },
    }),
    validatorRef: spawn('validationMachine', {
      id: 'validator',
      input: {
        steps: [],
        streamName: input.definition.stream.name,
      },
    }),
  }),
  initial: 'initializingFromUrl',
  on: {},
  states: {
    initializingFromUrl: {
      invoke: {
        src: 'initializeUrl',
      },
      on: {
        'url.initialized': {
          actions: [
            { type: 'storeUrlState', params: ({ event }) => event },
            { type: 'syncUrlState' },
          ],
          target: 'setupGrokCollection',
        },
      },
    },
    setupGrokCollection: {
      invoke: {
        id: 'setupGrokCollection',
        src: 'setupGrokCollection',
        input: ({ context }) => ({
          grokCollection: context.grokCollection,
        }),
        onDone: 'ready',
        onError: 'grokCollectionFailure',
      },
    },
    grokCollectionFailure: {},
    ready: {
      id: 'ready',
      type: 'parallel',
      entry: [{ type: 'setupSteps' }, { type: 'setupDataSources' }],
      on: {
        'stream.received': {
          target: '#ready',
          actions: [
            { type: 'storeDefinition', params: ({ event }) => event },
            { type: 'sendResetEventToSimulator' },
          ],
          reenter: true,
        },
      },
      states: {
        stream: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                'stream.reset': {
                  guard: 'hasStagedChanges',
                  target: '#ready',
                  actions: [{ type: 'sendResetEventToSimulator' }],
                  reenter: true,
                },
                'stream.update': {
                  guard: 'canUpdateStream',
                  actions: [raise({ type: 'simulation.viewDataPreview' })],
                  target: 'updating',
                },
              },
            },
            updating: {
              invoke: {
                id: 'upsertStreamActor',
                src: 'upsertStream',
                input: ({ context }) => ({
                  definition: context.definition,
                  steps: getConfiguredSteps(context),
                  fields: getUpsertFields(context),
                }),
                onDone: {
                  target: 'idle',
                  actions: [
                    { type: 'sendResetEventToSimulator' },
                    { type: 'notifyUpsertStreamSuccess' },
                    { type: 'refreshDefinition' },
                  ],
                },
                onError: {
                  target: 'idle',
                  actions: [{ type: 'notifyUpsertStreamFailure' }],
                },
              },
            },
          },
        },
        enrichment: {
          type: 'parallel',
          on: {
            'url.sync': {
              actions: [
                {
                  type: 'storeUrlState',
                  params: ({ context }) => ({
                    urlState: { v: 1, dataSources: getDataSourcesUrlState(context) },
                  }),
                },
                { type: 'syncUrlState' },
              ],
            },
            'dataSource.change': {
              actions: raise({ type: 'url.sync' }),
            },
            'dataSource.dataChange': {
              actions: [
                cancel('send-samples-to-simulator'), // Debounce samples sent to simulator on multiple data sources retrieval
                { type: 'sendDataSourcesSamplesToSimulator' },
              ],
            },
          },
          states: {
            displayingSimulation: {
              initial: 'viewDataPreview',
              on: {
                'simulation.refresh': {
                  actions: [{ type: 'refreshDataSources' }],
                },
              },
              states: {
                viewDataPreview: {
                  on: {
                    'simulation.viewDetectedFields': 'viewDetectedFields',
                    'simulation.changePreviewDocsFilter': {
                      actions: forwardTo('simulator'),
                    },
                    'previewColumns.*': {
                      actions: forwardTo('simulator'),
                    },
                  },
                },
                viewDetectedFields: {
                  on: {
                    'simulation.viewDataPreview': 'viewDataPreview',
                    'simulation.fields.*': {
                      actions: forwardTo('simulator'),
                    },
                  },
                },
              },
            },
            managingDataSources: {
              initial: 'closed',
              states: {
                closed: {
                  on: {
                    'dataSources.openManagement': 'open',
                  },
                },
                open: {
                  on: {
                    'dataSources.closeManagement': 'closed',
                    'dataSources.add': {
                      actions: [
                        { type: 'addDataSource', params: ({ event }) => event },
                        raise({ type: 'url.sync' }),
                      ],
                    },
                    'dataSource.delete': {
                      actions: [
                        stopChild(({ event }) => event.id),
                        { type: 'deleteDataSource', params: ({ event }) => event },
                        raise({ type: 'url.sync' }),
                      ],
                    },
                  },
                },
              },
            },
            managingProcessors: {
              id: 'managingProcessors',
              initial: 'idle',
              states: {
                idle: {
                  entry: [
                    { type: 'sendStepsEventToSimulator', params: ({ event }) => event },
                    { type: 'sendStepsToValidator' },
                  ],
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
                        { type: 'sendStepsEventToSimulator', params: ({ event }) => event },
                      ],
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
                  id: 'creatingStep',
                  entry: [
                    { type: 'sendStepsEventToSimulator', params: ({ event }) => event },
                    { type: 'sendStepsToValidator' },
                  ],
                  on: {
                    'step.change': {
                      actions: [
                        { type: 'reassignSteps' },
                        { type: 'sendStepsEventToSimulator', params: ({ event }) => event },
                        { type: 'sendStepsToValidator' },
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
                      actions: [{ type: 'reassignSteps' }],
                    },
                  },
                },
                editing: {
                  id: 'editingStep',
                  entry: [
                    { type: 'sendStepsEventToSimulator', params: ({ event }) => event },
                    { type: 'sendStepsToValidator' },
                  ],
                  on: {
                    'step.change': {
                      actions: [
                        { type: 'sendStepsEventToSimulator', params: ({ event }) => event },
                        { type: 'sendStepsToValidator' },
                      ],
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
                      actions: [{ type: 'reassignSteps' }],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

export const createStreamEnrichmentMachineImplementations = ({
  refreshDefinition,
  streamsRepositoryClient,
  core,
  data,
  urlStateStorageContainer,
  telemetryClient,
}: StreamEnrichmentServiceDependencies): MachineImplementationsFrom<
  typeof streamEnrichmentMachine
> => ({
  actors: {
    initializeUrl: createUrlInitializerActor({ core, urlStateStorageContainer }),
    upsertStream: createUpsertStreamActor({ streamsRepositoryClient, telemetryClient }),
    setupGrokCollection: setupGrokCollectionActor(),
    stepMachine,
    dataSourceMachine: dataSourceMachine.provide(
      createDataSourceMachineImplementations({ data, toasts: core.notifications.toasts })
    ),
    simulationMachine: simulationMachine.provide(
      createSimulationMachineImplementations({
        data,
        streamsRepositoryClient,
        toasts: core.notifications.toasts,
      })
    ),
    validationMachine: validationMachine.provide(
      createValidationMachineImplementations({
        streamsRepositoryClient,
        toasts: core.notifications.toasts,
      })
    ),
  },
  actions: {
    refreshDefinition,
    syncUrlState: createUrlSyncAction({ urlStateStorageContainer }),
    notifyUpsertStreamSuccess: createUpsertStreamSuccessNofitier({
      toasts: core.notifications.toasts,
    }),
    notifyUpsertStreamFailure: createUpsertStreamFailureNofitier({
      toasts: core.notifications.toasts,
    }),
  },
});
