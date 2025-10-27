/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MachineImplementationsFrom, SnapshotFrom } from 'xstate5';
import { assign, forwardTo, setup, sendTo, stopChild, raise, cancel } from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import type { Streams } from '@kbn/streams-schema';
import { GrokCollection } from '@kbn/grok-ui';
import {
  addDeterministicCustomIdentifiers,
  checkAdditiveChanges,
  validateStreamlang,
  StreamlangValidationError,
  validateStreamlangModeCompatibility,
} from '@kbn/streamlang';
import { isStreamlangDSLSchema, type StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import type { EnrichmentDataSource, EnrichmentUrlState } from '../../../../../../common/url_schema';
import { getStreamTypeFromDefinition } from '../../../../../util/get_stream_type_from_definition';
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
  simulationMachine,
  createSimulationMachineImplementations,
} from '../simulation_state_machine';
import {
  defaultEnrichmentUrlState,
  getActiveDataSourceSamples,
  getDataSourcesUrlState,
  getUpsertFields,
  spawnDataSource,
  selectDataSource,
  getActiveDataSourceRef,
} from './utils';
import { createUrlInitializerActor, createUrlSyncAction } from './url_state_actor';
import {
  createDataSourceMachineImplementations,
  dataSourceMachine,
} from '../data_source_state_machine';
import { setupGrokCollectionActor } from './setup_grok_collection_actor';
import { interactiveModeMachine } from '../interactive_mode_machine';
import { yamlModeMachine } from '../yaml_mode_machine';

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
    simulationMachine: getPlaceholderFor(() => simulationMachine),
    interactiveModeMachine: getPlaceholderFor(() => interactiveModeMachine),
    yamlModeMachine: getPlaceholderFor(() => yamlModeMachine),
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
    // Definition updates are handled outside of the machine, and sent in via an event.
    storeDefinition: assign((_, params: { definition: Streams.ingest.all.GetResponse }) => ({
      definition: params.definition,
    })),
    // When the definition is refreshed (outside of the machine), this resets state back to match it.
    resetStateFromDefinition: assign(({ context }) => {
      const dslWithIdentifiers = addDeterministicCustomIdentifiers(
        context.definition.stream.ingest.processing
      );
      return {
        previousStreamlangDSL: dslWithIdentifiers,
        nextStreamlangDSL: dslWithIdentifiers,
        isNextStreamlangDSLValid: true,
        hasChanges: false,
      };
    }),
    updateDSL: assign(({ context }, params: { dsl: StreamlangDSL }) => {
      let isValid = true;
      try {
        validateStreamlang(params.dsl);
      } catch (error) {
        if (error instanceof StreamlangValidationError) {
          isValid = false;
        } else {
          throw error;
        }
      }

      return {
        nextStreamlangDSL: params.dsl,
        isNextStreamlangDSLValid: isValid,
        hasChanges: JSON.stringify(params.dsl) !== JSON.stringify(context.previousStreamlangDSL),
      };
    }),
    /* Mode machine spawning */
    spawnInteractiveMode: assign(({ context, spawn, self }) => {
      const activeDataSourceRef = getActiveDataSourceRef(context.dataSourcesRefs);
      const activeDataSourceSnapshot = activeDataSourceRef?.getSnapshot();
      const simulationMode = activeDataSourceSnapshot?.context.simulationMode ?? 'partial';

      const additiveChanges = checkAdditiveChanges(
        context.previousStreamlangDSL,
        context.nextStreamlangDSL
      );
      return {
        interactiveModeRef: spawn('interactiveModeMachine', {
          id: 'interactiveMode',
          input: {
            dsl: context.nextStreamlangDSL,
            parentRef: self,
            privileges: context.definition.privileges,
            newStepIds: additiveChanges.newStepIds ?? [],
            simulationMode,
          },
        }),
        yamlModeRef: undefined, // Clear YAML mode ref when switching to interactive
      };
    }),
    spawnYamlMode: assign(({ context, spawn, self }) => {
      const activeDataSourceRef = getActiveDataSourceRef(context.dataSourcesRefs);
      const activeDataSourceSnapshot = activeDataSourceRef?.getSnapshot();
      const simulationMode = activeDataSourceSnapshot?.context.simulationMode ?? 'partial';

      return {
        yamlModeRef: spawn('yamlModeMachine', {
          id: 'yamlMode',
          input: {
            previousStreamlangDSL: context.previousStreamlangDSL,
            nextStreamlangDSL: context.nextStreamlangDSL,
            parentRef: self,
            privileges: context.definition.privileges,
            simulationMode,
          },
        }),
        interactiveModeRef: undefined, // Clear interactive mode ref when switching to YAML
      };
    }),
    stopInteractiveMode: stopChild('interactiveMode'),
    stopYamlMode: stopChild('yamlMode'),
    /* Data sources actions */
    setupDataSources: assign((assignArgs) => ({
      dataSourcesRefs: assignArgs.context.urlState.dataSources.map((dataSource) =>
        spawnDataSource(dataSource, assignArgs)
      ),
    })),
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
      context.yamlModeRef?.send({
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
  },
  guards: {
    /* Staged changes are determined by comparing previous and next DSL */
    hasManagePrivileges: ({ context }) => context.definition.privileges.manage,
    hasSimulatePrivileges: ({ context }) => context.definition.privileges.simulate,
    canUpdateStream: ({ context }) => {
      return (
        isStreamlangDSLSchema(context.nextStreamlangDSL) &&
        JSON.stringify(context.previousStreamlangDSL) !== JSON.stringify(context.nextStreamlangDSL)
      );
    },
    canSwitchToInteractiveMode: ({ context }) => {
      if (!context.isNextStreamlangDSLValid) {
        return false;
      } else {
        // Valid but can it actually be represented in the UI
        const modeCompatibility = validateStreamlangModeCompatibility(context.nextStreamlangDSL);
        return modeCompatibility.canBeRepresentedInInteractiveMode;
      }
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoMUMCMSAbDAL2qkOPIGIBtABgC6iUAAcA9rFoYxKYSAAeiALQB2AIwAWChoAcAZgBMavgY16ArGsMAaEAE9lxgGx8KKlUYCcV85afmNAF9A21RMXA5SSmopRhY2SO4eNSEkEHFJOhk5RQQlJ08nCgNzJyc9FT4+Qo01J1sHPM9PVz01FrUdDQ6XT2DQ9Gx8IiiqGjo41hQoADE0MTIAVTQGLgBXFbHYpmZIflTRCSlstNz8zx0KT18dcza+Sz1yhuUdPkun9Qs+NRLPAz0-XAgwiI3IFFgYAIaxEAHF5gBrADCYgYDDAWCyKC4EBkYDGADcxAj8ZDoXDESi0Risfs5BljrJTsoNFUKDoVHo+Hpak9fHcXnknN0KMY1KUdMYSuZPCogWEholKGSYfDiVT0ZjpNiwGh5mgKCIGCQCAAzMRoZVQ1WU1Ga2mCelHLE5FmeCh8YW1Xx6bwtPQ6QWqSraKyeMwlPgqTxPeUg4acSicCB2LiwMFJjFgDAEvaOtIMl1pRpKO4GbTNDQGcPCyztWy5MNFHnGPRtcUXIIhYHhBOjZN2CEZqgQdFp4fEMl0gvO7WuhBlNSipwcwwqJwGFTmAyB+yINTGcxuC7VTfmHSSjRdga9pUUAdDxMjsfpp8wiAmsDTw6ZOfMvJVkeuilH6ZhOL8grGNcFDlC0fDei4F5xreE6kCmj6jO+JpsDieKEsS+IwpCaAEEqACCmIWt+6SzicoBnIU2hXlWpicmo7gWJBnquCuMoaAUVQxt4yGKqhJDoa+mEiB+dDTFwur6oaxpmhalBEbqpEZhRBBUfmP6MvOmhHhY1ZtEYUYqKuXEqFodQGDubSsg8nQiaCT4PgquBkKgBDrJssB2CgWDUYWf70YgARFJWdRch4mhdIKhgep0K46Bc24yu4rl9uCHnxt5KC+TJJB4GIGxYPiuAkNMX56TRv50QoEUAsU4bXMKnrtNGQZWK4VgGOBhR-Nc2V3nlvYFUVJolWVaAVRQxVIjg1UwCFtFMuFCAaFuVw6KYwqdIUMqaEGXJaEYPI2RdMorqNYnoZ5OCTQtGCwEaJB2AkGBkGsynalwIjzBVsCwBasAUOJEBrQ1G1NXkFR6KKXgcrU+i9PUe7w2YbgPACUZcuY8Fyt2j1jWhg6Pc9ECve9n3THg32-dhMgA0DcCg2g4PEBaEC6tDBn-qWS7mOoGgBDy3Q6INp3Y5U26xQTRN3e55MUJTPkvW9xp0+wjN-SzgNiMDHMUFVNX80Wm3nOWdS+PFNnqNcMuI3LeOcg8Ssk-GZPiRT+Ua9TWsfV9P369ihvGxaEIkLmFthXDSj-CorUxeu-rsWozs4-L+Me9t5jK-2qvq4Vmu0yHTNYmmevMyg95gKak44HHjWNvoMHrr6tzruB3K7iWnQ2+47ybntvxlE4he5cX-ul4H5f0zXWIUASGBgAA7gAItNAAKxCrxv1eh7XK9r1vUI0pAMxrwwECwC3sNnMKiOdOeNmHvZBiCiu2jqBx-jpQeFPTMvs1azwIGXbWFcw6nw3tvAgJA95gAPuvI+ldtSm2WjVJBKDN5G1gNfBgBA+Z1VCq3ZQ-wjyFAeP8bo7g0qnSApKHkbwbi6GvD2USKtQElwgfPKBi9j7L1wbvfeZ9WbILPlSNYZAUDgwAFQP3nKWC4FAAjeHKNyboXIv6Y0Tpca4xgPDnisBeAawD648PAZA4Ogj0EyFgefYhmIr43zvmgmBIiEE4LPkowWwpLguAMD8X4XQ2zrkgk8Nwmh1CSgsiLHkFjxpDCpjTARushEYNwRfFxEBr5gFvrADxJ9TRuIUX4q20Z2SclMFUUofJZSCjFhWbcITDAo09EkmeE0NZkGqiQKAbB4EzXKnAU2DAJCQBxNNUqozwZiBEKgAAsv0mAk0KkJ1oaKK6f8PDlE5E0pKlQWgchFlGH4fQvYoW4Q9axfSUADKGTM2awMKALNQNMhBsy5pjKwBMyEKyHlrJ8hsp+RyLzuFlL6QoG5DnlmOe8LclRKjtC6VYnppd7mPOmMM75rz3nYmKnisZkNQWvA3FcXi4EAxlAloKUoUU2JOEsrUcMaLbkYogViwZOLnlzLeYswlfKfkLQKRfMlQpPQwXDE8KsB4oUaHpeUdkV51znhlFUXQ7K-acooNytge8jbszBs+MArMjUgxNaS0h61lHigPMUbcll1w2VuDGHqMEdwmFqNKEe4EC5XK4UXdFKTemrINWzS1nNTXmsjtG7maBeZoAlUoe1S4SijxdcBd1eiRQbjeKYX4vg-XarAbq-V0xDVxvBlgTgskoCxuNQaWAMdaoHHqgLK28UlzlFKFUdi2a9CRK0CYPaJQUbdDqDoUtvC9XhsrZGjmNa604Qjk2021UKoMBTd2mCFgXA-FdTKIdmNTDlhcL2xFV4NHTsDW5YNHLQ2YvnVAKtTbl2kHrY2qNatqYEB3boHt+7+1HpzY0AmopPTfAnd4YmN4g3TxDV5MNQKI0WqXabFdck10-rNqtG1MM7WAb3X2w9g7ErMpglBwmMH2IzruS+t9UbwaQCkNhxdVqIBQwI52hOmhvAeghSUAdbqT2NG2kUToqq37Xro3enKIDH3Iefahhd6GTWsa-Thk2vN0TEIAwJ94HJhOgbE4gcCS4uhRnHTZSdcHOH3sQ0pp6KHsWvo49GzTq6PPR1jjxy2fHJ2CeM5YUzQZZSeoLT64te1J7yZ9s556Fb3Pqc83+7zqWN1BQKQZpcRnjEiePT1Zp+bvVFpo+YoEKAxC83gGkUmGYnSEcFp0KWbgnUcmZeRvRB5LBuDintKMaU-gWJiBMHYCRGszma1bC47oLD8W+N6AtPUoMensnUaMpROTnlG+MegE3phzAWMsBgTXeNnHUEUASAI0otEA54cLphtB3DbNucU9lowWJVBSdUdoaTxzIY-Fk7cxYHl+L12UF5FV6K26GVkA1mXj0SfF4cUBbTUi1DIGYJAMAMA2GAc7AXcgAi0NuDknIkXin4uYIM7glzeF9NGOyplLnwcc4pxo+lieOH0JcLcmauuiaDMdbOphVyyjKBwhrNzBySXIET+OZxtqI2AgUdoYEIKYxaEedoB49q+BsrKezMuH1y+HBgUchPpsXccGUDuNSzHsV8CUQUzRz3eH4n8AaZhASo9lxhcEWF62K-IXkdo5YzCtfKMyionpaeY1+PZHGLr-CfYKLe9nCnLGJZ8qH4H4foyuAF86oXRXc1tGKLjJ4bQCiVE6f7s3Zan18LSbYjJ9jYZA+UVCylNDTDG4YXogEqu6zcmaIJBb9HdX8PbwzTJDivGILERvfPyipbJ1ZB0SyLg1xmYXJcba7FOQANuEAxvTmdUt5sTrefnfHGbxycQvJZS1+C1r8lA8tL+KdAeN-Q-uyDSZ+m40+1+yWuKLycAb+s2Hg2yVYuyA0CMgoiOFAXIlYJQlk541YoBymXKL6EB-KfykyEA0BCcK4yc-gC21YF4aMmcmMFgiMbw7uXg3qe00u3s90V+uBc6qmUABBPy8ygqpBT8kobgbBJilQ5QAI9K3IxQD23I4u8qcWWeCWXBLmKmbmTGS6whjgV07WguYWw+bYSMbw3IlO7ETwbODm2eyS3ByWWhJqlu6IOh4eBQWgJenWhhA8kWZWvqsW4oOB6heBvBDh0atan6bALhqabh+hpeXh+4SUHI7QBQrSG46ggRSWjGHmLG6W0wURdQ4YsRnh3WjQA0ycFQyRtezKG4AaKhqEoMDAuYEAAASmIGIJpImFEV3OyFYB2DHm0G0KtsKMUHFAED6ANFLMEMEEAA */
  id: 'enrichStream',
  context: ({ input, spawn }) => ({
    definition: input.definition,
    previousStreamlangDSL: addDeterministicCustomIdentifiers(
      input.definition.stream.ingest.processing
    ),
    nextStreamlangDSL: addDeterministicCustomIdentifiers(input.definition.stream.ingest.processing),
    // Should always be valid initially as it's sourced from a persisted stream definition
    isNextStreamlangDSLValid: true,
    hasChanges: false,
    dataSourcesRefs: [],
    grokCollection: new GrokCollection(),
    interactiveModeRef: undefined, // Will be spawned when in interactive mode
    yamlModeRef: undefined, // Will be spawned when in YAML mode
    urlState: defaultEnrichmentUrlState,
    simulatorRef: spawn('simulationMachine', {
      id: 'simulator',
      input: {
        steps: [],
        streamName: input.definition.stream.name,
        streamType: getStreamTypeFromDefinition(input.definition.stream),
      },
    }),
  }),
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
      entry: [
        { type: 'resetStateFromDefinition' },
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
                input: ({ context }) => ({
                  definition: context.definition,
                  streamlangDSL: context.nextStreamlangDSL,
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
                      guard: ({ context }) =>
                        context.yamlModeRef !== undefined ||
                        !validateStreamlangModeCompatibility(context.nextStreamlangDSL)
                          .canBeRepresentedInInteractiveMode,
                      target: 'yaml',
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
                    'mode.switchToYAML': {
                      target: 'yaml',
                    },
                    'mode.dslUpdated': {
                      actions: [{ type: 'updateDSL', params: ({ event }) => ({ dsl: event.dsl }) }],
                    },
                    'simulation.reset': {
                      actions: 'sendResetToSimulator',
                    },
                    'simulation.updateSteps': {
                      actions: forwardTo('simulator'),
                    },
                    // Forward step events to interactive mode machine
                    'step.*': {
                      actions: forwardTo('interactiveMode'),
                    },
                  },
                },
                yaml: {
                  entry: ['spawnYamlMode'],
                  exit: 'stopYamlMode',
                  on: {
                    'mode.switchToInteractive': {
                      guard: 'canSwitchToInteractiveMode',
                      target: 'interactive',
                    },
                    'mode.dslUpdated': {
                      actions: [{ type: 'updateDSL', params: ({ event }) => ({ dsl: event.dsl }) }],
                    },
                    'simulation.reset': {
                      actions: 'sendResetToSimulator',
                    },
                    'simulation.updateSteps': {
                      actions: forwardTo('simulator'),
                    },
                    // Forward yaml events to YAML mode machine
                    'yaml.*': {
                      actions: forwardTo('yamlMode'),
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
    interactiveModeMachine,
    yamlModeMachine,
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

export type StreamEnrichmentActorSnapshot = SnapshotFrom<typeof streamEnrichmentMachine>;
