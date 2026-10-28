/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPlaceholderFor } from '@kbn/xstate-utils';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { and, assign, enqueueActions, fromPromise, not, sendTo, setup, stateIn } from 'xstate';
import type { ActorRefFrom, AnyActorRef, MachineImplementationsFrom } from 'xstate';
import {
  STREAMS_DEFAULT_UNIT_ID,
  type ResolveUnitIndicesResponse,
  type ResolvedDestinationIndex,
} from '@kbn/streams-plugin/common';
import {
  collectUnitComponentIds,
  getSignalTargetsWritePatterns,
  type StreamsUnit,
} from '@kbn/streams-schema';
import { notifyUnitUpdated } from '../../notify_unit_updated';
import { createDestinationId } from '../destination_helpers';
import { canSubmitDestinationForm } from '../destination_form';
import {
  createUnitDestination,
  getConfiguredDestinations,
  getDestinationCreateSpec,
  getUnitDestinations,
  toDestinationViewModel,
  toS3DestinationViewModel,
  withUnitDestinations,
} from '../destination_models';
import { createS3UnitDestination, s3CredentialNames } from '../s3_destination_models';
import {
  createDestinationApiKeyServices,
  type DestinationApiKey,
  type DestinationApiKeyGenerationDeps,
  type DestinationApiKeyServices,
} from '../destination_api_keys';
import type {
  DestinationCreationFormData,
  DestinationSignalTargets,
  DestinationViewModel,
} from '../types';
import type { DestinationIndexStatsTimeRange } from '../destination_index_stats';
import {
  createDestinationDetailMachineImplementations,
  destinationDetailStateMachine,
  type DestinationDetailActorRef,
} from './destination_detail_state_machine';
import { removeComponentFromPipelines } from '../../../../services/unit_connections';
import type { Unit } from '../../../../services/unit_repository';
import { getFormattedError } from '../../../../util/errors';

export interface DestinationsParentEvent {
  type: 'unit.changed';
  unitDefinition: Unit;
  destinationIds: string[];
  intent: 'create' | 'delete';
  secrets?: StreamsUnit.Secrets;
}

export interface DestinationsStateInput {
  unitDefinition: Unit;
  parentRef: AnyActorRef;
}

export interface PendingDestination extends DestinationSignalTargets {
  id: string;
  /** API key write-role globs. */
  patterns: string[];
}

/** A submitted create form and what has been staged from it. */
export interface DestinationCreationContext {
  formData: DestinationCreationFormData;
  pendingDestination?: PendingDestination;
  createdDestination?: DestinationViewModel;
}

export type ResolvedIndicesStatus = 'loading' | 'ready' | 'unavailable';

export interface DestinationsStateContext {
  unitDefinition: Unit;
  creationContext?: DestinationCreationContext;
  selectedDestinationId?: string;
  persistenceError?: string;
  apiKeyError?: string;
  hasReceivedUnit: boolean;
  parentRef: AnyActorRef;
  resolvedIndicesByDestination: Record<string, ResolvedDestinationIndex[]>;
  resolvedIndicesError?: string;
  /** Spawned the first time a destination's details are shown. */
  destinationDetailRefs: Record<string, DestinationDetailActorRef>;
}

export type DestinationsStateEvent =
  | { type: 'unit.loaded'; unitDefinition: Unit }
  | { type: 'unit.save.started' }
  | { type: 'unit.save.finished' }
  | { type: 'unit.persisted'; destinationIds: string[]; unitDefinition: Unit }
  | {
      type: 'unit.persistenceFailed';
      destinationIds: string[];
      unitDefinition: Unit;
      message: string;
      intent: 'create' | 'delete';
    }
  | { type: 'destination.create'; formData: DestinationCreationFormData }
  | { type: 'destination.delete'; destinationId: string }
  | { type: 'destination.deleteMany'; destinationIds: string[] }
  | { type: 'destination.view'; destinationId: string }
  | { type: 'modal.openCreate' }
  | { type: 'modal.closeCreate' }
  | { type: 'flyout.close' }
  | { type: 'xstate.done.actor.generateApiKey'; output: DestinationApiKey }
  | { type: 'xstate.error.actor.generateApiKey'; error: unknown }
  | { type: 'resolvedIndices.reload' }
  | { type: 'xstate.done.actor.loadResolvedIndices'; output: ResolveUnitIndicesResponse }
  | { type: 'xstate.error.actor.loadResolvedIndices'; error: unknown }
  | {
      type: 'indexStats.request';
      destinationId: string;
      timeRange: DestinationIndexStatsTimeRange;
    };

