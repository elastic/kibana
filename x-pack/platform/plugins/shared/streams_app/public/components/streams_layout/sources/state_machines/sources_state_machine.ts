/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPlaceholderFor } from '@kbn/xstate-utils';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { assign, fromPromise, sendTo, setup, stateIn } from 'xstate';
import type { ActionArgs, ActorRefFrom, AnyActorRef, MachineImplementationsFrom } from 'xstate';
import {
  createSourceApiKeyServices,
  type SourceApiKeyGenerationDeps,
  type SourceApiKeyPrivileges,
  type SourceApiKeyServices,
} from '../source_api_keys';
import type { SourceEnvironmentLoader } from '../source_environment';
import {
  createConfiguredSource,
  createRuntimeMetadata,
  createSourceViewModel,
} from '../source_models';
import { createSourceId, getAvailableSourceTypes, type SourceEnvironment } from '../source_helpers';
import { getFormattedError } from '../../../../util/errors';
import type {
  ConfiguredSource,
  RevealedApiKey,
  SourceApiKey,
  SourceRuntimeMetadata,
  SourceStatus,
  SourceType,
  SourceViewModel,
  SourcesUnitDefinition,
} from '../types';

type ApiKeyOperation = 'load' | 'generate' | 'delete' | 'persist';
export type SourceNameValidationError = 'required' | 'duplicate';

export interface SourceCreationFormErrors {
  sourceName?: SourceNameValidationError;
}

interface ApiKeyError {
  operation: ApiKeyOperation;
  sourceId: string;
  message: string;
}

export interface LoadApiKeysOutput {
  sourceId: string;
  apiKeys: SourceApiKey[];
  privileges: SourceApiKeyPrivileges;
}

export interface GenerateApiKeyOutput {
  sourceId: string;
  apiKey: RevealedApiKey;
}

export interface DeleteApiKeyOutput {
  sourceId: string;
  apiKeyId: string;
}

export interface SourcesParentEvent {
  type: 'unit.changed';
  unitDefinition: SourcesUnitDefinition;
  sourceId: string;
  intent: 'create' | 'delete';
}

export interface SourcesStateInput {
  unitDefinition: SourcesUnitDefinition;
  metadataBySourceId: Record<string, SourceRuntimeMetadata>;
  apiKeysBySourceId?: Record<string, SourceApiKey[]>;
  statusBySourceId?: Record<string, SourceStatus>;
  sourceEnvironment?: SourceEnvironment;
  includeUnconfiguredNodeOnCreate: boolean;
  parentRef: AnyActorRef;
}

export interface SourceCreationContext {
  formData: {
    sourceType: SourceType;
    sourceName: string;
  };
  formErrors: SourceCreationFormErrors;
  includeUnconfiguredNode: boolean;
  associatedUnconfiguredNodeId?: string;
  createdSource?: SourceViewModel;
}

export interface SourcesStateContext {
  unitDefinition: SourcesUnitDefinition;
  metadataBySourceId: Record<string, SourceRuntimeMetadata>;
  apiKeysBySourceId: Record<string, SourceApiKey[]>;
  statusBySourceId: Record<string, SourceStatus>;
  sourceEnvironment: SourceEnvironment;
  availableSourceTypes: SourceType[];
  unconfiguredNodeIds: string[];
  creationContext?: SourceCreationContext;
  includeUnconfiguredNodeOnCreate: boolean;
  revealedApiKey?: RevealedApiKey;
  apiKeyPrivileges?: SourceApiKeyPrivileges;
  apiKeyError?: ApiKeyError;
  sourceEnvironmentError?: string;
  selectedSourceId?: string;
  pendingApiKeyId?: string;
  hasReceivedUnit: boolean;
  parentRef: AnyActorRef;
}

