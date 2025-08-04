/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  MachineImplementationsFrom,
  assign,
  enqueueActions,
  forwardTo,
  setup,
  sendTo,
  stopChild,
  and,
  ActorRefFrom,
  raise,
  cancel,
  stateIn,
  SnapshotFrom,
} from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { ProcessorDefinition, Streams } from '@kbn/streams-schema';
import { GrokCollection } from '@kbn/grok-ui';
import { htmlIdGenerator } from '@elastic/eui';
import { EnrichmentDataSource, EnrichmentUrlState } from '../../../../../../common/url_schema';
import {
  StreamEnrichmentContextType,
  StreamEnrichmentEvent,
  StreamEnrichmentInput,
  StreamEnrichmentServiceDependencies,
} from './types';
import { getDefaultGrokProcessor, isGrokProcessor, processorConverter } from '../../utils';
import {
  createUpsertStreamActor,
  createUpsertStreamFailureNofitier,
  createUpsertStreamSuccessNofitier,
} from './upsert_stream_actor';

import {
  simulationMachine,
  createSimulationMachineImplementations,
} from '../simulation_state_machine';
import { processorMachine } from '../processor_state_machine';
import {
  defaultEnrichmentUrlState,
  getConfiguredProcessors,
  getDataSourcesSamples,
  getDataSourcesUrlState,
  getProcessorsForSimulation,
  getUpsertWiredFields,
  spawnDataSource,
  spawnProcessor,
} from './utils';
import { createUrlInitializerActor, createUrlSyncAction } from './url_state_actor';
import {
  createDataSourceMachineImplementations,
  dataSourceMachine,
} from '../data_source_state_machine';
import { setupGrokCollectionActor } from './setup_grok_collection_actor';
import { selectPreviewRecords } from '../simulation_state_machine/selectors';
import { moveArrayItem } from '../../../../../util/move_array_item';
import { selectWhetherAnyProcessorBeforePersisted } from './selectors';

export type StreamEnrichmentActorRef = ActorRefFrom<typeof streamEnrichmentMachine>;
export type StreamEnrichmentActorSnapshot = SnapshotFrom<typeof streamEnrichmentMachine>;