const removeDestinationsFromContext = (
  context: Pick<DestinationsStateContext, 'unitDefinition' | 'selectedDestinationId'>,
  destinationIds: readonly string[]
) => {
  const removed = new Set(destinationIds);
  const unitDefinition = [...removed].reduce(
    (unit, destinationId) => removeComponentFromPipelines(unit, destinationId),
    withUnitDestinations(
      context.unitDefinition,
      getUnitDestinations(context.unitDefinition).filter(({ id }) => !removed.has(id))
    )
  );
  return {
    unitDefinition,
    selectedDestinationId:
      context.selectedDestinationId && removed.has(context.selectedDestinationId)
        ? undefined
        : context.selectedDestinationId,
  };
};

export const destinationsStateMachine = setup({
  types: {
    input: {} as DestinationsStateInput,
    context: {} as DestinationsStateContext,
    events: {} as DestinationsStateEvent,
  },
  actors: {
    generateApiKey: getPlaceholderFor(createGenerateApiKeyActor),
    loadResolvedIndices: getPlaceholderFor(createLoadResolvedIndicesActor),
    destinationDetail: destinationDetailStateMachine,
  },
  actions: {
    notifyDestinationCreated: getPlaceholderFor(createNotifyDestinationCreatedAction),
    notifyDestinationDeleted: getPlaceholderFor(createNotifyDestinationDeletedAction),
    revokePendingDestinationApiKey: getPlaceholderFor(createRevokePendingDestinationApiKeyAction),
    notifyResolvedIndicesError: getPlaceholderFor(createNotifyResolvedIndicesErrorAction),
    storeResolvedIndices: assign(({ event }) => {
      if (event.type !== 'xstate.done.actor.loadResolvedIndices') {
        return {};
      }
      return {
        resolvedIndicesByDestination: Object.fromEntries(
          Object.entries(event.output.destinations).map(([destinationId, { indices }]) => [
            destinationId,
            indices,
          ])
        ),
        resolvedIndicesError: undefined,
      };
    }),
    clearResolvedIndices: assign({
      resolvedIndicesByDestination: {},
      resolvedIndicesError: undefined,
    }),
    spawnDestinationDetail: assign(({ context, event, spawn }) => {
      if (event.type !== 'indexStats.request') {
        return {};
      }
      const { destinationId } = event;
      return {
        destinationDetailRefs: {
          ...context.destinationDetailRefs,
          [destinationId]: spawn('destinationDetail', {
            id: `destinationDetail-${destinationId}`,
            input: {
              destinationId,
              indices: context.resolvedIndicesByDestination[destinationId] ?? [],
            },
          }),
        },
      };
    }),
    // Spawned while indices are resolving; the detail waits for `indices.update`.
    spawnPendingDestinationDetail: assign(({ context, event, spawn }) => {
      if (event.type !== 'indexStats.request') {
        return {};
      }
      const { destinationId } = event;
      return {
        destinationDetailRefs: {
          ...context.destinationDetailRefs,
          [destinationId]: spawn('destinationDetail', {
            id: `destinationDetail-${destinationId}`,
            input: { destinationId },
          }),
        },
      };
    }),
    forwardIndexStatsRequest: enqueueActions(({ context, event, enqueue }) => {
      if (event.type !== 'indexStats.request') {
        return;
      }
      const detailRef = context.destinationDetailRefs[event.destinationId];
      if (detailRef) {
        enqueue.sendTo(detailRef, { type: 'indexStats.request', timeRange: event.timeRange });
      }
    }),
    resetDestinationDetails: enqueueActions(({ context, enqueue }) => {
      for (const detailRef of Object.values(context.destinationDetailRefs)) {
        enqueue.sendTo(detailRef, { type: 'indices.reset' });
      }
    }),
    updateDestinationDetails: enqueueActions(({ context, enqueue }) => {
      const destinationIds = new Set(
        getUnitDestinations(context.unitDefinition).map(({ id }) => id)
      );
      const destinationDetailRefs: Record<string, DestinationDetailActorRef> = {};
      for (const [destinationId, detailRef] of Object.entries(context.destinationDetailRefs)) {
        if (!destinationIds.has(destinationId)) {
          enqueue.stopChild(detailRef);
          continue;
        }
        destinationDetailRefs[destinationId] = detailRef;
        enqueue.sendTo(detailRef, {
          type: 'indices.update',
          indices: context.resolvedIndicesByDestination[destinationId] ?? [],
        });
      }
      enqueue.assign({ destinationDetailRefs });
    }),
    storeResolvedIndicesError: assign(({ event }) =>
      event.type === 'xstate.error.actor.loadResolvedIndices'
        ? { resolvedIndicesError: getFormattedError(event.error).message }
        : {}
    ),
    syncLoadedUnit: assign(({ context, event }) => {
      if (event.type !== 'unit.loaded' && event.type !== 'unit.persisted') {
        return {};
      }
      const destinationIds = new Set(
        getConfiguredDestinations(event.unitDefinition).map(({ id }) => id)
      );
      return {
        unitDefinition: event.unitDefinition,
        hasReceivedUnit: true,
        persistenceError: undefined,
        selectedDestinationId:
          context.selectedDestinationId && destinationIds.has(context.selectedDestinationId)
            ? context.selectedDestinationId
            : undefined,
      };
    }),
    clearCreate: assign({
      creationContext: undefined,
      persistenceError: undefined,
      apiKeyError: undefined,
    }),
    storeCreationForm: assign(({ event }) =>
      event.type === 'destination.create'
        ? { creationContext: { formData: event.formData }, apiKeyError: undefined }
        : {}
    ),
    stageCreatedS3Destination: assign(({ context }) => {
      if (!context.creationContext) {
        return {};
      }
      const { destinationName, description, s3 } = context.creationContext.formData;
      const name = destinationName.trim();
      const id = createDestinationId({
        name,
        existingIds: collectUnitComponentIds(context.unitDefinition.unit),
      });
      const node = createS3UnitDestination({
        id,
        name,
        description,
        region: s3.region.trim(),
        bucket: s3.bucket.trim(),
        prefix: s3.prefix.trim(),
      });
      return {
        creationContext: {
          ...context.creationContext,
          createdDestination: toS3DestinationViewModel(node),
        },
        unitDefinition: withUnitDestinations(context.unitDefinition, [
          ...getUnitDestinations(context.unitDefinition),
          node,
        ]),
        persistenceError: undefined,
        apiKeyError: undefined,
      };
    }),
    assignPendingDestination: assign(({ context }) => {
      if (!context.creationContext) {
        return {};
      }
      const spec = getDestinationCreateSpec(context.creationContext.formData.elasticsearch);
      const pendingDestination: PendingDestination = {
        ...spec,
        id: createDestinationId({
          name: context.creationContext.formData.destinationName.trim(),
          existingIds: collectUnitComponentIds(context.unitDefinition.unit),
        }),
        patterns: getSignalTargetsWritePatterns(spec),
      };
      return {
        creationContext: { ...context.creationContext, pendingDestination },
        apiKeyError: undefined,
      };
    }),
    stageCreatedDestination: assign(({ context, event }) => {
      if (event.type !== 'xstate.done.actor.generateApiKey' || !context.creationContext) {
        return {};
      }
      const { destinationName, description, storageKind } = context.creationContext.formData;
      const { pendingDestination } = context.creationContext;
      if (storageKind !== 'local_elasticsearch' || !pendingDestination) {
        return {};
      }
      const { id, signals, indexBySignal, writePatternsBySignal } = pendingDestination;
      const unitDestination = createUnitDestination({
        id,
        name: destinationName.trim(),
        description,
        signals,
        indexBySignal,
        writePatternsBySignal,
        apiKey: event.output.encoded,
      });
      const createdDestination = toDestinationViewModel(unitDestination);
      if (!createdDestination) {
        return {};
      }
      const unitDefinition = withUnitDestinations(context.unitDefinition, [
        ...getUnitDestinations(context.unitDefinition).filter(
          (destination) => destination.id !== id
        ),
        unitDestination,
      ]);
      return {
        creationContext: { ...context.creationContext, createdDestination },
        unitDefinition,
        persistenceError: undefined,
        apiKeyError: undefined,
      };
    }),
    storeApiKeyError: assign(({ event }) =>
      event.type === 'xstate.error.actor.generateApiKey'
        ? { apiKeyError: getFormattedError(event.error).message }
        : {}
    ),
    notifyParentCreate: sendTo(
      ({ context }) => context.parentRef,
      ({ context }): DestinationsParentEvent => {
        const createdDestination = context.creationContext?.createdDestination;
        if (!context.creationContext || !createdDestination) {
          throw new Error('Expected a created destination');
        }
        const { storageKind, s3 } = context.creationContext.formData;
        const names = s3CredentialNames(createdDestination.id);
        return {
          type: 'unit.changed',
          unitDefinition: context.unitDefinition,
          destinationIds: [createdDestination.id],
          intent: 'create',
          secrets:
            storageKind === 'external_storage'
              ? {
                  [names.accessKeyId]: s3.accessKeyId.trim(),
                  [names.secretAccessKey]: s3.secretAccessKey.trim(),
                }
              : undefined,
        };
      }
    ),
    deleteDestination: assign(({ context, event }) => {
      if (event.type !== 'destination.delete') {
        return {};
      }
      return removeDestinationsFromContext(context, [event.destinationId]);
    }),
    deleteDestinations: assign(({ context, event }) => {
      if (event.type !== 'destination.deleteMany') {
        return {};
      }
      return removeDestinationsFromContext(context, event.destinationIds);
    }),
    notifyParentDelete: sendTo(
      ({ context }) => context.parentRef,
      ({ context, event }): DestinationsParentEvent => {
        if (event.type !== 'destination.delete') {
          throw new Error('Expected destination.delete');
        }
        return {
          type: 'unit.changed',
          unitDefinition: context.unitDefinition,
          destinationIds: [event.destinationId],
          intent: 'delete',
        };
      }
    ),
    notifyParentDeleteMany: sendTo(
      ({ context }) => context.parentRef,
      ({ context, event }): DestinationsParentEvent => {
        if (event.type !== 'destination.deleteMany' || event.destinationIds.length === 0) {
          throw new Error('Expected destinations to delete');
        }
        return {
          type: 'unit.changed',
          unitDefinition: context.unitDefinition,
          destinationIds: event.destinationIds,
          intent: 'delete',
        };
      }
    ),
    selectViewedDestination: assign({
      selectedDestinationId: ({ event }) =>
        event.type === 'destination.view' ? event.destinationId : undefined,
      persistenceError: undefined,
    }),
    closeFlyout: assign({
      selectedDestinationId: undefined,
      persistenceError: undefined,
    }),
    storePersistenceError: assign(({ context, event }) =>
      event.type === 'unit.persistenceFailed'
        ? {
            unitDefinition: event.unitDefinition,
            persistenceError: event.message,
            creationContext: context.creationContext
              ? {
                  ...context.creationContext,
                  formData: {
                    ...context.creationContext.formData,
                    s3: {
                      ...context.creationContext.formData.s3,
                      accessKeyId: '',
                      secretAccessKey: '',
                    },
                  },
                }
              : undefined,
          }
        : {}
    ),
    restoreUnitAfterPersistenceFailure: assign(({ event }) =>
      event.type === 'unit.persistenceFailed'
        ? { unitDefinition: event.unitDefinition, persistenceError: event.message }
        : {}
    ),
  },
  guards: {
    hasDestinationDetail: ({ context, event }) =>
      event.type === 'indexStats.request' &&
      Boolean(context.destinationDetailRefs[event.destinationId]),
    canCreateDestination: ({ context, event }) =>
      event.type === 'destination.create' &&
      canSubmitDestinationForm({
        formData: event.formData,
        unitDefinition: context.unitDefinition,
      }),
    isCreatedDestination: ({ context, event }) => {
      const createdDestinationId = context.creationContext?.createdDestination?.id;
      return (
        (event.type === 'unit.persisted' ||
          (event.type === 'unit.persistenceFailed' && event.intent === 'create')) &&
        createdDestinationId !== undefined &&
        event.destinationIds.includes(createdDestinationId)
      );
    },
    hasDestinationsToDelete: ({ event }) =>
      event.type === 'destination.deleteMany' && event.destinationIds.length > 0,
    loadedUnitRemovedViewedDestination: ({ context, event }) =>
      (event.type === 'unit.loaded' || event.type === 'unit.persisted') &&
      Boolean(
        context.selectedDestinationId &&
          !getConfiguredDestinations(event.unitDefinition).some(
            ({ id }) => id === context.selectedDestinationId
          )
      ),
    // The first unit load is already being resolved. Every later load also refreshes cluster state.
    hasPreviouslyLoadedUnit: ({ context, event }) =>
      event.type === 'unit.loaded' && context.hasReceivedUnit,
    isExternalStorage: ({ event }) =>
      event.type === 'destination.create' && event.formData.storageKind === 'external_storage',
    isDeletePersistenceFailure: ({ event }) =>
      event.type === 'unit.persistenceFailed' && event.intent === 'delete',
    unitSaveIsIdle: stateIn('#destinationsUnitSaveIdle'),
  },
}).createMachine({
  id: 'streamsDestinations',
  type: 'parallel',
  context: ({ input }) => ({
    unitDefinition: input.unitDefinition,
    hasReceivedUnit: false,
    parentRef: input.parentRef,
    resolvedIndicesByDestination: {},
    destinationDetailRefs: {},
  }),
  on: {
    'unit.loaded': { actions: 'syncLoadedUnit' },
    'unit.persisted': { actions: ['syncLoadedUnit', 'notifyDestinationDeleted'] },
    'unit.persistenceFailed': {
      guard: 'isDeletePersistenceFailure',
      actions: 'restoreUnitAfterPersistenceFailure',
    },
    'destination.delete': {
      guard: 'unitSaveIsIdle',
      actions: ['deleteDestination', 'notifyParentDelete', 'closeFlyout'],
    },
    'destination.deleteMany': {
      guard: and(['unitSaveIsIdle', 'hasDestinationsToDelete']),
      actions: ['deleteDestinations', 'notifyParentDeleteMany'],
    },
  },
  states: {
    configuring: {
      initial: 'idle',
      states: {
        idle: {
          id: 'configuringIdle',
          on: {
            'modal.openCreate': {
              guard: 'unitSaveIsIdle',
              target: 'supplyingConfiguration',
              actions: 'clearCreate',
            },
          },
        },
        supplyingConfiguration: {
          on: {
            'destination.create': [
              {
                target: 'persisting',
                guard: and(['isExternalStorage', 'canCreateDestination', 'unitSaveIsIdle']),
                actions: ['storeCreationForm', 'stageCreatedS3Destination', 'notifyParentCreate'],
              },
              {
                target: 'mintingApiKey',
                guard: and(['canCreateDestination', 'unitSaveIsIdle', not('isExternalStorage')]),
                actions: ['storeCreationForm', 'assignPendingDestination'],
              },
            ],
            'modal.closeCreate': { target: 'idle', actions: 'clearCreate' },
          },
        },
        mintingApiKey: {
          invoke: {
            id: 'generateApiKey',
            src: 'generateApiKey',
            input: ({ context }) => {
              const pendingDestination = context.creationContext?.pendingDestination;
              if (!pendingDestination) {
                throw new Error('Expected a pending destination');
              }
              return {
                destinationId: pendingDestination.id,
                patterns: pendingDestination.patterns,
              };
            },
            onDone: {
              target: 'persisting',
              actions: ['stageCreatedDestination', 'notifyParentCreate'],
            },
            onError: {
              target: 'supplyingConfiguration',
              actions: 'storeApiKeyError',
            },
          },
        },
        persisting: {
          on: {
            'unit.persisted': {
              guard: 'isCreatedDestination',
              target: 'idle',
              actions: ['syncLoadedUnit', 'notifyDestinationCreated', 'clearCreate'],
            },
            'unit.persistenceFailed': {
              guard: 'isCreatedDestination',
              target: 'failed',
              actions: ['revokePendingDestinationApiKey', 'storePersistenceError'],
            },
          },
        },
        failed: {
          on: {
            'modal.closeCreate': { target: 'idle', actions: 'clearCreate' },
          },
        },
      },
    },
    unitSave: {
      initial: 'idle',
      states: {
        idle: {
          id: 'destinationsUnitSaveIdle',
          on: {
            'unit.save.started': { target: 'saving' },
          },
        },
        saving: {
          on: {
            'unit.save.finished': { target: 'idle' },
          },
        },
      },
    },
    resolvedIndices: {
      initial: 'loading',
      on: {
        'resolvedIndices.reload': { target: '.loading' },
        'unit.persisted': { target: '.loading' },
        'unit.loaded': { guard: 'hasPreviouslyLoadedUnit', target: '.loading' },
      },
      states: {
        loading: {
          entry: ['resetDestinationDetails', 'clearResolvedIndices'],
          on: {
            'indexStats.request': [
              { guard: 'hasDestinationDetail', actions: 'forwardIndexStatsRequest' },
              {
                actions: ['spawnPendingDestinationDetail', 'forwardIndexStatsRequest'],
              },
            ],
          },
          invoke: {
            id: 'loadResolvedIndices',
            src: 'loadResolvedIndices',
            onDone: {
              target: 'ready',
              actions: 'storeResolvedIndices',
            },
            onError: {
              target: 'unavailable',
              actions: ['storeResolvedIndicesError', 'notifyResolvedIndicesError'],
            },
          },
        },
        ready: {
          entry: 'updateDestinationDetails',
          on: {
            'indexStats.request': [
              { guard: 'hasDestinationDetail', actions: 'forwardIndexStatsRequest' },
              {
                actions: ['spawnDestinationDetail', 'forwardIndexStatsRequest'],
              },
            ],
          },
        },
        unavailable: {
          entry: 'updateDestinationDetails',
          on: {
            'resolvedIndices.reload': { target: 'loading' },
            'indexStats.request': [
              { guard: 'hasDestinationDetail', actions: 'forwardIndexStatsRequest' },
              {
                actions: ['spawnDestinationDetail', 'forwardIndexStatsRequest'],
              },
            ],
          },
        },
      },
    },
    flyout: {
      initial: 'closed',
      on: {
        'destination.view': {
          target: '.open',
          reenter: true,
          actions: 'selectViewedDestination',
        },
        'flyout.close': { target: '.closed', actions: 'closeFlyout' },
        'modal.openCreate': { target: '.closed', actions: 'closeFlyout' },
        'unit.loaded': {
          guard: 'loadedUnitRemovedViewedDestination',
          target: '.closed',
          actions: ['syncLoadedUnit', 'closeFlyout'],
        },
        'unit.persisted': {
          guard: 'loadedUnitRemovedViewedDestination',
          target: '.closed',
          actions: ['syncLoadedUnit', 'notifyDestinationDeleted', 'closeFlyout'],
        },
      },
      states: {
        closed: {},
        open: {},
      },
    },
  },
});