export type SourcesStateEvent =
  | { type: 'unit.loaded'; unitDefinition: SourcesUnitDefinition }
  | { type: 'unit.persisted'; sourceId: string; unitDefinition: SourcesUnitDefinition }
  | {
      type: 'unit.persistenceFailed';
      sourceId: string;
      unitDefinition: SourcesUnitDefinition;
      message: string;
      intent: 'create' | 'delete';
    }
  | { type: 'source.create' }
  | { type: 'source.delete'; sourceId: string }
  | { type: 'source.view'; sourceId: string }
  | { type: 'apiKey.generate'; sourceId: string }
  | { type: 'apiKey.delete'; sourceId: string; apiKeyId: string }
  | { type: 'sourceType.select'; sourceType: SourceType }
  | { type: 'sourceName.change'; sourceName: string }
  | { type: 'sourceName.blur' }
  | { type: 'create.done' }
  | { type: 'create.cancel' }
  | { type: 'modal.openCreate'; associatedUnconfiguredNodeId?: string }
  | { type: 'modal.closeCreate' }
  | { type: 'flyout.close' }
  | { type: 'xstate.done.actor.loadSourceEnvironment'; output: SourceEnvironment }
  | { type: 'xstate.error.actor.loadSourceEnvironment'; error: unknown }
  | { type: 'xstate.done.actor.loadSourceApiKeys'; output: LoadApiKeysOutput }
  | {
      type:
        | 'xstate.done.actor.generateCreatedSourceApiKey'
        | 'xstate.done.actor.generateViewedSourceApiKey';
      output: GenerateApiKeyOutput;
    }
  | { type: 'xstate.done.actor.deleteSourceApiKey'; output: DeleteApiKeyOutput }
  | {
      type:
        | 'xstate.error.actor.loadSourceApiKeys'
        | 'xstate.error.actor.generateCreatedSourceApiKey'
        | 'xstate.error.actor.generateViewedSourceApiKey'
        | 'xstate.error.actor.deleteSourceApiKey';
      error: unknown;
    };

const getErrorMessage = (error: unknown): string => getFormattedError(error).message;

const normalizeSourceName = (sourceName: string): string => sourceName.trim().toLocaleLowerCase();

export const getSourceNameValidationError = ({
  sourceName,
  unitDefinition,
}: {
  sourceName: string;
  unitDefinition: SourcesUnitDefinition;
}): SourceNameValidationError | undefined => {
  const normalizedSourceName = normalizeSourceName(sourceName);
  if (!normalizedSourceName) {
    return 'required';
  }

  return unitDefinition.sources.some(
    ({ name }) => name && normalizeSourceName(name) === normalizedSourceName
  )
    ? 'duplicate'
    : undefined;
};

const getCreationFormErrors = ({
  sourceName,
  unitDefinition,
}: {
  sourceName: string;
  unitDefinition: SourcesUnitDefinition;
}): SourceCreationFormErrors => ({
  sourceName: getSourceNameValidationError({ sourceName, unitDefinition }),
});

const hasSource = (unitDefinition: SourcesUnitDefinition, sourceId: string): boolean =>
  unitDefinition.sources.some(({ id }) => id === sourceId);

