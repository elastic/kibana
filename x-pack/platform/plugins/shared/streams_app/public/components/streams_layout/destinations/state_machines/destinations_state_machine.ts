/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPlaceholderFor } from '@kbn/xstate-utils';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { assign, sendTo, setup } from 'xstate';
import type { ActorRefFrom, AnyActorRef, MachineImplementationsFrom } from 'xstate';
import { collectUnitComponentIds } from '@kbn/streams-schema';
import { createDestinationId } from '../destination_helpers';
import { canSubmitDestinationForm, getDestinationCreationFormErrors } from '../destination_form';
import {
  createUnitDestination,
  getConfiguredDestinations,
  getUnitDestinations,
  indexUsesTemplate,
  parseIndexPatterns,
  toDestinationViewModel,
  withUnitDestinations,
} from '../destination_models';
import type {
  DestinationCreationFormData,
  DestinationCreationFormErrors,
  DestinationStorageKind,
  DestinationViewModel,
} from '../types';
import { EMPTY_ELASTICSEARCH_DESTINATION_FORM } from '../types';
import { removeComponentFromPipelines } from '../../../../services/unit_connections';
import type { Unit } from '../../../../services/unit_repository';

export type { DestinationCreationFormErrors };

export interface DestinationsParentEvent {
  type: 'unit.changed';
  unitDefinition: Unit;
  destinationId: string;
  intent: 'create' | 'delete';
}

export interface DestinationsStateInput {
  unitDefinition: Unit;
  includeUnconfiguredNodeOnCreate: boolean;
  parentRef: AnyActorRef;
}

export interface DestinationCreationContext {
  formData: DestinationCreationFormData;
  formErrors: DestinationCreationFormErrors;
  includeUnconfiguredNode: boolean;
  associatedUnconfiguredNodeId?: string;
  createdDestination?: DestinationViewModel;
}

export interface DestinationsStateContext {
  unitDefinition: Unit;
  unconfiguredNodeIds: string[];
  creationContext?: DestinationCreationContext;
  includeUnconfiguredNodeOnCreate: boolean;
  selectedDestinationId?: string;
  persistenceError?: string;
  hasReceivedUnit: boolean;
  parentRef: AnyActorRef;
}

export type DestinationsStateEvent =
  | { type: 'unit.loaded'; unitDefinition: Unit }
  | { type: 'unit.persisted'; destinationId: string; unitDefinition: Unit }
  | {
      type: 'unit.persistenceFailed';
      destinationId: string;
      unitDefinition: Unit;
      message: string;
      intent: 'create' | 'delete';
    }
  | { type: 'destination.create' }
  | { type: 'destination.delete'; destinationId: string }
  | { type: 'destination.view'; destinationId: string }
  | { type: 'storageKind.select'; storageKind: DestinationStorageKind }
  | { type: 'destinationName.change'; destinationName: string }
  | { type: 'elasticsearch.change'; index?: string; indexPatterns?: string }
  | { type: 'creationForm.blur' }
  | { type: 'modal.openCreate'; associatedUnconfiguredNodeId?: string }
  | { type: 'modal.closeCreate' }
  | { type: 'flyout.close' };

const getCreationFormErrors = ({
  formData,
  unitDefinition,
}: {
  formData: DestinationCreationFormData;
  unitDefinition: Unit;
}): DestinationCreationFormErrors => getDestinationCreationFormErrors({ formData, unitDefinition });