export type DestinationsActorRef = ActorRefFrom<typeof destinationsStateMachine>;

// Keyed by unit so unrelated context updates keep the same array, which the grid relies on.
const destinationViewModelsByUnit = new WeakMap<
  DestinationsStateContext['unitDefinition'],
  DestinationViewModel[]
>();

export const getDestinationViewModels = ({
  unitDefinition,
}: DestinationsStateContext): DestinationViewModel[] => {
  const cachedDestinationViewModels = destinationViewModelsByUnit.get(unitDefinition);
  if (cachedDestinationViewModels) {
    return cachedDestinationViewModels;
  }

  const destinationViewModels = getConfiguredDestinations(unitDefinition);
  destinationViewModelsByUnit.set(unitDefinition, destinationViewModels);
  return destinationViewModels;
};

type Toasts = CoreStart['notifications']['toasts'];

function createNotifyDestinationCreatedAction({ toasts }: { toasts: Toasts }) {
  return () => {
    toasts.addSuccess({
      title: i18n.translate('xpack.streams.destinations.destinationCreatedSuccessTitle', {
        defaultMessage: 'New destination configured',
      }),
    });
  };
}

function createNotifyDestinationDeletedAction({ toasts }: { toasts: Toasts }) {
  return ({ event }: { event: DestinationsStateEvent }) => {
    if (event.type !== 'unit.persisted' || event.destinationIds.length === 0) {
      return;
    }
    const remainingDestinationIds = new Set(
      getConfiguredDestinations(event.unitDefinition).map(({ id }) => id)
    );
    if (event.destinationIds.some((destinationId) => remainingDestinationIds.has(destinationId))) {
      return;
    }
    notifyUnitUpdated(toasts);
  };
}

