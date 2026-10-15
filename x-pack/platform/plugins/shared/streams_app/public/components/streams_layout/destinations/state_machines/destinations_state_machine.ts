/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPlaceholderFor } from '@kbn/xstate-utils';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { and, assign, fromPromise, sendTo, setup, stateIn } from 'xstate';
import type { ActorRefFrom, AnyActorRef, MachineImplementationsFrom } from 'xstate';
import { collectUnitComponentIds } from '@kbn/streams-schema';
import { notifyUnitUpdated } from '../../notify_unit_updated';
import { createDestinationId } from '../destination_helpers';
import { canSubmitDestinationForm, getDestinationCreationFormErrors } from '../destination_form';
import {
  createUnitDestination,
  getConfiguredDestinations,
  getDestinationCreateSpecs,
  getDestinationWritePatterns,
  getUnitDestinations,
  toDestinationViewModel,
  withUnitDestinations,
} from '../destination_models';
import {
  createDestinationApiKeyServices,
  type DestinationApiKey,
  type DestinationApiKeyGenerationDeps,
  type DestinationApiKeyServices,
} from '../destination_api_keys';
import type {
  DestinationCreationFormData,
  DestinationCreationFormErrors,
  DestinationSignal,
  DestinationStorageKind,
  DestinationViewModel,
} from '../types';
import { EMPTY_ELASTICSEARCH_DESTINATION_FORM } from '../types';
import { removeComponentFromPipelines } from '../../../../services/unit_connections';
import type { Unit } from '../../../../services/unit_repository';
import { getFormattedError } from '../../../../util/errors';

export type { DestinationCreationFormErrors };

export interface DestinationsParentEvent {
  type: 'unit.changed';
  unitDefinition: Unit;
  destinationIds: string[];
  intent: 'create' | 'delete';
}

export interface DestinationsStateInput {
  unitDefinition: Unit;
  parentRef: AnyActorRef;
}

export interface PendingDestination {
  id: string;
  signal: DestinationSignal;
  index?: string;
  patterns: string[];
}

export interface DestinationCreationContext {
  formData: DestinationCreationFormData;
  formErrors: DestinationCreationFormErrors;
  pendingDestinations?: PendingDestination[];
  createdDestinations?: DestinationViewModel[];
}