const createUnconfiguredNodeId = (): string =>
  `unconfigured-destination-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const destinationsStateMachine = setup({
  types: {
    input: {} as DestinationsStateInput,
    context: {} as DestinationsStateContext,
    events: {} as DestinationsStateEvent,
  },
  actions: {
    notifyDestinationCreated: getPlaceholderFor(createNotifyDestinationCreatedAction),
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
              formErrors: getCreationFormErrors({
                formData: context.creationContext.formData,
                unitDefinition: event.unitDefinition,
              }),
            }
          : undefined,
      };
    }),
    startFreshCreate: assign(({ context, event }) => {
      if (event.type !== 'modal.openCreate') {
        return {};
      }
      const existingUnconfiguredNodeId =
        event.associatedUnconfiguredNodeId &&
        context.unconfiguredNodeIds.includes(event.associatedUnconfiguredNodeId)
          ? event.associatedUnconfiguredNodeId
          : undefined;
      const associatedUnconfiguredNodeId =
        existingUnconfiguredNodeId ??
        (context.includeUnconfiguredNodeOnCreate ? createUnconfiguredNodeId() : undefined);
      return {
        creationContext: {
          formData: {
            storageKind: 'local_elasticsearch' as const,
            destinationName: '',
            elasticsearch: { ...EMPTY_ELASTICSEARCH_DESTINATION_FORM },
          },
          formErrors: {},
          includeUnconfiguredNode: context.includeUnconfiguredNodeOnCreate,
          associatedUnconfiguredNodeId,
        },
        unconfiguredNodeIds:
          associatedUnconfiguredNodeId &&
          !context.unconfiguredNodeIds.includes(associatedUnconfiguredNodeId)
            ? [...context.unconfiguredNodeIds, associatedUnconfiguredNodeId]
            : context.unconfiguredNodeIds,
        persistenceError: undefined,
      };
    }),
    clearCreate: assign({
      creationContext: undefined,
      persistenceError: undefined,
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
          formErrors: getCreationFormErrors({
            formData,
            unitDefinition: context.unitDefinition,
          }),
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
          ...(event.index !== undefined ? { index: event.index } : {}),
          ...(event.indexPatterns !== undefined ? { indexPatterns: event.indexPatterns } : {}),
        },
      };
      return {
        creationContext: {
          ...context.creationContext,
          formData,
          formErrors: getCreationFormErrors({
            formData,
            unitDefinition: context.unitDefinition,
          }),
        },
      };
    }),
    stageCreatedDestination: assign(({ context, event }) => {
      if (event.type !== 'destination.create' || !context.creationContext) {
        return {};
      }
      const { destinationName, elasticsearch, storageKind } = context.creationContext.formData;
      if (storageKind !== 'local_elasticsearch') {
        return {};
      }
      const name = destinationName.trim();
      const index = elasticsearch.index.trim();
      const id = createDestinationId({
        name,
        existingIds: collectUnitComponentIds(context.unitDefinition.unit),
      });
      const unitDestination = createUnitDestination({
        id,
        name,
        index,
        indexPatterns: indexUsesTemplate(index)
          ? parseIndexPatterns(elasticsearch.indexPatterns)
          : [],
      });
      const destination = toDestinationViewModel(unitDestination);
      if (!destination) {
        return {};
      }
      return {
        creationContext: {
          ...context.creationContext,
          createdDestination: destination,
        },
        unconfiguredNodeIds: context.creationContext.associatedUnconfiguredNodeId
          ? context.unconfiguredNodeIds.filter(
              (nodeId) => nodeId !== context.creationContext?.associatedUnconfiguredNodeId
            )
          : context.unconfiguredNodeIds,
        unitDefinition: withUnitDestinations(context.unitDefinition, [
          ...getUnitDestinations(context.unitDefinition).filter(
            ({ id: destinationId }) => destinationId !== unitDestination.id
          ),
          unitDestination,
        ]),
        persistenceError: undefined,
      };
    }),
    notifyParentCreate: sendTo(
      ({ context }) => context.parentRef,
      ({ context }): DestinationsParentEvent => {
        const destinationId = context.creationContext?.createdDestination?.id;
        if (!destinationId) {
          throw new Error('Expected a created destination');
        }
        return {
          type: 'unit.changed',
          unitDefinition: context.unitDefinition,
          destinationId,
          intent: 'create',
        };
      }
    ),
    deleteDestination: assign(({ context, event }) => {
      if (event.type !== 'destination.delete') {
        return {};
      }
      return {
        unitDefinition: removeComponentFromPipelines(
          withUnitDestinations(
            context.unitDefinition,
            getUnitDestinations(context.unitDefinition).filter(
              ({ id }) => id !== event.destinationId
            )
          ),
          event.destinationId
        ),
        selectedDestinationId:
          context.selectedDestinationId === event.destinationId
            ? undefined
            : context.selectedDestinationId,
      };
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
          destinationId: event.destinationId,
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
    storePersistenceError: assign(({ context, event }) => {
      if (event.type !== 'unit.persistenceFailed') {
        return {};
      }
      const associatedUnconfiguredNodeId =
        context.creationContext?.includeUnconfiguredNode === true
          ? context.creationContext.associatedUnconfiguredNodeId
          : undefined;
      return {
        unitDefinition: event.unitDefinition,
        persistenceError: event.message,
        unconfiguredNodeIds:
          associatedUnconfiguredNodeId &&
          !context.unconfiguredNodeIds.includes(associatedUnconfiguredNodeId)
            ? [...context.unconfiguredNodeIds, associatedUnconfiguredNodeId]
            : context.unconfiguredNodeIds,
      };
    }),
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
    isCreatedDestination: ({ context, event }) =>
      (event.type === 'unit.persisted' ||
        (event.type === 'unit.persistenceFailed' && event.intent === 'create')) &&
      context.creationContext?.createdDestination?.id === event.destinationId,
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
  },
}).createMachine({
  id: 'streamsDestinations',
  type: 'parallel',
  context: ({ input }) => ({
    unitDefinition: input.unitDefinition,
    unconfiguredNodeIds: [],
    includeUnconfiguredNodeOnCreate: input.includeUnconfiguredNodeOnCreate,
    hasReceivedUnit: false,
    parentRef: input.parentRef,
  }),
  on: {
    'unit.loaded': { actions: 'syncLoadedUnit' },
    'unit.persisted': { actions: 'syncLoadedUnit' },
    'unit.persistenceFailed': {
      guard: 'isDeletePersistenceFailure',
      actions: 'restoreUnitAfterPersistenceFailure',
    },
    'destination.delete': { actions: ['deleteDestination', 'notifyParentDelete', 'closeFlyout'] },
  },
  states: {
    configuring: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'modal.openCreate': {
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
                target: 'persisting',
                guard: 'canCreateDestination',
                actions: ['stageCreatedDestination', 'notifyParentCreate'],
              },
              { actions: 'validateCreationForm' },
            ],
            'modal.closeCreate': { target: 'idle', actions: 'clearCreate' },
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
              actions: 'storePersistenceError',
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
          actions: ['syncLoadedUnit', 'closeFlyout'],
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

export const createDestinationsMachineImplementations = ({
  toasts,
}: {
  toasts: Toasts;
}): MachineImplementationsFrom<typeof destinationsStateMachine> => ({
  actions: {
    notifyDestinationCreated: createNotifyDestinationCreatedAction({ toasts }),
  },
});