const revokeDestinationApiKey = async ({
  services,
  toasts,
  destinationId,
}: {
  services: DestinationApiKeyServices;
  toasts: Toasts;
  destinationId: string;
}): Promise<void> => {
  try {
    await services.delete(destinationId);
  } catch {
    toasts.addWarning({
      title: i18n.translate('xpack.streams.destinations.unusedApiKeyRevokeFailedTitle', {
        defaultMessage: 'Could not revoke the unused API key',
      }),
      text: i18n.translate('xpack.streams.destinations.unusedApiKeyRevokeFailedText', {
        defaultMessage:
          'The API key created for {destinationId} is still active. Invalidate it from Stack Management > API keys.',
        values: { destinationId },
      }),
    });
  }
};

function createGenerateApiKeyActor({ services }: { services: DestinationApiKeyServices }) {
  return fromPromise(
    async ({
      input: { destinationId, patterns },
    }: {
      input: { destinationId: string; patterns: string[] };
    }): Promise<DestinationApiKey> => services.generate(destinationId, patterns)
  );
}

function createRevokePendingDestinationApiKeyAction({
  services,
  toasts,
}: {
  services: DestinationApiKeyServices;
  toasts: Toasts;
}) {
  return ({ context }: { context: DestinationsStateContext }) => {
    const destinationId = context.creationContext?.pendingDestination?.id;
    if (destinationId) {
      void revokeDestinationApiKey({ services, toasts, destinationId });
    }
  };
}