export interface DestinationsStateContext {
  unitDefinition: Unit;
  creationContext?: DestinationCreationContext;
  selectedDestinationId?: string;
  persistenceError?: string;
  apiKeyError?: string;
  hasReceivedUnit: boolean;
  parentRef: AnyActorRef;
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
  | { type: 'destination.create' }
  | { type: 'destination.delete'; destinationId: string }
  | { type: 'destination.deleteMany'; destinationIds: string[] }
  | { type: 'destination.view'; destinationId: string }
  | { type: 'storageKind.select'; storageKind: DestinationStorageKind }
  | { type: 'destinationName.change'; destinationName: string }
  | {
      type: 'elasticsearch.change';
      auto?: boolean;
      logsIndex?: string;
      metricsIndex?: string;
      tracesIndex?: string;
    }
  | { type: 'creationForm.blur' }
  | { type: 'modal.openCreate' }
  | { type: 'modal.closeCreate' }
  | { type: 'flyout.close' }
  | { type: 'xstate.done.actor.generateApiKey'; output: DestinationApiKeyGrant[] }
  | { type: 'xstate.error.actor.generateApiKey'; error: unknown };

export interface DestinationApiKeyGrant extends DestinationApiKey {
  destinationId: string;
}

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

const getCreationFormErrors = ({
  formData,
  unitDefinition,
}: {
  formData: DestinationCreationFormData;
  unitDefinition: Unit;
}): DestinationCreationFormErrors => getDestinationCreationFormErrors({ formData, unitDefinition });

/** Keep an empty name quiet until the name field has already shown a required error. */
const withoutUnrevealedRequiredNameError = (
  next: DestinationCreationFormErrors,
  previous: DestinationCreationFormErrors
): DestinationCreationFormErrors => ({
  ...next,
  destinationName:
    next.destinationName === 'required' && previous.destinationName !== 'required'
      ? undefined
      : next.destinationName,
});

export const destinationsStateMachine = setup({
  types: {
    input: {} as DestinationsStateInput,
    context: {} as DestinationsStateContext,
    events: {} as DestinationsStateEvent,
  },
  actors: {
    generateApiKey: getPlaceholderFor(createGenerateApiKeyActor),
  },
  actions: {
    notifyDestinationCreated: getPlaceholderFor(createNotifyDestinationCreatedAction),
    notifyDestinationDeleted: getPlaceholderFor(createNotifyDestinationDeletedAction),
    revokeDestinationApiKeys: getPlaceholderFor(createRevokeDestinationApiKeysAction),
    revokePendingDestinationApiKey: getPlaceholderFor(createRevokePendingDestinationApiKeyAction),
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
        creationContext: context.creationContext
          ? {
              ...context.creationContext,
              formErrors: withoutUnrevealedRequiredNameError(
                getCreationFormErrors({
                  formData: context.creationContext.formData,
                  unitDefinition: event.unitDefinition,
                }),
                context.creationContext.formErrors
              ),
            }
          : undefined,
      };
    }),
    startFreshCreate: assign(() => ({
      creationContext: {
        formData: {
          storageKind: 'local_elasticsearch' as const,
          destinationName: '',
          elasticsearch: { ...EMPTY_ELASTICSEARCH_DESTINATION_FORM },
        },
        formErrors: {},
      },
      persistenceError: undefined,
      apiKeyError: undefined,
    })),
    clearCreate: assign({
      creationContext: undefined,
      persistenceError: undefined,
      apiKeyError: undefined,
    }),
    selectStorageKind: assign(({ context, event }) => {
      if (event.type !== 'storageKind.select' || !context.creationContext) {
        return {};
      }
      const formData: DestinationCreationFormData = {
        ...context.creationContext.formData,
        storageKind: event.storageKind,
      };
      return {
        creationContext: {
          ...context.creationContext,
          formData,
          formErrors: withoutUnrevealedRequiredNameError(
            getCreationFormErrors({
              formData,
              unitDefinition: context.unitDefinition,
            }),
            context.creationContext.formErrors
          ),
        },
      };
    }),
    updateDestinationName: assign(({ context, event }) => {
      if (event.type !== 'destinationName.change' || !context.creationContext) {
        return {};
      }
      return {
        creationContext: {
          ...context.creationContext,
          formData: {
            ...context.creationContext.formData,
            destinationName: event.destinationName,
          },
          formErrors: getCreationFormErrors({
            formData: {
              ...context.creationContext.formData,
              destinationName: event.destinationName,
            },
            unitDefinition: context.unitDefinition,
          }),
        },
      };
    }),
    validateCreationForm: assign(({ context }) =>
      context.creationContext
        ? {
            creationContext: {
              ...context.creationContext,
              formErrors: getCreationFormErrors({
                formData: context.creationContext.formData,
                unitDefinition: context.unitDefinition,
              }),
            },
          }
        : {}
    ),
    updateElasticsearchForm: assign(({ context, event }) => {
      if (event.type !== 'elasticsearch.change' || !context.creationContext) {
        return {};
      }
      const formData: DestinationCreationFormData = {
        ...context.creationContext.formData,
        elasticsearch: {
          ...context.creationContext.formData.elasticsearch,
          ...(event.auto !== undefined ? { auto: event.auto } : {}),
          ...(event.logsIndex !== undefined ? { logsIndex: event.logsIndex } : {}),
          ...(event.metricsIndex !== undefined ? { metricsIndex: event.metricsIndex } : {}),
          ...(event.tracesIndex !== undefined ? { tracesIndex: event.tracesIndex } : {}),
        },
      };
      return {
        creationContext: {
          ...context.creationContext,
          formData,
          formErrors: withoutUnrevealedRequiredNameError(
            getCreationFormErrors({
              formData,
              unitDefinition: context.unitDefinition,
            }),
            context.creationContext.formErrors
          ),
        },
        apiKeyError: undefined,
      };
    }),
    assignPendingDestination: assign(({ context }) => {
      if (!context.creationContext) {
        return {};
      }
      const name = context.creationContext.formData.destinationName.trim();
      const existingIds = [...collectUnitComponentIds(context.unitDefinition.unit)];
      const pendingDestinations: PendingDestination[] = [];
      for (const spec of getDestinationCreateSpecs(
        context.creationContext.formData.elasticsearch
      )) {
        const id = createDestinationId({
          name: `${name}-${spec.signal}`,
          existingIds: [...existingIds, ...pendingDestinations.map((pending) => pending.id)],
        });
        pendingDestinations.push({
          id,
          signal: spec.signal,
          index: spec.index,
          patterns: spec.index
            ? [spec.index]
            : getDestinationWritePatterns({ signal: spec.signal, mode: 'auto' }),
        });
      }
      return {
        creationContext: {
          ...context.creationContext,
          pendingDestinations,
        },
        apiKeyError: undefined,
      };
    }),
    stageCreatedDestination: assign(({ context, event }) => {
      if (event.type !== 'xstate.done.actor.generateApiKey' || !context.creationContext) {
        return {};
      }
      const { destinationName, storageKind } = context.creationContext.formData;
      const pendingDestinations = context.creationContext.pendingDestinations;
      if (storageKind !== 'local_elasticsearch' || !pendingDestinations?.length) {
        return {};
      }
      const name = destinationName.trim();
      const encodedByDestinationId = new Map(
        event.output.map((apiKey) => [apiKey.destinationId, apiKey.encoded])
      );
      const unitDestinations = pendingDestinations.map((pending) =>
        createUnitDestination({
          id: pending.id,
          name,
          signal: pending.signal,
          index: pending.index,
          apiKey: encodedByDestinationId.get(pending.id),
        })
      );
      const createdDestinations = unitDestinations.flatMap((unitDestination) => {
        const destination = toDestinationViewModel(unitDestination);
        return destination ? [destination] : [];
      });
      if (createdDestinations.length === 0) {
        return {};
      }
      const createdIds = new Set(unitDestinations.map(({ id }) => id));
      return {
        creationContext: {
          ...context.creationContext,
          createdDestinations,
        },
        unitDefinition: withUnitDestinations(context.unitDefinition, [
          ...getUnitDestinations(context.unitDefinition).filter(
            ({ id: destinationId }) => !createdIds.has(destinationId)
          ),
          ...unitDestinations,
        ]),
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
        const destinationIds = context.creationContext?.createdDestinations?.map(({ id }) => id);
        if (!destinationIds?.length) {
          throw new Error('Expected created destinations');
        }
        return {
          type: 'unit.changed',
          unitDefinition: context.unitDefinition,
          destinationIds,
          intent: 'create',
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
    storePersistenceError: assign(({ event }) =>
      event.type === 'unit.persistenceFailed'
        ? { unitDefinition: event.unitDefinition, persistenceError: event.message }
        : {}
    ),
    restoreUnitAfterPersistenceFailure: assign(({ event }) =>
      event.type === 'unit.persistenceFailed'
        ? { unitDefinition: event.unitDefinition, persistenceError: event.message }
        : {}
    ),
  },
  guards: {
    canCreateDestination: ({ context }) =>
      Boolean(
        context.creationContext &&
          canSubmitDestinationForm({
            formData: context.creationContext.formData,
            unitDefinition: context.unitDefinition,
          })
      ),
    isCreatedDestination: ({ context, event }) => {
      const createdDestinationIds = context.creationContext?.createdDestinations?.map(
        ({ id }) => id
      );
      return (
        (event.type === 'unit.persisted' ||
          (event.type === 'unit.persistenceFailed' && event.intent === 'create')) &&
        Boolean(createdDestinationIds?.length) &&
        Boolean(createdDestinationIds?.every((id) => event.destinationIds.includes(id)))
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
      actions: [
        'revokeDestinationApiKeys',
        'deleteDestination',
        'notifyParentDelete',
        'closeFlyout',
      ],
    },
    'destination.deleteMany': {
      guard: and(['unitSaveIsIdle', 'hasDestinationsToDelete']),
      actions: ['revokeDestinationApiKeys', 'deleteDestinations', 'notifyParentDeleteMany'],
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
              actions: 'startFreshCreate',
            },
          },
        },
        supplyingConfiguration: {
          on: {
            'storageKind.select': { actions: 'selectStorageKind' },
            'destinationName.change': { actions: 'updateDestinationName' },
            'elasticsearch.change': { actions: 'updateElasticsearchForm' },
            'creationForm.blur': { actions: 'validateCreationForm' },
            'destination.create': [
              {
                target: 'mintingApiKey',
                guard: and(['canCreateDestination', 'unitSaveIsIdle']),
                actions: 'assignPendingDestination',
              },
              { actions: 'validateCreationForm' },
            ],
            'modal.closeCreate': { target: 'idle', actions: 'clearCreate' },
          },
        },
        mintingApiKey: {
          invoke: {
            id: 'generateApiKey',
            src: 'generateApiKey',
            input: ({ context }) => {
              const pendingDestinations = context.creationContext?.pendingDestinations;
              if (!pendingDestinations?.length) {
                throw new Error('Expected pending destinations');
              }
              return {
                destinations: pendingDestinations.map((pending) => ({
                  destinationId: pending.id,
                  patterns: pending.patterns,
                })),
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

const destinationViewModelsByContext = new WeakMap<
  DestinationsStateContext,
  DestinationViewModel[]
>();

export const getDestinationViewModels = (
  context: DestinationsStateContext
): DestinationViewModel[] => {
  const cachedDestinationViewModels = destinationViewModelsByContext.get(context);
  if (cachedDestinationViewModels) {
    return cachedDestinationViewModels;
  }

  const destinationViewModels = getConfiguredDestinations(context.unitDefinition);
  destinationViewModelsByContext.set(context, destinationViewModels);
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

function createGenerateApiKeyActor({ services }: { services: DestinationApiKeyServices }) {
  return fromPromise(
    async ({
      input,
    }: {
      input: { destinations: Array<{ destinationId: string; patterns: string[] }> };
    }): Promise<DestinationApiKeyGrant[]> => {
      const grants: DestinationApiKeyGrant[] = [];
      try {
        for (const destination of input.destinations) {
          const apiKey = await services.generate(destination.destinationId, destination.patterns);
          grants.push({ ...apiKey, destinationId: destination.destinationId });
        }
        return grants;
      } catch (error) {
        for (const grant of grants) {
          void services.delete(grant.destinationId);
        }
        throw error;
      }
    }
  );
}

function createRevokeDestinationApiKeysAction({
  services,
}: {
  services: DestinationApiKeyServices;
}) {
  return ({ event }: { event: DestinationsStateEvent }) => {
    if (event.type === 'destination.delete') {
      void services.delete(event.destinationId);
      return;
    }
    if (event.type === 'destination.deleteMany') {
      for (const destinationId of event.destinationIds) {
        void services.delete(destinationId);
      }
    }
  };
}

function createRevokePendingDestinationApiKeyAction({
  services,
}: {
  services: DestinationApiKeyServices;
}) {
  return ({ context }: { context: DestinationsStateContext }) => {
    for (const pending of context.creationContext?.pendingDestinations ?? []) {
      void services.delete(pending.id);
    }
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
    },
    actions: {
      notifyDestinationCreated: createNotifyDestinationCreatedAction({ toasts }),
      notifyDestinationDeleted: createNotifyDestinationDeletedAction({ toasts }),
      revokeDestinationApiKeys: createRevokeDestinationApiKeysAction({ services }),
      revokePendingDestinationApiKey: createRevokePendingDestinationApiKeyAction({ services }),
    },
  };
};