const createId = htmlIdGenerator();
// Helper to recursively flatten processors, unpacking "where" steps and setting whereParentId
function flattenProcessors(
  processors: ProcessorDefinition[],
  parentWhereId?: string
): Array<{ processor: ProcessorDefinition; id: string; whereParentId?: string }> {
  const result: Array<{
    processor: ProcessorDefinition;
    id: string;
    whereParentId?: string;
  }> = [];
  for (const proc of processors) {
    if ('where' in proc && Array.isArray(proc.where.steps)) {
      // Generate id for this where processor
      const whereId = createId();
      // Clone the where processor and empty its steps
      const steps = proc.where.steps;
      const whereProc: ProcessorDefinition = {
        ...proc,
        where: {
          ...proc.where,
          steps: [],
        },
      };
      result.push({ processor: whereProc, id: whereId });
      // Recursively flatten steps, setting whereParentId to this where's id
      if (Array.isArray(steps)) {
        result.push(...flattenProcessors(steps, whereId));
      }
    } else {
      // Generate id for this processor
      const procId = createId();
      if (parentWhereId) {
        result.push({
          processor: { ...proc },
          id: procId,
          whereParentId: parentWhereId,
        });
      } else {
        result.push({ processor: proc, id: procId });
      }
    }
  }
  return result;
}

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
    processorMachine: getPlaceholderFor(() => processorMachine),
    simulationMachine: getPlaceholderFor(() => simulationMachine),
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
    /* Processors actions */
    setupProcessors: assign(({ context, spawn, self }) => {
      // Clean-up pre-existing processors
      context.processorsRefs.forEach(stopChild);

      // Flatten all processors from the stream definition
      const flattenedProcessors = flattenProcessors(context.definition.stream.ingest.processing);

      // Setup processors from the flattened list
      const processorsRefs = flattenedProcessors.map(({ processor, id, whereParentId }) => {
        // Pass whereParentId and id via options if present
        return spawnProcessor(
          processor,
          { self, spawn },
          {
            ...(whereParentId ? { whereParentId } : {}),
            id,
          }
        );
      });

      return {
        initialProcessorsRefs: processorsRefs,
        processorsRefs,
      };
    }),
    updateAllProcessors: assign(
      ({ context, spawn, self }, { processors }: { processors: ProcessorDefinition[] }) => {
        const existingRefs = context.processorsRefs;

        // Flatten processors and assign ids by index, preserving parent-child relationships
        function flattenAndAssignIds(
          ps: ProcessorDefinition[],
          whereParentId?: string,
          refIndexTracker: { idx: number } = { idx: 0 }
        ): Array<{ processor: ProcessorDefinition; id: string; whereParentId?: string }> {
          const result: Array<{
            processor: ProcessorDefinition;
            id: string;
            whereParentId?: string;
          }> = [];
          for (const proc of ps) {
            let assignedId: string;
            if ('where' in proc && Array.isArray(proc.where.steps)) {
              // Assign id by index if available, else generate new
              if (existingRefs[refIndexTracker.idx]) {
                assignedId = existingRefs[refIndexTracker.idx].id;
              } else {
                assignedId = createId();
              }
              refIndexTracker.idx++;
              // "where" processor: flatten its steps
              const steps = proc.where.steps;
              const whereProc: ProcessorDefinition = {
                ...proc,
                where: {
                  ...proc.where,
                  steps: [],
                },
              };
              result.push({ processor: whereProc, id: assignedId, whereParentId });
              // Recursively flatten steps, setting whereParentId to this where's id
              if (Array.isArray(steps)) {
                result.push(...flattenAndAssignIds(steps, assignedId, refIndexTracker));
              }
            } else {
              // Assign id by index if available, else generate new
              if (existingRefs[refIndexTracker.idx]) {
                assignedId = existingRefs[refIndexTracker.idx].id;
              } else {
                assignedId = createId();
              }
              refIndexTracker.idx++;
              result.push({ processor: proc, id: assignedId, whereParentId });
            }
          }
          return result;
        }

        // Flatten incoming processors and assign ids by index
        const flatIncoming = flattenAndAssignIds(processors);

        // Build newRefs: reuse, update, or spawn as needed
        const newRefs: typeof context.processorsRefs = [];
        let index = 0;
        const originalDefinitions = flattenProcessors(context.definition.stream.ingest.processing);
        for (const incoming of flatIncoming) {
          const existingRef = existingRefs.find((ref) => ref.id === incoming.id);
          if (existingRef) {
            // If processor definition or parent changed, send update event
            const snap = existingRef.getSnapshot();
            const prevDef = snap.context.processor;
            const prevParent = prevDef.whereParentId;
            const nextParent = incoming.whereParentId;
            // Compare processor definition shallowly (could be improved)
            const changed =
              JSON.stringify({ ...processorConverter.toAPIDefinition(prevDef) }) !==
                JSON.stringify({ ...incoming.processor }) || prevParent !== nextParent;
            if (changed) {
              // check whether this processor was basically reset to the previous state. In this case, we don't want to send a change event
              const originalDefinition = originalDefinitions[index];
              if (
                originalDefinition &&
                JSON.stringify(originalDefinition.processor) === JSON.stringify(incoming.processor)
              ) {
                const whereParentIndex = originalDefinitions.findIndex(
                  (def) => def.id === originalDefinition.whereParentId
                );
                existingRef.send({
                  type: 'processor.reset',
                  processor: { ...incoming.processor },
                  whereParentId: whereParentIndex !== -1 ? newRefs[whereParentIndex].id : undefined,
                });
              } else {
                existingRef.send({
                  type: 'processor.change',
                  processor: { ...incoming.processor },
                });
              }
              if (prevParent !== nextParent) {
                existingRef.send({
                  type: 'processor.changeParent',
                  parentId: nextParent,
                });
              }
            }
            newRefs.push(existingRef);
          } else {
            // Spawn new processor actor
            const ref = spawnProcessor(
              { ...incoming.processor },
              { spawn, self },
              {
                id: incoming.id,
                whereParentId: incoming.whereParentId,
                isNew: true,
                shouldSkipDraft: true,
              }
            );
            newRefs.push(ref);
          }
          index++;
        }

        // Stop actors that are no longer present
        const incomingIds = new Set(flatIncoming.map((p) => p.id));
        for (const ref of existingRefs) {
          if (!incomingIds.has(ref.id)) {
            ref.send({ type: 'processor.delete' });
          }
        }

        return {
          processorsRefs: newRefs,
        };
      }
    ),
    addProcessor: assign((assignArgs, { processor }: { processor?: ProcessorDefinition }) => {
      if (!processor) {
        processor = getDefaultGrokProcessor({
          sampleDocs: selectPreviewRecords(assignArgs.context.simulatorRef.getSnapshot().context),
        });
      }

      const lastWhereProcessor = [...assignArgs.context.processorsRefs]
        .reverse()
        .find((proc) => proc.getSnapshot().context.processor.type === 'where');
      const lastWhereProcessorId = lastWhereProcessor?.getSnapshot().context.processor.id;

      const newProcessorRef = spawnProcessor(processor, assignArgs, {
        isNew: true,
        whereParentId: lastWhereProcessorId,
      });

      return {
        processorsRefs: assignArgs.context.processorsRefs.concat(newProcessorRef),
      };
    }),
    deleteProcessor: assign(({ context }, params: { id: string }) => {
      // Recursively collect all processor ids to delete (the target and all its children)
      const collectIdsToDelete = (
        id: string,
        processorsRefs: typeof context.processorsRefs
      ): string[] => {
        const childIds = processorsRefs
          .filter((proc) => proc.getSnapshot().context.processor.whereParentId === id)
          .map((proc) => proc.id);
        return [id, ...childIds.flatMap((childId) => collectIdsToDelete(childId, processorsRefs))];
      };

      const idsToDelete = collectIdsToDelete(params.id, context.processorsRefs);

      return {
        processorsRefs: context.processorsRefs.filter((proc) => !idsToDelete.includes(proc.id)),
      };
    }),
    reorderProcessors: assign(
      (
        { context },
        params: { from: number; to: number; fromParent?: string; toParent?: string }
      ) => {
        // Helper: group processors by whereParentId
        const groupByParent = (processorsRefs: typeof context.processorsRefs) => {
          const groups: Record<string, typeof context.processorsRefs> = {};
          for (const proc of processorsRefs) {
            const parentId = proc.getSnapshot().context.processor.whereParentId ?? 'main-list';
            if (!groups[parentId]) groups[parentId] = [];
            groups[parentId].push(proc);
          }
          return groups;
        };

        // Helper: flatten groups to a single array in correct nested order
        const flattenGroups = (
          groups: Record<string, typeof context.processorsRefs>,
          parentId: string = 'main-list'
        ): typeof context.processorsRefs => {
          const result: typeof context.processorsRefs = [];
          const list = groups[parentId] ?? [];
          for (const proc of list) {
            result.push(proc);
            // Recursively add children of this processor (if any)
            const childId = proc.id;
            if (groups[childId]?.length) {
              result.push(...flattenGroups(groups, childId));
            }
          }
          return result;
        };

        let { from, to, fromParent = 'main-list', toParent = 'main-list' } = params;
        const processorsRefs = context.processorsRefs;
        let actualToParent = toParent;
        let mergeToEnd = false;

        // If toParent ends with '-merge', strip it and set mergeToEnd
        if (toParent.endsWith('-merge')) {
          actualToParent = toParent.slice(0, -6); // remove '-merge'
          mergeToEnd = true;
        }

        // if the from or to parent matches <id>-<integer>, then that integer is the actual from index, and the <id> is the actual fromParent. Same for toParent

        const fromMatcher = /^(.*?)-(\d+)$/.exec(fromParent);
        const toMatcher = /^(.*?)-(\d+)$/.exec(actualToParent);

        if (fromMatcher) {
          fromParent = fromMatcher[1];
          // from = from + parseInt(fromMatcher[2], 10);
        }

        if (toMatcher) {
          actualToParent = toMatcher[1];
          // to = to + parseInt(toMatcher[2], 10);
        }

        const groups = groupByParent(processorsRefs);

        // If moving within the same sublist
        if (fromParent === actualToParent) {
          const list = groups[fromParent] ?? [];
          groups[fromParent] = moveArrayItem(list, from, to);
          return {
            processorsRefs: flattenGroups(groups),
          };
        }

        // Moving between sublists
        const fromList = groups[fromParent] ?? [];
        const toList = groups[actualToParent] ?? [];
        const [moved] = fromList.splice(from, 1);

        if (moved) {
          // Send event to update whereParentId in the processor actor
          moved.send({
            type: 'processor.changeParent',
            parentId: actualToParent === 'main-list' ? undefined : actualToParent,
          });
          // Insert into toList at the correct position
          if (mergeToEnd) {
            toList.push(moved);
          } else {
            toList.splice(to, 0, moved);
          }
        }
        groups[fromParent] = fromList;
        groups[actualToParent] = toList;
        return {
          processorsRefs: flattenGroups(groups),
        };
      }
    ),
    reassignProcessors: assign(({ context }) => ({
      processorsRefs: [...context.processorsRefs],
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
    sendProcessorsEventToSimulator: enqueueActions(
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
            processors: getProcessorsForSimulation({ processorsRefs: context.processorsRefs }),
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
    updateGrokCollectionCustomPatterns: assign(({ context }, params: { id: string }) => {
      const processorRefContext = context.processorsRefs
        .find((p) => p.id === params.id)
        ?.getSnapshot().context;
      if (processorRefContext && isGrokProcessor(processorRefContext.processor)) {
        context.grokCollection.setCustomPatterns(
          processorRefContext.processor.grok.pattern_definitions ?? {}
        );
      }
      return { grokCollection: context.grokCollection };
    }),
  },
  guards: {
    canReorderProcessors: and([
      'hasSimulatePrivileges',
      ({ context }) => context.processorsRefs.length >= 2,
    ]),
    hasStagedChanges: ({ context }) => {
      const { initialProcessorsRefs, processorsRefs } = context;
      return (
        // Deleted processors
        initialProcessorsRefs.length !== processorsRefs.length ||
        // New/updated processors
        processorsRefs.some((processorRef) => {
          const state = processorRef.getSnapshot();
          return state.matches('configured') && state.context.isUpdated;
        }) ||
        // Processor order changed
        processorsRefs.some(
          (processorRef, pos) => initialProcessorsRefs[pos]?.id !== processorRef.id
        )
      );
    },
    hasManagePrivileges: ({ context }) => context.definition.privileges.manage,
    hasSimulatePrivileges: ({ context }) => context.definition.privileges.simulate,
    canUpdateStream: and(['hasStagedChanges', stateIn('#managingProcessors.idle')]),
    isStagedProcessor: ({ context }, params: { id: string }) => {
      const processorRef = context.processorsRefs.find((p) => p.id === params.id);

      if (!processorRef) return false;
      return processorRef.getSnapshot().context.isNew;
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoMUMCMSAbDAL2qkOPIGIBtABgC6iUAAcA9rFoYxKYSAAeiALQB2AIwAWChoAcAZgBMavgY16ArGsMAaEAE9lxgGx8KKlUYCcV85afmNAF9A21RMXA5SSmopRhY2SO4eNSEkEHFJOhk5RQQlJ08nCgNzJyc9FT4+Qo01J1sHPM9PVz01FrUdDQ6XT2DQ9Gx8IiiqGjo41hQoADE0MTIAVTQGLgBXFbHYpmZIflTRCSlstNz8zx0KT18dcza+Sz1yhuUdPkun9Qs+NRLPAz0-XAgwiI3IFFgYAIaxEAHF5gBrADCYgYDDAWCyKC4EBkYDGADcxAj8ZDoXDESi0Risfs5BljrJTsoNFUKDoVHo+Hpak9fHcXnknN0KMY1KUdMYSuZPCogWEholKGSYfDiVT0ZjpNiwGh5mgKCIGCQCAAzMRoZVQ1WU1Ga2mCelHLE5FmeCh8YW1Xx6bwtPQ6QWqSraKyeMwlPgqTxPeUg4acSicCB2LiwMFJjFgDAEvaOtIMl1pRpKO4GbTNDQGcPCyztWy5MNFHnGPRtcUXIIhYHhBOjZN2CEZqgQdFp4fEMl0gvO7WuhBlNSipwcwwqJwGFTmAyB+yINTGcxuC7VTfmHSSjRdga9pUUAdDxMjsfpp8wiAmsDTw6ZOfMvJVkeuilH6ZhOL8grGNcFDlC0fDei4F5xreE6kCmj6jO+JpsDieKEsS+IwpCaAEEqACCmIWt+6SzicoBnIU2hXlWpicmo7gWJBnquCuMoaAUVQxt4yGKqhJDoa+mEiB+dDTFwur6oaxpmhalBEbqpEZhRBBUfmP6MvOmhHhY1ZtEYUYqKuXEqFodQGDubSsg8nQiaCT4PgquBkKgBDrJssB2CgWDUYWf70YgARFJWdRch4mhdIKhgep0K46Bc24yu4rl9uCHnxt5KC+TJJB4GIGxYPiuAkNMX56TRv50QoEUAsU4bXMKnrtNGQZWK4VgGOBhR-Nc2V3nlvYFUVJolWVaAVRQxVIjg1UwCFtFMuFCAaFuVw6KYwqdIUMqaEGXJaEYPI2RdMorqNYnoZ5OCTQtGCwEaJB2AkGBkGsynalwIjzBVsCwBasAUOJEBrQ1G1NXkFR6KKXgcrU+i9PUe7w2YbgPACUZcuY8Fyt2j1jWhg6Pc9ECve9n3THg32-dhMgA0DcCg2g4PEBaEC6tDBn-qWS7mOoGgBDy3Q6INp3Y5U26xQTRN3e55MUJTPkvW9xp0+wjN-SzgNiMDHMUFVNX80Wm3nOWdS+PFNnqNcMuI3LeOcg8Ssk-GZPiRT+Ua9TWsfV9P369ihvGxaEIkLmFthXDSj-CorUxeu-rsWozs4-L+Me9t5jK-2qvq4Vmu0yHTNYmmevMyg95gKak44HHjWNvoMHrr6tzruB3K7iWnQ2+47ybntvxlE4he5cX-ul4H5f0zXWIUASGBgAA7gAItNAAKxCrxv1eh7XK9r1vUI0pAMxrwwECwC3sNnMKiOdOeNmHvZBiCiu2jqBx-jpQeFPTMvs1azwIGXbWFcw6nw3tvAgJA95gAPuvI+ldtSm2WjVJBKDN5G1gNfBgBA+Z1VCq3ZQ-wjyFAeP8bo7g0qnSApKHkbwbi6GvD2USKtQElwgfPKBi9j7L1wbvfeZ9WbILPlSNYZAUDgwAFQP3nKWC4FAAjeHKNyboXIv6Y0Tpca4xgPDnisBeAawD648PAZA4Ogj0EyFgefYhmIr43zvmgmBIiEE4LPkowWwpLguAMD8X4XQ2zrkgk8Nwmh1CSgsiLHkFjxpDCpjTARushEYNwRfFxEBr5gFvrADxJ9TRuIUX4q20Z2SclMFUUofJZSCjFhWbcITDAo09EkmeE0NZkGqiQKAbB4EzXKnAU2DAJCQBxNNUqozwZiBEKgAAsv0mAk0KkJ1oaKK6f8PDlE5E0pKlQWgchFlGH4fQvYoW4Q9axfSUADKGTM2awMKALNQNMhBsy5pjKwBMyEKyHlrJ8hsp+RyLzuFlL6QoG5DnlmOe8LclRKjtC6VYnppd7mPOmMM75rz3nYmKnisZkNQWvA3FcXi4EAxlAloKUoUU2JOEsrUcMaLbkYogViwZOLnlzLeYswlfKfkLQKRfMlQpPQwXDE8KsB4oUaHpeUdkV51znhlFUXQ7K-acooNytge8jbszBs+MArMjUgxNaS0h61lHigPMUbcll1w2VuDGHqMEdwmFqNKEe4EC5XK4UXdFKTemrINWzS1nNTXmsjtG7maBeZoAlUoe1S4SijxdcBd1eiRQbjeKYX4vg-XarAbq-V0xDVxvBlgTgskoCxuNQaWAMdaoHHqgLK28UlzlFKFUdi2a9CRK0CYPaJQUbdDqDoUtvC9XhsrZGjmNa604Qjk2021UKoMBTd2mCFgXA-FdTKIdmNTDlhcL2xFV4NHTsDW5YNHLQ2YvnVAKtTbl2kHrY2qNatqYEB3boHt+7+1HpzY0AmopPTfAnd4YmN4g3TxDV5MNQKI0WqXabFdck10-rNqtG1MM7WAb3X2w9g7ErMpglBwmMH2IzruS+t9UbwaQCkNhxdVqIBQwI52hOmhvAeghSUAdbqT2NG2kUToqq37Xro3enKIDH3Iefahhd6GTWsa-Thk2vN0TEIAwJ94HJhOgbE4gcCS4uhRnHTZSdcHOH3sQ0pp6KHsWvo49GzTq6PPR1jjxy2fHJ2CeM5YUzQZZSeoLT64te1J7yZ9s556Fb3Pqc83+7zqWN1BQKQZpcRnjEiePT1Zp+bvVFpo+YoEKAxC83gGkUmGYnSEcFp0KWbgnUcmZeRvRB5LBuDintKMaU-gWJiBMHYCRGszma1bC47oLD8W+N6AtPUoMensnUaMpROTnlG+MegE3phzAWMsBgTXeNnHUEUASAI0otEA54cLphtB3DbNucU9lowWJVBSdUdoaTxzIY-Fk7cxYHl+L12UF5FV6K26GVkA1mXj0SfF4cUBbTUi1DIGYJAMAMA2GAc7AXcgAi0NuDknIkXin4uYIM7glzeF9NGOyplLnwcc4pxo+lieOH0JcLcmauuiaDMdbOphVyyjKBwhrNzBySXIET+OZxtqI2AgUdoYEIKYxaEedoB49q+BsrKezMuH1y+HBgUchPpsXccGUDuNSzHsV8CUQUzRz3eH4n8AaZhASo9lxhcEWF62K-IXkdo5YzCtfKMyionpaeY1+PZHGLr-CfYKLe9nCnLGJZ8qH4H4foyuAF86oXRXc1tGKLjJ4bQCiVE6f7s3Zan18LSbYjJ9jYZA+UVCylNDTDG4YXogEqu6zcmaIJBb9HdX8PbwzTJDivGILERvfPyipbJ1ZB0SyLg1xmYXJcba7FOQANuEAxvTmdUt5sTrefnfHGbxycQvJZS1+C1r8lA8tL+KdAeN-Q-uyDSZ+m40+1+yWuKLycAb+s2Hg2yVYuyA0CMgoiOFAXIlYJQlk541YoBymXKL6EB-KfykyEA0BCcK4yc-gC21YF4aMmcmMFgiMbw7uXg3qe00u3s90V+uBc6qmUABBPy8ygqpBT8kobgbBJilQ5QAI9K3IxQD23I4u8qcWWeCWXBLmKmbmTGS6whjgV07WguYWw+bYSMbw3IlO7ETwbODm2eyS3ByWWhJqlu6IOh4eBQWgJenWhhA8kWZWvqsW4oOB6heBvBDh0atan6bALhqabh+hpeXh+4SUHI7QBQrSG46ggRSWjGHmLG6W0wURdQ4YsRnh3WjQA0ycFQyRtezKG4AaKhqEoMDAuYEAAASmIGIJpImFEV3OyFYB2DHm0G0KtsKMUHFAED6ANFLMEMEEAA */
  id: 'enrichStream',
  context: ({ input, spawn }) => ({
    definition: input.definition,
    dataSourcesRefs: [],
    grokCollection: new GrokCollection(),
    initialProcessorsRefs: [],
    processorsRefs: [],
    urlState: defaultEnrichmentUrlState,
    simulatorRef: spawn('simulationMachine', {
      id: 'simulator',
      input: {
        processors: [],
        streamName: input.definition.stream.name,
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
      entry: [{ type: 'setupProcessors' }, { type: 'setupDataSources' }],
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
                  actions: [
                    { type: 'sendResetEventToSimulator' },
                    raise({ type: 'simulation.viewDataPreview' }),
                  ],
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
                  processors: getConfiguredProcessors(context),
                  fields: getUpsertWiredFields(context),
                }),
                onDone: {
                  target: 'idle',
                  actions: [{ type: 'notifyUpsertStreamSuccess' }, { type: 'refreshDefinition' }],
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
                  entry: [{ type: 'sendProcessorsEventToSimulator', params: ({ event }) => event }],
                  on: {
                    'processor.edit': {
                      guard: 'hasSimulatePrivileges',
                      target: 'editing',
                    },
                    'processors.add': {
                      guard: 'hasSimulatePrivileges',
                      target: 'creating',
                      actions: [{ type: 'addProcessor', params: ({ event }) => event }],
                    },
                    'processors.reorder': {
                      guard: 'canReorderProcessors',
                      actions: [
                        { type: 'reorderProcessors', params: ({ event }) => event },
                        { type: 'sendProcessorsEventToSimulator', params: ({ event }) => event },
                      ],
                    },
                    'processors.updateAll': {
                      guard: 'hasSimulatePrivileges',
                      actions: [
                        { type: 'updateAllProcessors', params: ({ event }) => event },
                        { type: 'sendProcessorsEventToSimulator', params: ({ event }) => event },
                      ],
                    },
                  },
                },
                creating: {
                  id: 'creatingProcessor',
                  entry: [{ type: 'sendProcessorsEventToSimulator', params: ({ event }) => event }],
                  on: {
                    'processor.change': {
                      actions: [
                        {
                          type: 'updateGrokCollectionCustomPatterns',
                          params: ({ event }) => event,
                        },
                        { type: 'sendProcessorsEventToSimulator', params: ({ event }) => event },
                      ],
                    },
                    'processor.delete': {
                      target: 'idle',
                      actions: [
                        stopChild(({ event }) => event.id),
                        { type: 'deleteProcessor', params: ({ event }) => event },
                      ],
                    },
                    'processor.save': {
                      target: 'idle',
                      actions: [{ type: 'reassignProcessors' }],
                    },
                  },
                },
                editing: {
                  id: 'editingProcessor',
                  entry: [{ type: 'sendProcessorsEventToSimulator', params: ({ event }) => event }],
                  on: {
                    'processor.change': {
                      actions: [
                        { type: 'sendProcessorsEventToSimulator', params: ({ event }) => event },
                      ],
                    },
                    'processor.cancel': 'idle',
                    'processor.delete': {
                      target: 'idle',
                      actions: [
                        stopChild(({ event }) => event.id),
                        { type: 'deleteProcessor', params: ({ event }) => event },
                      ],
                    },
                    'processor.save': {
                      target: 'idle',
                      actions: [{ type: 'reassignProcessors' }],
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
}: StreamEnrichmentServiceDependencies): MachineImplementationsFrom<
  typeof streamEnrichmentMachine
> => ({
  actors: {
    initializeUrl: createUrlInitializerActor({ core, urlStateStorageContainer }),
    upsertStream: createUpsertStreamActor({ streamsRepositoryClient }),
    setupGrokCollection: setupGrokCollectionActor(),
    processorMachine,
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