const createUnconfiguredNodeId = (): string =>
  `unconfigured-source-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const withoutKey = <T>(record: Record<string, T>, key: string): Record<string, T> => {
  const next = { ...record };
  delete next[key];
  return next;
};

const pruneBySourceIds = <T>(
  record: Record<string, T>,
  sourceIds: ReadonlySet<string>
): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([sourceId]) => sourceIds.has(sourceId)));

const rebuildSourceSidecars = (
  context: Pick<
    SourcesStateContext,
    | 'metadataBySourceId'
    | 'apiKeysBySourceId'
    | 'statusBySourceId'
    | 'sourceEnvironment'
    | 'selectedSourceId'
  >,
  unitDefinition: SourcesUnitDefinition
) => {
  const sourceIds = new Set(unitDefinition.sources.map(({ id }) => id));
  return {
    unitDefinition,
    metadataBySourceId: Object.fromEntries(
      unitDefinition.sources.map((source) => [
        source.id,
        context.metadataBySourceId[source.id] ??
          createRuntimeMetadata(source, context.sourceEnvironment),
      ])
    ),
    apiKeysBySourceId: pruneBySourceIds(context.apiKeysBySourceId, sourceIds),
    statusBySourceId: pruneBySourceIds(context.statusBySourceId, sourceIds),
    selectedSourceId:
      context.selectedSourceId && sourceIds.has(context.selectedSourceId)
        ? context.selectedSourceId
        : undefined,
  };
};

const dismissCreateTransitions = [
  {
    guard: stateIn('#configurationFailed'),
    target: '#configuringIdle',
    actions: 'clearFailedCreate' as const,
  },
  { target: '#configuringIdle', actions: 'clearCreate' as const },
];

const viewedSourceApiKeyTransitions = {
  'apiKey.generate': {
    guard: 'targetsViewedSource' as const,
    target: 'apiKey.generating' as const,
    actions: 'clearApiKeyResult' as const,
  },
  'apiKey.delete': {
    guard: 'targetsViewedSource' as const,
    target: 'apiKey.deleting' as const,
    actions: 'setPendingApiKey' as const,
  },
};

const unavailableApiKeyPrivileges: SourceApiKeyPrivileges = {
  canCreate: false,
  canList: false,
  failure: 'cluster',
};

const createLoadApiKeysActor = ({ services }: { services: SourceApiKeyServices }) =>
  fromPromise(
    async ({ input }: { input: { source: ConfiguredSource } }): Promise<LoadApiKeysOutput> => {
      const privileges = await services
        .checkPrivileges(input.source)
        .catch(() => unavailableApiKeyPrivileges);
      const apiKeys = privileges.canList ? await services.load(input.source.id) : [];

      return {
        sourceId: input.source.id,
        apiKeys,
        privileges,
      };
    }
  );

const createGenerateApiKeyActor = ({ services }: { services: SourceApiKeyServices }) =>
  fromPromise(
    async ({ input }: { input: { source: ConfiguredSource } }): Promise<GenerateApiKeyOutput> => ({
      sourceId: input.source.id,
      apiKey: await services.generate(input.source),
    })
  );

const createDeleteApiKeyActor = ({ services }: { services: SourceApiKeyServices }) =>
  fromPromise(
    async ({
      input,
    }: {
      input: { sourceId: string; apiKeyId: string };
    }): Promise<DeleteApiKeyOutput> => {
      await services.delete(input.sourceId, input.apiKeyId);
      return input;
    }
  );

export const sourcesStateMachine = setup({
  types: {
    input: {} as SourcesStateInput,
    context: {} as SourcesStateContext,
    events: {} as SourcesStateEvent,
  },
  actors: {
    loadSourceEnvironment: fromPromise(async (): Promise<SourceEnvironment> => ({})),
    loadApiKeys: getPlaceholderFor(createLoadApiKeysActor),
    generateApiKey: getPlaceholderFor(createGenerateApiKeyActor),
    deleteApiKey: getPlaceholderFor(createDeleteApiKeyActor),
  },
  actions: {
    notifySourceCreated: getPlaceholderFor(createNotifySourceCreatedAction),
    notifySourceEnvironmentError: getPlaceholderFor(createNotifySourceEnvironmentErrorAction),
    storeSourceEnvironment: assign(({ context, event }) => {
      if (event.type !== 'xstate.done.actor.loadSourceEnvironment') {
        return {};
      }
      const sourceEnvironment = event.output;
      const availableSourceTypes = getAvailableSourceTypes(sourceEnvironment);
      return {
        sourceEnvironment,
        sourceEnvironmentError: undefined,
        availableSourceTypes,
        creationContext:
          context.creationContext &&
          !availableSourceTypes.includes(context.creationContext.formData.sourceType)
            ? {
                ...context.creationContext,
                formData: {
                  ...context.creationContext.formData,
                  sourceType:
                    availableSourceTypes[0] ?? context.creationContext.formData.sourceType,
                },
              }
            : context.creationContext,
        metadataBySourceId: Object.fromEntries(
          context.unitDefinition.sources.map((source) => {
            const resolvedMetadata = createRuntimeMetadata(source, sourceEnvironment);
            return [
              source.id,
              {
                ...context.metadataBySourceId[source.id],
                endpoint: resolvedMetadata.endpoint,
                endpoints: resolvedMetadata.endpoints,
                destinations:
                  context.metadataBySourceId[source.id]?.destinations ??
                  resolvedMetadata.destinations,
              },
            ];
          })
        ),
      };
    }),
    storeSourceEnvironmentError: assign(({ event }) =>
      event.type === 'xstate.error.actor.loadSourceEnvironment'
        ? { sourceEnvironmentError: getErrorMessage(event.error) }
        : {}
    ),
    syncLoadedUnit: assign(({ context, event }) => {
      if (event.type !== 'unit.loaded' && event.type !== 'unit.persisted') {
        return {};
      }
      const sidecars = rebuildSourceSidecars(context, event.unitDefinition);
      const sourceIds = new Set(event.unitDefinition.sources.map(({ id }) => id));
      return {
        ...sidecars,
        hasReceivedUnit: true,
        creationContext: context.creationContext
          ? context.creationContext.createdSource
            ? {
                ...context.creationContext,
                createdSource: sourceIds.has(context.creationContext.createdSource.id)
                  ? context.creationContext.createdSource
                  : undefined,
              }
            : {
                ...context.creationContext,
                formErrors: getCreationFormErrors({
                  sourceName: context.creationContext.formData.sourceName,
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
            sourceType: context.availableSourceTypes[0] ?? 'bulk',
            sourceName: '',
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
        revealedApiKey: undefined,
        apiKeyError: undefined,
      };
    }),
    clearCreate: assign({
      creationContext: undefined,
      revealedApiKey: undefined,
      apiKeyError: undefined,
    }),
    clearFailedCreate: assign(({ context }) => {
      const sourceId = context.creationContext?.createdSource?.id;
      if (!sourceId || context.apiKeyError?.operation !== 'persist') {
        return {
          creationContext: undefined,
          revealedApiKey: undefined,
          apiKeyError: undefined,
        };
      }
      return {
        unitDefinition: {
          ...context.unitDefinition,
          sources: context.unitDefinition.sources.filter(({ id }) => id !== sourceId),
        },
        metadataBySourceId: withoutKey(context.metadataBySourceId, sourceId),
        apiKeysBySourceId: withoutKey(context.apiKeysBySourceId, sourceId),
        statusBySourceId: withoutKey(context.statusBySourceId, sourceId),
        creationContext: undefined,
        revealedApiKey: undefined,
        apiKeyError: undefined,
      };
    }),
    selectSourceType: assign(({ context, event }) =>
      event.type === 'sourceType.select' &&
      context.creationContext &&
      (context.availableSourceTypes.length === 0 ||
        context.availableSourceTypes.includes(event.sourceType))
        ? {
            creationContext: {
              ...context.creationContext,
              formData: {
                ...context.creationContext.formData,
                sourceType: event.sourceType,
              },
            },
          }
        : {}
    ),
    updateSourceName: assign(({ context, event }) => {
      if (event.type !== 'sourceName.change' || !context.creationContext) {
        return {};
      }
      return {
        creationContext: {
          ...context.creationContext,
          formData: {
            ...context.creationContext.formData,
            sourceName: event.sourceName,
          },
          formErrors: getCreationFormErrors({
            sourceName: event.sourceName,
            unitDefinition: context.unitDefinition,
          }),
        },
      };
    }),
    validateSourceName: assign(({ context }) =>
      context.creationContext
        ? {
            creationContext: {
              ...context.creationContext,
              formErrors: getCreationFormErrors({
                sourceName: context.creationContext.formData.sourceName,
                unitDefinition: context.unitDefinition,
              }),
            },
          }
        : {}
    ),
    stageCreatedSource: assign(({ context, event }) => {
      if (event.type !== 'source.create' || !context.creationContext) {
        return {};
      }
      const { sourceType: type, sourceName } = context.creationContext.formData;
      const name = sourceName.trim();
      const id = createSourceId({
        name,
        existingIds: context.unitDefinition.sources.map((source) => source.id),
      });
      const source = createConfiguredSource({ id, name, type });
      const metadata = createRuntimeMetadata(source, context.sourceEnvironment);
      return {
        creationContext: {
          ...context.creationContext,
          createdSource: {
            ...source,
            ...metadata,
            apiKeys: [],
            status: 'provisioning' as const,
          },
        },
        unconfiguredNodeIds: context.creationContext?.associatedUnconfiguredNodeId
          ? context.unconfiguredNodeIds.filter(
              (nodeId) => nodeId !== context.creationContext?.associatedUnconfiguredNodeId
            )
          : context.unconfiguredNodeIds,
        unitDefinition: {
          ...context.unitDefinition,
          sources: [
            ...context.unitDefinition.sources.filter(({ id: sourceId }) => sourceId !== source.id),
            source,
          ],
        },
        metadataBySourceId: {
          ...context.metadataBySourceId,
          [source.id]: metadata,
        },
        statusBySourceId: {
          ...context.statusBySourceId,
          [source.id]: 'provisioning' as const,
        },
        apiKeyError: undefined,
      };
    }),
    notifyParentCreate: sendTo(
      ({ context }) => context.parentRef,
      ({ context }): SourcesParentEvent => {
        const sourceId = context.creationContext?.createdSource?.id;
        if (!sourceId) {
          throw new Error('Expected a created source');
        }
        return {
          type: 'unit.changed',
          unitDefinition: context.unitDefinition,
          sourceId,
          intent: 'create',
        };
      }
    ),
    deleteSource: assign(({ context, event }) => {
      if (event.type !== 'source.delete') {
        return {};
      }
      return {
        unitDefinition: {
          ...context.unitDefinition,
          sources: context.unitDefinition.sources.filter(({ id }) => id !== event.sourceId),
        },
        metadataBySourceId: withoutKey(context.metadataBySourceId, event.sourceId),
        apiKeysBySourceId: withoutKey(context.apiKeysBySourceId, event.sourceId),
        statusBySourceId: withoutKey(context.statusBySourceId, event.sourceId),
        selectedSourceId:
          context.selectedSourceId === event.sourceId ? undefined : context.selectedSourceId,
      };
    }),
    notifyParentDelete: sendTo(
      ({ context }) => context.parentRef,
      ({ context, event }): SourcesParentEvent => {
        if (event.type !== 'source.delete') {
          throw new Error('Expected source.delete');
        }
        return {
          type: 'unit.changed',
          unitDefinition: context.unitDefinition,
          sourceId: event.sourceId,
          intent: 'delete',
        };
      }
    ),
    selectViewedSource: assign({
      selectedSourceId: ({ event }) => (event.type === 'source.view' ? event.sourceId : undefined),
      revealedApiKey: undefined,
      apiKeyPrivileges: undefined,
      apiKeyError: undefined,
    }),
    closeFlyout: assign({
      selectedSourceId: undefined,
      pendingApiKeyId: undefined,
      revealedApiKey: undefined,
      apiKeyPrivileges: undefined,
      apiKeyError: undefined,
    }),
    clearApiKeyResult: assign({
      revealedApiKey: undefined,
      apiKeyError: undefined,
    }),
    setPendingApiKey: assign({
      pendingApiKeyId: ({ event }) => (event.type === 'apiKey.delete' ? event.apiKeyId : undefined),
      apiKeyError: undefined,
    }),
    storeLoadedApiKeys: assign(({ context, event }) => {
      if (event.type !== 'xstate.done.actor.loadSourceApiKeys') {
        return {};
      }
      const { sourceId, apiKeys, privileges } = event.output;
      if (context.selectedSourceId !== sourceId || !hasSource(context.unitDefinition, sourceId)) {
        return {};
      }
      return {
        apiKeysBySourceId: { ...context.apiKeysBySourceId, [sourceId]: apiKeys },
        apiKeyPrivileges: privileges,
        apiKeyError: undefined,
      };
    }),
    storeGeneratedApiKey: assign(({ context, event }) => {
      if (
        event.type !== 'xstate.done.actor.generateCreatedSourceApiKey' &&
        event.type !== 'xstate.done.actor.generateViewedSourceApiKey'
      ) {
        return {};
      }
      const { sourceId, apiKey } = event.output;
      if (!hasSource(context.unitDefinition, sourceId)) {
        return {};
      }
      const publicApiKey = {
        id: apiKey.id,
        name: apiKey.name,
        createdAt: apiKey.createdAt,
      };
      const createdSource = context.creationContext?.createdSource;
      return {
        apiKeysBySourceId: {
          ...context.apiKeysBySourceId,
          [sourceId]: [...(context.apiKeysBySourceId[sourceId] ?? []), publicApiKey],
        },
        revealedApiKey: apiKey,
        apiKeyError: undefined,
        creationContext: context.creationContext
          ? {
              ...context.creationContext,
              createdSource:
                createdSource?.id === sourceId
                  ? {
                      ...createdSource,
                      apiKeys: [...createdSource.apiKeys, publicApiKey],
                      status: 'provisioning' as const,
                    }
                  : createdSource,
            }
          : context.creationContext,
      };
    }),
    storeDeletedApiKey: assign(({ context, event }) => {
      if (event.type !== 'xstate.done.actor.deleteSourceApiKey') {
        return {};
      }
      const { sourceId, apiKeyId } = event.output;
      if (context.selectedSourceId !== sourceId || !hasSource(context.unitDefinition, sourceId)) {
        return { pendingApiKeyId: undefined };
      }
      return {
        apiKeysBySourceId: {
          ...context.apiKeysBySourceId,
          [sourceId]: (context.apiKeysBySourceId[sourceId] ?? []).filter(
            ({ id }) => id !== apiKeyId
          ),
        },
        pendingApiKeyId: undefined,
        apiKeyError: undefined,
      };
    }),
    storeLoadError: assign(({ context, event }) => {
      if (event.type !== 'xstate.error.actor.loadSourceApiKeys') {
        return {};
      }
      const sourceId = context.selectedSourceId;
      return sourceId
        ? {
            apiKeyError: {
              operation: 'load' as const,
              sourceId,
              message: getErrorMessage(event.error),
            },
          }
        : {};
    }),
    storeGenerateError: assign(({ context, event }) => {
      if (
        event.type !== 'xstate.error.actor.generateCreatedSourceApiKey' &&
        event.type !== 'xstate.error.actor.generateViewedSourceApiKey'
      ) {
        return {};
      }
      const sourceId = context.creationContext?.createdSource?.id ?? context.selectedSourceId;
      return sourceId
        ? {
            revealedApiKey: undefined,
            apiKeyError: {
              operation: 'generate' as const,
              sourceId,
              message: getErrorMessage(event.error),
            },
            statusBySourceId: { ...context.statusBySourceId, [sourceId]: 'failed' as const },
          }
        : {};
    }),
    storeDeleteError: assign(({ context, event }) => {
      if (event.type !== 'xstate.error.actor.deleteSourceApiKey') {
        return {};
      }
      const sourceId = context.selectedSourceId;
      return sourceId
        ? {
            pendingApiKeyId: undefined,
            apiKeyError: {
              operation: 'delete' as const,
              sourceId,
              message: getErrorMessage(event.error),
            },
            statusBySourceId: { ...context.statusBySourceId, [sourceId]: 'failed' as const },
          }
        : {};
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
        unconfiguredNodeIds:
          associatedUnconfiguredNodeId &&
          !context.unconfiguredNodeIds.includes(associatedUnconfiguredNodeId)
            ? [...context.unconfiguredNodeIds, associatedUnconfiguredNodeId]
            : context.unconfiguredNodeIds,
        apiKeyError: {
          operation: 'persist' as const,
          sourceId: event.sourceId,
          message: event.message,
        },
        statusBySourceId: {
          ...context.statusBySourceId,
          [event.sourceId]: 'failed' as const,
        },
      };
    }),
    restoreUnitAfterPersistenceFailure: assign(({ context, event }) =>
      event.type === 'unit.persistenceFailed'
        ? rebuildSourceSidecars(context, event.unitDefinition)
        : {}
    ),
  },
  guards: {
    canCreateSource: ({ context }) =>
      Boolean(
        context.creationContext &&
          !getSourceNameValidationError({
            sourceName: context.creationContext.formData.sourceName,
            unitDefinition: context.unitDefinition,
          }) &&
          context.availableSourceTypes.includes(context.creationContext.formData.sourceType)
      ),
    isCreatedSource: ({ context, event }) =>
      (event.type === 'unit.persisted' ||
        (event.type === 'unit.persistenceFailed' && event.intent === 'create')) &&
      context.creationContext?.createdSource?.id === event.sourceId,
    isCreatedSourceWithEndpoint: ({ context, event }) =>
      event.type === 'unit.persisted' &&
      context.creationContext?.createdSource?.id === event.sourceId &&
      context.creationContext.createdSource.endpoint !== undefined,
    loadedUnitRemovedViewedSource: ({ context, event }) =>
      (event.type === 'unit.loaded' || event.type === 'unit.persisted') &&
      Boolean(
        context.selectedSourceId &&
          !event.unitDefinition.sources.some(({ id }) => id === context.selectedSourceId)
      ),
    targetsViewedSource: ({ context, event }) =>
      (event.type === 'apiKey.generate' || event.type === 'apiKey.delete') &&
      event.sourceId === context.selectedSourceId,
    deletesViewedSource: ({ context, event }) =>
      event.type === 'source.delete' && event.sourceId === context.selectedSourceId,
    isDeletePersistenceFailure: ({ event }) =>
      event.type === 'unit.persistenceFailed' && event.intent === 'delete',
  },
}).createMachine({
  id: 'streamsSources',
  type: 'parallel',
  context: ({ input }) => ({
    unitDefinition: input.unitDefinition,
    metadataBySourceId: input.metadataBySourceId,
    apiKeysBySourceId: input.apiKeysBySourceId ?? {},
    statusBySourceId: input.statusBySourceId ?? {},
    sourceEnvironment: input.sourceEnvironment ?? {},
    availableSourceTypes: getAvailableSourceTypes(input.sourceEnvironment ?? {}),
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
    'source.delete': { actions: ['deleteSource', 'notifyParentDelete'] },
  },
  states: {
    environment: {
      initial: 'loading',
      states: {
        loading: {
          invoke: {
            id: 'loadSourceEnvironment',
            src: 'loadSourceEnvironment',
            onDone: {
              target: 'ready',
              actions: 'storeSourceEnvironment',
            },
            onError: {
              target: 'unavailable',
              actions: ['storeSourceEnvironmentError', 'notifySourceEnvironmentError'],
            },
          },
        },
        ready: {},
        unavailable: {},
      },
    },
    configuring: {
      initial: 'idle',
      on: {
        'create.cancel': dismissCreateTransitions,
        'modal.closeCreate': dismissCreateTransitions,
      },
      states: {
        idle: {
          id: 'configuringIdle',
          on: {
            'modal.openCreate': {
              target: 'supplyingConfiguration',
              actions: 'startFreshCreate',
            },
          },
        },
        supplyingConfiguration: {
          on: {
            'sourceType.select': { actions: 'selectSourceType' },
            'sourceName.change': { actions: 'updateSourceName' },
            'sourceName.blur': { actions: 'validateSourceName' },
            'source.create': [
              {
                target: 'persisting',
                guard: 'canCreateSource',
                actions: ['stageCreatedSource', 'notifyParentCreate'],
              },
              { actions: 'validateSourceName' },
            ],
          },
        },
        persisting: {
          on: {
            'unit.persisted': [
              {
                guard: 'isCreatedSourceWithEndpoint',
                target: 'apiKey.generating',
                actions: 'syncLoadedUnit',
              },
              {
                guard: 'isCreatedSource',
                target: 'viewingEndpointInformation',
                actions: ['syncLoadedUnit', 'notifySourceCreated'],
              },
            ],
            'unit.persistenceFailed': {
              guard: 'isCreatedSource',
              target: 'failed',
              actions: 'storePersistenceError',
            },
          },
        },
        apiKey: {
          initial: 'generating',
          states: {
            generating: {
              invoke: {
                id: 'generateCreatedSourceApiKey',
                src: 'generateApiKey',
                input: ({ context }) => {
                  if (!context.creationContext?.createdSource) {
                    throw new Error('Cannot generate an API key without a created source');
                  }
                  return { source: context.creationContext.createdSource };
                },
                onDone: {
                  target: '#configurationEndpointInformation',
                  actions: ['storeGeneratedApiKey', 'notifySourceCreated'],
                },
                onError: { target: '#configurationFailed', actions: 'storeGenerateError' },
              },
            },
          },
        },
        viewingEndpointInformation: {
          id: 'configurationEndpointInformation',
          on: {
            'create.done': { target: 'idle', actions: 'clearCreate' },
          },
        },
        failed: {
          id: 'configurationFailed',
          on: {
            'create.done': { target: 'idle', actions: 'clearFailedCreate' },
          },
        },
      },
    },
    flyout: {
      initial: 'closed',
      on: {
        'source.view': {
          target: '.loading',
          reenter: true,
          actions: 'selectViewedSource',
        },
        'flyout.close': { target: '.closed', actions: 'closeFlyout' },
        'modal.openCreate': { target: '.closed', actions: 'closeFlyout' },
        'source.delete': {
          guard: 'deletesViewedSource',
          target: '.closed',
          actions: ['deleteSource', 'notifyParentDelete', 'closeFlyout'],
        },
        'unit.loaded': {
          guard: 'loadedUnitRemovedViewedSource',
          target: '.closed',
          actions: ['syncLoadedUnit', 'closeFlyout'],
        },
      },
      states: {
        closed: {},
        loading: {
          invoke: {
            id: 'loadSourceApiKeys',
            src: 'loadApiKeys',
            input: ({ context }) => {
              const source = context.unitDefinition.sources.find(
                ({ id }) => id === context.selectedSourceId
              );
              if (!source) {
                throw new Error('Cannot load API keys without a selected source');
              }
              return { source };
            },
            onDone: { target: 'ready', actions: 'storeLoadedApiKeys' },
            onError: { target: 'failed', actions: 'storeLoadError' },
          },
        },
        ready: {
          id: 'flyoutReady',
          on: viewedSourceApiKeyTransitions,
        },
        apiKey: {
          initial: 'generating',
          states: {
            generating: {
              invoke: {
                id: 'generateViewedSourceApiKey',
                src: 'generateApiKey',
                input: ({ context }) => {
                  const source = context.unitDefinition.sources.find(
                    ({ id }) => id === context.selectedSourceId
                  );
                  if (!source) {
                    throw new Error('Cannot generate an API key without a selected source');
                  }
                  return { source };
                },
                onDone: { target: '#flyoutReady', actions: 'storeGeneratedApiKey' },
                onError: { target: '#flyoutFailed', actions: 'storeGenerateError' },
              },
            },
            deleting: {
              invoke: {
                id: 'deleteSourceApiKey',
                src: 'deleteApiKey',
                input: ({ context }) => {
                  if (!context.selectedSourceId || !context.pendingApiKeyId) {
                    throw new Error('Cannot delete an API key without its source and key IDs');
                  }
                  return {
                    sourceId: context.selectedSourceId,
                    apiKeyId: context.pendingApiKeyId,
                  };
                },
                onDone: { target: '#flyoutReady', actions: 'storeDeletedApiKey' },
                onError: { target: '#flyoutFailed', actions: 'storeDeleteError' },
              },
            },
          },
        },
        failed: {
          id: 'flyoutFailed',
          on: viewedSourceApiKeyTransitions,
        },
      },
    },
  },
});

export type SourcesActorRef = ActorRefFrom<typeof sourcesStateMachine>;

const sourceViewModelsByContext = new WeakMap<SourcesStateContext, SourceViewModel[]>();

export const getSourceViewModels = (context: SourcesStateContext): SourceViewModel[] => {
  const cachedSourceViewModels = sourceViewModelsByContext.get(context);
  if (cachedSourceViewModels) {
    return cachedSourceViewModels;
  }

  const {
    unitDefinition,
    metadataBySourceId,
    statusBySourceId,
    apiKeysBySourceId,
    sourceEnvironment,
  } = context;
  const sourceViewModels = unitDefinition.sources.map((source) =>
    createSourceViewModel({
      source,
      metadata: metadataBySourceId[source.id] ?? createRuntimeMetadata(source, sourceEnvironment),
      status: statusBySourceId[source.id] ?? 'provisioning',
      apiKeys: apiKeysBySourceId[source.id] ?? [],
    })
  );
  sourceViewModelsByContext.set(context, sourceViewModels);
  return sourceViewModels;
};

type Toasts = CoreStart['notifications']['toasts'];

function createNotifySourceCreatedAction({ toasts }: { toasts: Toasts }) {
  return () => {
    toasts.addSuccess({
      title: i18n.translate('xpack.streams.sources.sourceCreatedSuccessTitle', {
        defaultMessage: 'New source configured',
      }),
    });
  };
}

function createNotifySourceEnvironmentErrorAction({ toasts }: { toasts: Toasts }) {
  return ({ event }: ActionArgs<SourcesStateContext, SourcesStateEvent, SourcesStateEvent>) => {
    if (event.type !== 'xstate.error.actor.loadSourceEnvironment') {
      return;
    }
    toasts.addError(
      event.error instanceof Error ? event.error : new Error(getErrorMessage(event.error)),
      {
        title: i18n.translate('xpack.streams.sources.environmentRequestFailedTitle', {
          defaultMessage: 'Could not load source configuration',
        }),
      }
    );
  };
}

export const createSourcesMachineImplementations = ({
  apiKeyGenerationDeps,
  toasts,
  loadSourceEnvironment = async () => ({}),
}: {
  apiKeyGenerationDeps: SourceApiKeyGenerationDeps;
  toasts: Toasts;
  loadSourceEnvironment?: SourceEnvironmentLoader;
}): MachineImplementationsFrom<typeof sourcesStateMachine> => {
  const services = createSourceApiKeyServices(apiKeyGenerationDeps);
  return {
    actors: {
      loadSourceEnvironment: fromPromise(loadSourceEnvironment),
      loadApiKeys: createLoadApiKeysActor({ services }),
      generateApiKey: createGenerateApiKeyActor({ services }),
      deleteApiKey: createDeleteApiKeyActor({ services }),
    },
    actions: {
      notifySourceCreated: createNotifySourceCreatedAction({ toasts }),
      notifySourceEnvironmentError: createNotifySourceEnvironmentErrorAction({ toasts }),
    },
  };
};