function createLoadResolvedIndicesActor({
  streamsRepositoryClient,
}: DestinationApiKeyGenerationDeps) {
  return fromPromise(async ({ signal }): Promise<ResolveUnitIndicesResponse> => {
    return streamsRepositoryClient.fetch('GET /internal/streams/unit/{id}/_resolve_indices', {
      params: { path: { id: STREAMS_DEFAULT_UNIT_ID } },
      signal,
    });
  });
}

function createNotifyResolvedIndicesErrorAction({ toasts }: { toasts: Toasts }) {
  return ({ event }: { event: DestinationsStateEvent }) => {
    if (event.type !== 'xstate.error.actor.loadResolvedIndices') {
      return;
    }
    toasts.addError(getFormattedError(event.error), {
      title: i18n.translate('xpack.streams.destinations.resolvedIndicesLoadFailedTitle', {
        defaultMessage: 'Could not load destination indices',
      }),
    });
  };
}

export const createDestinationsMachineImplementations = ({
  toasts,
  apiKeyGenerationDeps,
}: {
  toasts: Toasts;
  apiKeyGenerationDeps: DestinationApiKeyGenerationDeps;
}): MachineImplementationsFrom<typeof destinationsStateMachine> => {
  const services = createDestinationApiKeyServices(apiKeyGenerationDeps);
  return {
    actors: {
      generateApiKey: createGenerateApiKeyActor({ services }),
      loadResolvedIndices: createLoadResolvedIndicesActor(apiKeyGenerationDeps),
      destinationDetail: destinationDetailStateMachine.provide(
        createDestinationDetailMachineImplementations(apiKeyGenerationDeps)
      ),
    },
    actions: {
      notifyDestinationCreated: createNotifyDestinationCreatedAction({ toasts }),
      notifyDestinationDeleted: createNotifyDestinationDeletedAction({ toasts }),
      notifyResolvedIndicesError: createNotifyResolvedIndicesErrorAction({ toasts }),
      revokePendingDestinationApiKey: createRevokePendingDestinationApiKeyAction({
        services,
        toasts,
      }),
    },
  };
};
