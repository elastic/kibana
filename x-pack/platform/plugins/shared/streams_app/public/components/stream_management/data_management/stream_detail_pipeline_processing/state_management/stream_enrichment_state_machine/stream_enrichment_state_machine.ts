/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isDraftStream, isEnabledFailureStore } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import type { ActorRefFrom, MachineImplementationsFrom, SnapshotFrom } from 'xstate';
import { assign, cancel, forwardTo, raise, sendTo, setup, stopChild } from 'xstate';

import { isEqual } from 'lodash';
import type { PipelineProcessorsUiDefinition } from '../../types';
import { isPipelineConditionStep } from '../../types';
import type {
  EnrichmentDataSource,
  EnrichmentUrlState,
} from '../../../../../../../common/url_schema';
import { getStreamTypeFromDefinition } from '../../../../../../util/get_stream_type_from_definition';
import type {
  StreamEnrichmentContextType,
  StreamEnrichmentEvent,
  StreamEnrichmentInput,
  StreamEnrichmentServiceDependencies,
} from './types';
import {
  createUpsertStreamActor,
  createUpsertStreamFailureNofitier,
  createUpsertStreamSuccessNofitier,
} from './upsert_stream_actor';

import {
  createDataSourceMachineImplementations,
  dataSourceMachine,
} from '../data_source_state_machine';
import { interactiveModeMachine } from '../interactive_mode_machine';
import { createInteractiveModeMachineImplementations } from '../interactive_mode_machine/interactive_mode_machine';
import { stepUnderEditSelector } from '../interactive_mode_machine/selectors';
import {
  createSimulationMachineImplementations,
  simulationMachine,
} from '../simulation_state_machine';
import { jsonModeMachine } from '../json_mode_machine/json_mode_machine';
import { createUrlInitializerActor, createUrlSyncAction } from './url_state_actor';
import {
  createFailureStoreDataSource,
  defaultEnrichmentUrlState,
  getActiveDataSourceRef,
  getActiveDataSourceSamples,
  getDataSourcesUrlState,
  getUpsertFields,
  selectDataSource,
  spawnDataSource,
} from './utils';
import { processorsToUiDefinition } from '../../ingest_pipeline_processors';

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
    simulationMachine: getPlaceholderFor(() => simulationMachine),
    interactiveModeMachine: getPlaceholderFor(() => interactiveModeMachine),
    jsonModeMachine: getPlaceholderFor(() => jsonModeMachine),
  },
  actions: {
    notifyUpsertStreamSuccess: getPlaceholderFor(createUpsertStreamSuccessNofitier),
    notifyUpsertStreamFailure: getPlaceholderFor(createUpsertStreamFailureNofitier),
    refreshDefinition: () => {},
    /* Validation actions */
    computeValidation: assign(() => {
      return {
        validationErrors: new Map(),
        fieldTypesByProcessor: new Map(),
      };
    }),
    storeSchemaErrors: assign((_, params: { errors: string[] }) => ({
      schemaErrors: params.errors,
    })),
    /* URL state actions */
    storeUrlState: assign((_, params: { urlState: EnrichmentUrlState }) => ({
      urlState: params.urlState,
    })),
    syncUrlState: getPlaceholderFor(createUrlSyncAction),
    // Definition updates are handled outside of the machine, and sent in via an event.
    storeDefinition: assign((_, params: { definition: Streams.ingest.all.GetResponse }) => ({
      definition: params.definition,
    })),
    // When the definition is refreshed (outside of the machine), this resets state back to match it.
    resetStateFromDefinition: assign(({ context }) => {
      const pipelineDefinition = processorsToUiDefinition(context.pipeline.processors ?? []);
      return {
        previousPipelineDefinition: pipelineDefinition,
        nextPipelineDefinition: pipelineDefinition,
        previousProcessors: context.pipeline.processors ?? [],
        hasChanges: false,
        schemaErrors: [],
        validationErrors: new Map(),
        fieldTypesByProcessor: new Map(),
      };
    }),
    commitSavedState: assign(({ context }) => ({
      previousPipelineDefinition: context.nextPipelineDefinition,
      previousProcessors: context.pipeline.processors ?? context.previousProcessors,
      hasChanges: false,
    })),
    updatePipelineDefinition: assign(
      ({ context }, params: { definition: PipelineProcessorsUiDefinition }) => ({
        nextPipelineDefinition: params.definition,
        hasChanges: hasChanges(params.definition, context.previousPipelineDefinition),
      })
    ),
    storeSavedPipeline: assign(({ event }) => {
      const doneEvent = event as { type: string; output?: StreamEnrichmentContextType['pipeline'] };
      if (doneEvent.type !== 'xstate.done.actor.upsertStreamActor' || !doneEvent.output) {
        return {};
      }

      return {
        pipeline: doneEvent.output,
      };
    }),
    /* Mode machine spawning */
    spawnInteractiveMode: assign(({ context, spawn, self }) => {
      const activeDataSourceRef = getActiveDataSourceRef(context.dataSourcesRefs);
      const activeDataSourceSnapshot = activeDataSourceRef?.getSnapshot();
      const simulationMode = activeDataSourceSnapshot?.context.simulationMode ?? 'partial';

      const persistedIds = new Set(
        context.previousPipelineDefinition.steps.map((step) => step.customIdentifier)
      );
      const newStepIds = context.nextPipelineDefinition.steps
        .map((step) => step.customIdentifier)
        .filter((id) => !persistedIds.has(id));
      return {
        interactiveModeRef: spawn('interactiveModeMachine', {
          id: 'interactiveMode',
          input: {
            definition: context.nextPipelineDefinition,
            parentRef: self,
            privileges: context.definition.privileges,
            newStepIds,
            simulationMode,
            streamName: context.definition.stream.name,
            grokCollection: context.grokCollection,
          },
        }),
        jsonModeRef: undefined, // Clear JSON mode ref when switching to interactive
      };
    }),
    spawnJsonMode: assign(({ context, self, spawn }) => {
      const activeDataSourceRef = getActiveDataSourceRef(context.dataSourcesRefs);
      const activeDataSourceSnapshot = activeDataSourceRef?.getSnapshot();
      const simulationMode = activeDataSourceSnapshot?.context.simulationMode ?? 'partial';

      context.interactiveModeRef?.send({
        type: 'step.clearConditionFilter',
      });
      context.simulatorRef.send({
        type: 'simulation.clearConditionFilter',
      });

      return {
        jsonModeRef: spawn('jsonModeMachine', {
          id: 'jsonMode',
          input: {
            parentRef: self,
            previousPipelineDefinition: context.previousPipelineDefinition,
            nextPipelineDefinition: context.nextPipelineDefinition,
            simulationMode,
            privileges: context.definition.privileges,
            schemaErrors: context.schemaErrors,
            validationErrors: context.validationErrors,
          },
        }),
        interactiveModeRef: undefined,
      };
    }),
    stopInteractiveMode: stopChild('interactiveMode'),
    stopJsonMode: stopChild('jsonMode'),
    /* Data sources actions */
    setupDataSources: assign((assignArgs) => {
      const { definition, urlState } = assignArgs.context;

      const isWiredDraft = isDraftStream(definition.stream);

      const dataSources = isWiredDraft
        ? urlState.dataSources.filter(
            (ds) => ds.type !== 'kql-samples' && ds.type !== 'failure-store'
          )
        : [...urlState.dataSources];

      // Add failure store data source by default if available and not already present.
      // Draft streams have no backing data stream so failure store is not applicable.
      if (!isWiredDraft) {
        const isFailureStoreAvailable =
          isEnabledFailureStore(definition.effective_failure_store) &&
          definition.privileges?.read_failure_store;
        const hasFailureStoreDataSource = dataSources.some((ds) => ds.type === 'failure-store');

        if (isFailureStoreAvailable && !hasFailureStoreDataSource) {
          // Add with enabled: false since there's already an active data source
          dataSources.push({
            ...createFailureStoreDataSource(definition.stream.name),
            enabled: false,
          });
        }
      }

      return {
        dataSourcesRefs: dataSources.map((dataSource) => spawnDataSource(dataSource, assignArgs)),
      };
    }),
    addDataSource: assign((assignArgs, { dataSource }: { dataSource: EnrichmentDataSource }) => {
      const newDataSourceRef = spawnDataSource(dataSource, assignArgs);

      const dataSourcesRefs = [newDataSourceRef, ...assignArgs.context.dataSourcesRefs];
      selectDataSource(dataSourcesRefs, newDataSourceRef.id);

      return {
        dataSourcesRefs,
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
    notifyActiveDataSourceChange: ({ context }) => {
      const activeDataSourceRef = getActiveDataSourceRef(context.dataSourcesRefs);
      const activeDataSourceSnapshot = activeDataSourceRef?.getSnapshot();
      const simulationMode = activeDataSourceSnapshot?.context.simulationMode ?? 'partial';

      context.interactiveModeRef?.send({
        type: 'dataSource.activeChanged',
        simulationMode,
      });
      context.jsonModeRef?.send({
        type: 'dataSource.activeChanged',
        simulationMode,
      });
    },
    sendDataSourcesSamplesToSimulator: sendTo('simulator', ({ context }) => ({
      type: 'simulation.receive_samples',
      samples: getActiveDataSourceSamples(context),
    })),

    sendResetToSimulator: sendTo('simulator', { type: 'simulation.reset' }),
    sendResetEventToSimulator: sendTo('simulator', { type: 'simulation.reset' }),

    fetchMoreSamples: getPlaceholderFor(createFetchMoreSamplesAction),

    filterByCondition: ({ context }, params: { conditionId: string }) => {
      context.interactiveModeRef?.send({
        type: 'step.filterByCondition',
        conditionId: params.conditionId,
      });
      context.simulatorRef.send({
        type: 'simulation.filterByCondition',
        conditionId: params.conditionId,
      });
    },
    clearConditionFilter: ({ context }) => {
      context.interactiveModeRef?.send({
        type: 'step.clearConditionFilter',
      });
      context.simulatorRef.send({
        type: 'simulation.clearConditionFilter',
      });
    },
    storeAutoSelectedConditionId: assign((_, params: { conditionId: string }) => ({
      autoSelectedConditionId: params.conditionId,
    })),
    clearAutoSelectedConditionId: assign(() => ({ autoSelectedConditionId: undefined })),
  },
  guards: {
    /* Staged changes are determined by comparing previous and next pipeline definition */
    hasManagePrivileges: ({ context }) => context.definition.privileges.manage,
    hasSimulatePrivileges: ({ context }) => context.definition.privileges.simulate,
    hasAutoSelectedConditionId: ({ context }) => Boolean(context.autoSelectedConditionId),
    canUpdateStream: ({ context, event }) => {
      const hasSchemaErrors = context.schemaErrors.length > 0;
      const hasValidationErrors = context.validationErrors.size > 0;
      const hasPipelineDefinitionChanges = hasChanges(
        context.nextPipelineDefinition,
        context.previousPipelineDefinition
      );
      const hasSchemaChanges =
        event.type === 'stream.update' ? Boolean(event.saveSchemaChanges) : false;

      return (
        !hasSchemaErrors &&
        !hasValidationErrors &&
        (hasPipelineDefinitionChanges || hasSchemaChanges)
      );
    },
    canSwitchToInteractiveMode: ({ context }) => {
      return context.schemaErrors.length === 0;
    },
    canSwitchToJsonMode: ({ context }) => {
      return !context.interactiveModeRef
        ? true
        : !stepUnderEditSelector(context.interactiveModeRef.getSnapshot().context);
    },
    hasNoValidationErrors: ({ context }) => context.validationErrors.size === 0,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoMUMCMSAbDAL2qkOPIGIBtABgC6iUAAcA9rFoYxKYSAAeiALQB2AIwAWChoAcAZgBMavgY16ArGsMAaEAE9lxgGx8KKlUYCcV85afmNAF9A21RMXA5SSmopRhY2SO4eNSEkEHFJOhk5RQQlJ08nCgNzJyc9FT4+Qo01J1sHPM9PVz01FrUdDQ6XT2DQ9Gx8IiiqGjo41hQoADE0MTIAVTQGLgBXFbHYpmZIflTRCSlstNz8zx0KT18dcza+Sz1yhuUdPkun9Qs+NRLPAz0-XAgwiI3IFFgYAIaxEAHF5gBrADCYgYDDAWCyKC4EBkYDGADcxAj8ZDoXDESi0Risfs5BljrJTsoNFUKDoVHo+Hpak9fHcXnknN0KMY1KUdMYSuZPCogWEholKGSYfDiVT0ZjpNiwGh5mgKCIGCQCAAzMRoZVQ1WU1Ga2mCelHLE5FmeCh8YW1Xx6bwtPQ6QWqSraKyeMwlPgqTxPeUg4acSicCB2LiwMFJjFgDAEvaOtIMl1pRpKO4GbTNDQGcPCyztWy5MNFHnGPRtcUXIIhYHhBOjZN2CEZqgQdFp4fEMl0gvO7WuhBlNSipwcwwqJwGFTmAyB+yINTGcxuC7VTfmHSSjRdga9pUUAdDxMjsfpp8wiAmsDTw6ZOfMvJVkeuilH6ZhOL8grGNcFDlC0fDei4F5xreE6kCmj6jO+JpsDieKEsS+IwpCaAEEqACCmIWt+6SzicoBnIU2hXlWpicmo7gWJBnquCuMoaAUVQxt4yGKqhJDoa+mEiB+dDTFwur6oaxpmhalBEbqpEZhRBBUfmP6MvOmhHhY1ZtEYUYqKuXEqFodQGDubSsg8nQiaCT4PgquBkKgBDrJssB2CgWDUYWf70YgARFJWdRch4mhdIKhgep0K46Bc24yu4rl9uCHnxt5KC+TJJB4GIGxYPiuAkNMX56TRv50QoEUAsU4bXMKnrtNGQZWK4VgGOBhR-Nc2V3nlvYFUVJolWVaAVRQxVIjg1UwCFtFMuFCAaFuVw6KYwqdIUMqaEGXJaEYPI2RdMorqNYnoZ5OCTQtGCwEaJB2AkGBkGsynalwIjzBVsCwBasAUOJEBrQ1G1NXkFR6KKXgcrU+i9PUe7w2YbgPACUZcuY8Fyt2j1jWhg6Pc9ECve9n3THg32-dhMgA0DcCg2g4PEBaEC6tDBn-qWS7mOoGgBDy3Q6INp3Y5U26xQTRN3e55MUJTPkvW9xp0+wjN-SzgNiMDHMUFVNX80Wm3nOWdS+PFNnqNcMuI3LeOcg8Ssk-GZPiRT+Ua9TWsfV9P369ihvGxaEIkLmFthXDSj-CorUxeu-rsWozs4-L+Me9t5jK-2qvq4Vmu0yHTNYmmevMyg95gKak44HHjWNvoMHrr6tzruB3K7iWnQ2+47ybntvxlE4he5cX-ul4H5f0zXWIUASGBgAA7gAItNAAKxCrxv1eh7XK9r1vUI0pAMxrwwECwC3sNnMKiOdOeNmHvZBiCiu2jqBx-jpQeFPTMvs1azwIGXbWFcw6nw3tvAgJA95gAPuvI+ldtSm2WjVJBKDN5G1gNfBgBA+Z1VCq3ZQ-wjyFAeP8bo7g0qnSApKHkbwbi6GvD2USKtQElwgfPKBi9j7L1wbvfeZ9WbILPlSNYZAUDgwAFQP3nKWC4FAAjeHKNyboXIv6Y0Tpca4xgPDnisBeAawD648PAZA4Ogj0EyFgefYhmIr43zvmgmBIiEE4LPkowWwpLguAMD8X4XQ2zrkgk8Nwmh1CSgsiLHkFjxpDCpjTARushEYNwRfFxEBr5gFvrADxJ9TRuIUX4q20Z2SclMFUUofJZSCjFhWbcITDAo09EkmeE0NZkGqiQKAbB4EzXKnAU2DAJCQBxNNUqozwZiBEKgAAsv0mAk0KkJ1oaKK6f8PDlE5E0pKlQWgchFlGH4fQvYoW4Q9axfSUADKGTM2awMKALNQNMhBsy5pjKwBMyEKyHlrJ8hsp+RyLzuFlL6QoG5DnlmOe8LclRKjtC6VYnppd7mPOmMM75rz3nYmKnisZkNQWvA3FcXi4EAxlAloKUoUU2JOEsrUcMaLbkYogViwZOLnlzLeYswlfKfkLQKRfMlQpPQwXDE8KsB4oUaHpeUdkV51znhlFUXQ7K-acooNytge8jbszBs+MArMjUgxNaS0h61lHigPMUbcll1w2VuDGHqMEdwmFqNKEe4EC5XK4UXdFKTemrINWzS1nNTXmsjtG7maBeZoAlUoe1S4SijxdcBd1eiRQbjeKYX4vg-XarAbq-V0xDVxvBlgTgskoCxuNQaWAMdaoHHqgLK28UlzlFKFUdi2a9CRK0CYPaJQUbdDqDoUtvC9XhsrZGjmNa604Qjk2021UKoMBTd2mCFgXA-FdTKIdmNTDlhcL2xFV4NHTsDW5YNHLQ2YvnVAKtTbl2kHrY2qNatqYEB3boHt+7+1HpzY0AmopPTfAnd4YmN4g3TxDV5MNQKI0WqXabFdck10-rNqtG1MM7WAb3X2w9g7ErMpglBwmMH2IzruS+t9UbwaQCkNhxdVqIBQwI52hOmhvAeghSUAdbqT2NG2kUToqq37Xro3enKIDH3Iefahhd6GTWsa-Thk2vN0TEIAwJ94HJhOgbE4gcCS4uhRnHTZSdcHOH3sQ0pp6KHsWvo49GzTq6PPR1jjxy2fHJ2CeM5YUzQZZSeoLT64te1J7yZ9s556Fb3Pqc83+7zqWN1BQKQZpcRnjEiePT1Zp+bvVFpo+YoEKAxC83gGkUmGYnSEcFp0KWbgnUcmZeRvRB5LBuDintKMaU-gWJiBMHYCRGszma1bC47oLD8W+N6AtPUoMensnUaMpROTnlG+MegE3phzAWMsBgTXeNnHUEUASAI0otEA54cLphtB3DbNucU9lowWJVBSdUdoaTxzIY-Fk7cxYHl+L12UF5FV6K26GVkA1mXj0SfF4cUBbTUi1DIGYJAMAMA2GAc7AXcgAi0NuDknIkXin4uYIM7glzeF9NGOyplLnwcc4pxo+lieOH0JcLcmauuiaDMdbOphVyyjKBwhrNzBySXIET+OZxtqI2AgUdoYEIKYxaEedoB49q+BsrKezMuH1y+HBgUchPpsXccGUDuNSzHsV8CUQUzRz3eH4n8AaZhASo9lxhcEWF62K-IXkdo5YzCtfKMyionpaeY1+PZHGLr-CfYKLe9nCnLGJZ8qH4H4foyuAF86oXRXc1tGKLjJ4bQCiVE6f7s3Zan18LSbYjJ9jYZA+UVCylNDTDG4YXogEqu6zcmaIJBb9HdX8PbwzTJDivGILERvfPyipbJ1ZB0SyLg1xmYXJcba7FOQANuEAxvTmdUt5sTrefnfHGbxycQvJZS1+C1r8lA8tL+KdAeN-Q-uyDSZ+m40+1+yWuKLycAb+s2Hg2yVYuyA0CMgoiOFAXIlYJQlk541YoBymXKL6EB-KfykyEA0BCcK4yc-gC21YF4aMmcmMFgiMbw7uXg3qe00u3s90V+uBc6qmUABBPy8ygqpBT8kobgbBJilQ5QAI9K3IxQD23I4u8qcWWeCWXBLmKmbmTGS6whjgV07WguYWw+bYSMbw3IlO7ETwbODm2eyS3ByWWhJqlu6IOh4eBQWgJenWhhA8kWZWvqsW4oOB6heBvBDh0atan6bALhqabh+hpeXh+4SUHI7QBQrSG46ggRSWjGHmLG6W0wURdQ4YsRnh3WjQA0ycFQyRtezKG4AaKhqEoMDAuYEAAASmIGIJpImFEV3OyFYB2DHm0G0KtsKMUHFAED6ANFLMEMEEAA */
  id: 'enrichStream',
  context: ({ input, spawn }) => {
    const streamType = getStreamTypeFromDefinition(input.definition.stream);
    const pipelineDefinition = processorsToUiDefinition(input.pipeline.processors ?? []);
    return {
      definition: input.definition,
      pipeline: input.pipeline,
      processingPersistenceAdapter: input.processingPersistenceAdapter,
      previousProcessors: input.pipeline.processors ?? [],
      previousPipelineDefinition: pipelineDefinition,
      nextPipelineDefinition: pipelineDefinition,
      hasChanges: false,
      schemaErrors: [], // Schema errors from Zod parsing
      dataSourcesRefs: [],
      grokCollection: input.grokCollection,
      interactiveModeRef: undefined, // Will be spawned when in interactive mode
      jsonModeRef: undefined, // Will be spawned when in JSON mode
      urlState: defaultEnrichmentUrlState,
      validationErrors: new Map(),
      fieldTypesByProcessor: new Map(),
      autoSelectedConditionId: undefined,
      suggestedPipeline: undefined,
      simulatorRef: spawn('simulationMachine', {
        id: 'simulator',
        input: {
          steps: [],
          streamName: input.definition.stream.name,
          streamType: streamType === 'query' ? 'unknown' : streamType,
        },
      }),
    };
  },
  initial: 'initializingFromUrl',
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
          target: 'ready',
        },
      },
    },
    ready: {
      id: 'ready',
      type: 'parallel',
      entry: [
        { type: 'resetStateFromDefinition' },
        { type: 'computeValidation' },
        { type: 'setupDataSources' },
        { type: 'notifyActiveDataSourceChange' },
      ],
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
                  guard: 'canUpdateStream',
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
                input: ({ context, event }) => ({
                  definition: context.definition,
                  pipeline: context.pipeline,
                  processingPersistenceAdapter: context.processingPersistenceAdapter,
                  pipelineDefinition: context.nextPipelineDefinition,
                  fields:
                    event.type === 'stream.update' && event.saveSchemaChanges
                      ? getUpsertFields(context)
                      : undefined,
                  configurationMode:
                    context.interactiveModeRef !== undefined ? 'interactive' : 'json',
                }),
                onDone: {
                  target: 'idle',
                  actions: [
                    { type: 'sendResetEventToSimulator' },
                    { type: 'storeSavedPipeline' },
                    { type: 'commitSavedState' },
                    { type: 'notifyUpsertStreamSuccess' },
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
            'dataSources.select': {
              actions: [
                ({ context, event }) => selectDataSource(context.dataSourcesRefs, event.id),
                { type: 'notifyActiveDataSourceChange' },
              ],
            },
            'dataSource.change': {
              actions: [
                cancel('sync-on-change'),
                { type: 'notifyActiveDataSourceChange' },
                raise({ type: 'url.sync' }, { id: 'sync-on-change', delay: 300 }),
              ],
            },
            'dataSource.dataChange': {
              actions: [{ type: 'sendDataSourcesSamplesToSimulator' }],
            },
          },
          states: {
            displayingSimulation: {
              initial: 'viewDataPreview',
              on: {
                'simulation.refresh': {
                  actions: [{ type: 'refreshDataSources' }],
                },
                'simulation.fetchMore': {
                  actions: [{ type: 'fetchMoreSamples' }],
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
                        { type: 'notifyActiveDataSourceChange' },
                        raise({ type: 'url.sync' }),
                      ],
                    },
                    'dataSource.delete': {
                      actions: [
                        stopChild(({ event }) => event.id),
                        { type: 'deleteDataSource', params: ({ event }) => event },
                        { type: 'notifyActiveDataSourceChange' },
                        raise({ type: 'url.sync' }),
                      ],
                    },
                  },
                },
              },
            },
            managingProcessors: {
              id: 'managingProcessors',
              initial: 'evaluatingMode',
              states: {
                evaluatingMode: {
                  always: [
                    {
                      guard: ({ context }) => context.jsonModeRef !== undefined,
                      target: 'json',
                    },
                    {
                      target: 'interactive',
                    },
                  ],
                },
                interactive: {
                  entry: ['spawnInteractiveMode'],
                  exit: 'stopInteractiveMode',
                  on: {
                    'mode.switchToJSON': {
                      guard: 'canSwitchToJsonMode',
                      target: 'json',
                    },
                    'mode.definitionUpdated': {
                      actions: [
                        {
                          type: 'updatePipelineDefinition',
                          params: ({ event }) => ({ definition: event.definition }),
                        },
                        { type: 'computeValidation' },
                      ],
                    },
                    'mode.schemaErrorsChanged': {
                      actions: {
                        type: 'storeSchemaErrors',
                        params: ({ event }) => ({ errors: event.errors }),
                      },
                    },
                    'simulation.reset': {
                      actions: 'sendResetToSimulator',
                    },
                    'simulation.updateSteps': {
                      actions: forwardTo('simulator'),
                    },
                    'simulation.filterByConditionAuto': {
                      actions: [
                        {
                          type: 'storeAutoSelectedConditionId',
                          params: ({ event }) => ({ conditionId: event.conditionId }),
                        },
                        {
                          type: 'filterByCondition',
                          params: ({ event }) => ({ conditionId: event.conditionId }),
                        },
                      ],
                    },
                    'simulation.filterByCondition': {
                      actions: [
                        {
                          type: 'clearAutoSelectedConditionId',
                        },
                        {
                          type: 'filterByCondition',
                          params: ({ event }) => ({ conditionId: event.conditionId }),
                        },
                      ],
                    },
                    'simulation.clearConditionFilter': {
                      actions: [
                        {
                          type: 'clearAutoSelectedConditionId',
                        },
                        {
                          type: 'clearConditionFilter',
                        },
                      ],
                    },
                    'simulation.clearAutoConditionFilter': {
                      guard: 'hasAutoSelectedConditionId',
                      actions: [
                        { type: 'clearConditionFilter' },
                        { type: 'clearAutoSelectedConditionId' },
                      ],
                    },
                    // Forward other step events to interactive mode machine
                    'step.*': {
                      actions: forwardTo('interactiveMode'),
                    },
                    'suggestion.*': {
                      actions: forwardTo('interactiveMode'),
                    },
                  },
                },
                json: {
                  entry: ['spawnJsonMode'],
                  exit: 'stopJsonMode',
                  on: {
                    'mode.switchToInteractive': {
                      guard: 'canSwitchToInteractiveMode',
                      target: 'interactive',
                    },
                    'mode.definitionUpdated': {
                      actions: [
                        {
                          type: 'updatePipelineDefinition',
                          params: ({ event }) => ({ definition: event.definition }),
                        },
                        { type: 'computeValidation' },
                      ],
                    },
                    'mode.schemaErrorsChanged': {
                      actions: [
                        {
                          type: 'storeSchemaErrors',
                          params: ({ event }) => ({ errors: event.errors }),
                        },
                        forwardTo('jsonMode'),
                      ],
                    },
                    'simulation.reset': {
                      actions: 'sendResetToSimulator',
                    },
                    'simulation.updateSteps': {
                      actions: forwardTo('simulator'),
                    },
                    // Forward json events to JSON mode machine
                    'json.*': {
                      actions: forwardTo('jsonMode'),
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
    upsertStream: createUpsertStreamActor({ telemetryClient }),
    interactiveModeMachine: interactiveModeMachine.provide(
      createInteractiveModeMachineImplementations({
        toasts: core.notifications.toasts,
        telemetryClient,
        streamsRepositoryClient,
        notifications: core.notifications,
      })
    ),
    dataSourceMachine: dataSourceMachine.provide(
      createDataSourceMachineImplementations({
        data,
        toasts: core.notifications.toasts,
        telemetryClient,
        streamsRepositoryClient,
        uiSettings: core.uiSettings,
      })
    ),
    simulationMachine: simulationMachine.provide(
      createSimulationMachineImplementations({
        data,
        streamsRepositoryClient,
        toasts: core.notifications.toasts,
      })
    ),
    jsonModeMachine,
  },
  actions: {
    refreshDefinition,
    syncUrlState: createUrlSyncAction({ urlStateStorageContainer }),
    fetchMoreSamples: createFetchMoreSamplesAction(),
    notifyUpsertStreamSuccess: createUpsertStreamSuccessNofitier({
      toasts: core.notifications.toasts,
    }),
    notifyUpsertStreamFailure: createUpsertStreamFailureNofitier({
      toasts: core.notifications.toasts,
    }),
  },
});

function createFetchMoreSamplesAction() {
  return ({ context }: { context: StreamEnrichmentContextType }) => {
    const selectedConditionId = context.simulatorRef.getSnapshot().context.selectedConditionId;
    if (!selectedConditionId) return;

    const steps = context.simulatorRef.getSnapshot().context.steps;
    const activeDataSourceRef = getActiveDataSourceRef(context.dataSourcesRefs);
    if (!activeDataSourceRef) return;

    const conditionIndex = steps.findIndex(
      (s) => isPipelineConditionStep(s) && s.customIdentifier === selectedConditionId
    );
    if (conditionIndex === -1) return;

    activeDataSourceRef.send({
      type: 'dataSource.fetchMore',
      conditionEsql: undefined,
      processingSteps: { steps: [] },
    });
  };
}

const hasChanges = (
  nextPipelineDefinition: PipelineProcessorsUiDefinition,
  previousPipelineDefinition: PipelineProcessorsUiDefinition
) => {
  return !isEqual(nextPipelineDefinition, previousPipelineDefinition);
};
