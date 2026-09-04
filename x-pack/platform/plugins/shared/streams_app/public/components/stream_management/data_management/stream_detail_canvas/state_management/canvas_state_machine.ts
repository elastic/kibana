/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { i18n } from '@kbn/i18n';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import {
  type ActionArgs,
  assign,
  fromCallback,
  fromPromise,
  type MachineImplementationsFrom,
  raise,
  sendTo,
  setup,
} from 'xstate';
import {
  createSourcesMachineImplementations,
  sourcesStateMachine,
} from '../../../../streams_layout/sources/state_machines/sources_state_machine';
import type { SourcesUnitDefinition } from '../../../../streams_layout/sources/types';
import {
  createEmptyUnitDefinition,
  mockUnitDefinitionRepository,
  toSourcesUnitDefinition,
  type UnitDefinitionRepository,
} from '../../../../streams_layout/sources/unit_definition_repository';
import {
  CANVAS_URL_STATE_KEY,
  canvasUrlSchema,
  type CanvasUrlSchema,
} from '../../../../../../common/url_schema';
import type { CanvasStateServiceDeps, CanvasUrlInput, CanvasUrlEvent, CanvasState } from './types';

export interface StoreUrlStateParams {
  urlState: CanvasUrlInput;
}

const defaultUrlState = {
  flyoutName: null,
  flyoutTab: null,
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error('The unit definition request failed.');

export const canvasStateMachine = setup({
  types: {
    input: {} as CanvasUrlInput,
    context: {} as CanvasState,
    events: {} as CanvasUrlEvent,
  },
  actors: {
    initializeUrl: getPlaceholderFor(createUrlInitializerActor),
    sourcesMachine: getPlaceholderFor(createSourcesMachineActor),
    loadUnitDefinition: getPlaceholderFor(createLoadUnitDefinitionActor),
    validateUnitDefinition: getPlaceholderFor(createValidateUnitDefinitionActor),
    persistUnitDefinition: getPlaceholderFor(createPersistUnitDefinitionActor),
  },
  actions: {
    /* URL state actions */
    storeUrlState: assign((_, params: StoreUrlStateParams) => ({
      urlState: params.urlState,
    })),
    syncUrlState: getPlaceholderFor(createUrlSyncAction),
    storeNodePositions: assign(({ context, event }) =>
      event.type === 'nodes.positions.change'
        ? {
            nodePositions: {
              ...context.nodePositions,
              ...event.positions,
            },
          }
        : {}
    ),
    prepareChangedUnitSave: assign(({ event }) => {
      if (event.type !== 'unit.changed') {
        return {};
      }
      const nextUnit = toSourcesUnitDefinition(event.unitDefinition);
      return {
        nextUnit,
        savingUnit: nextUnit,
        savingSourceId: event.sourceId,
        savingSourceIntent: event.intent,
        error: undefined,
      };
    }),
    storeNextUnit: assign(({ event }) =>
      event.type === 'unit.stage'
        ? {
            nextUnit: toSourcesUnitDefinition(event.unitDefinition),
            error: undefined,
          }
        : {}
    ),
    prepareUnitSave: assign({
      savingUnit: ({ context }) => context.nextUnit,
      savingSourceId: undefined,
      savingSourceIntent: undefined,
      error: undefined,
    }),
    storeLoadedUnitDefinition: assign(({ context, event }) =>
      event.type === 'xstate.done.actor.loadUnitDefinition'
        ? {
            unit: event.output,
            nextUnit: event.output,
            savingUnit: undefined,
            savingSourceId: undefined,
            savingSourceIntent: undefined,
            error: undefined,
          }
        : context
    ),
    storePersistedUnitDefinition: assign(({ context, event }) => {
      if (event.type !== 'xstate.done.actor.persistUnitDefinition') {
        return {};
      }
      const hasSubsequentChanges = context.nextUnit !== context.savingUnit;
      return {
        unit: event.output.unitDefinition,
        nextUnit: hasSubsequentChanges ? context.nextUnit : event.output.unitDefinition,
        savingUnit: undefined,
        savingSourceId: undefined,
        savingSourceIntent: undefined,
        error: undefined,
      };
    }),
    storeUnitFailure: assign({
      error: ({ event }) =>
        event.type === 'xstate.error.actor.loadUnitDefinition' ||
        event.type === 'xstate.error.actor.validateUnitDefinition' ||
        event.type === 'xstate.error.actor.persistUnitDefinition'
          ? toError(event.error)
          : undefined,
    }),
    rollbackFailedSourceSave: assign(({ context }) =>
      context.savingSourceId
        ? {
            nextUnit: context.unit,
            savingUnit: undefined,
          }
        : {}
    ),
    notifyUnitFailure: getPlaceholderFor(createNotifyUnitFailureAction),
    syncLoadedUnitDefinition: sendTo(
      ({ context }) => context.sourcesRef,
      ({ event }) => {
        if (event.type !== 'xstate.done.actor.loadUnitDefinition') {
          throw new Error('Expected a loaded unit definition');
        }
        return { type: 'unit.loaded', unitDefinition: event.output };
      }
    ),
    syncSavedUnitDefinition: sendTo(
      ({ context }) => context.sourcesRef,
      ({ context, event }) => {
        if (event.type !== 'xstate.done.actor.persistUnitDefinition') {
          throw new Error('Expected a persisted unit definition');
        }
        return event.output.sourceId
          ? {
              type: 'unit.persisted',
              sourceId: event.output.sourceId,
              unitDefinition: event.output.unitDefinition,
            }
          : { type: 'unit.loaded', unitDefinition: context.nextUnit };
      }
    ),
    syncSourceSaveFailure: sendTo(
      ({ context }) => context.sourcesRef,
      ({ context, event }) => {
        if (!context.savingSourceId || !context.savingSourceIntent) {
          throw new Error('Expected a source mutation to be saving');
        }
        return {
          type: 'unit.persistenceFailed',
          sourceId: context.savingSourceId,
          unitDefinition: context.unit,
          message:
            event.type === 'xstate.error.actor.validateUnitDefinition' ||
            event.type === 'xstate.error.actor.persistUnitDefinition'
              ? toError(event.error).message
              : 'Unable to save the source.',
          intent: context.savingSourceIntent,
        };
      }
    ),
  },
  guards: {
    hasUnsavedUnitChanges: ({ context }) => context.unit !== context.nextUnit,
    isSavingSourceChange: ({ context }) => context.savingSourceId !== undefined,
  },
}).createMachine({
  id: 'canvasMachine',
  initial: 'initializingFromUrl',
  states: {
    initializingFromUrl: {
      invoke: {
        src: 'initializeUrl',
      },
      on: {
        'url.init': {
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
      on: {
        'url.sync': {
          actions: [{ type: 'syncUrlState' }],
        },
        'nodes.positions.change': {
          actions: 'storeNodePositions',
        },
        'unit.stage': {
          actions: 'storeNextUnit',
        },
        'flyout.open': {
          actions: [
            {
              type: 'storeUrlState',
              params: ({ event, context }) => ({
                urlState: {
                  ...context.urlState,
                  flyoutName: event.flyoutName,
                  flyoutTab: 'overview',
                },
              }),
            },
            raise({ type: 'url.sync' }),
          ],
        },
        'flyout.tab': {
          actions: [
            {
              type: 'storeUrlState',
              params: ({ event, context }) => ({
                urlState: {
                  ...context.urlState,
                  flyoutTab: event.flyoutTab,
                },
              }),
            },
            raise({ type: 'url.sync' }),
          ],
        },
        'flyout.close': {
          actions: [
            {
              type: 'storeUrlState',
              params: ({ context }) => ({
                urlState: {
                  ...context.urlState,
                  flyoutName: null,
                  flyoutTab: null,
                },
              }),
            },
            raise({ type: 'url.sync' }),
          ],
        },
      },
      states: {
        unit: {
          initial: 'loading',
          states: {
            loading: {
              invoke: {
                id: 'loadUnitDefinition',
                src: 'loadUnitDefinition',
                onDone: {
                  target: 'ready',
                  actions: ['storeLoadedUnitDefinition', 'syncLoadedUnitDefinition'],
                },
                onError: {
                  target: 'loadFailed',
                  actions: ['storeUnitFailure', 'notifyUnitFailure'],
                },
              },
            },
            loadFailed: {
              on: {
                'unit.reload': { target: 'loading' },
              },
            },
            ready: {
              on: {
                'unit.changed': {
                  target: 'validating',
                  actions: 'prepareChangedUnitSave',
                },
                'unit.save': {
                  guard: 'hasUnsavedUnitChanges',
                  target: 'validating',
                  actions: 'prepareUnitSave',
                },
                'unit.reload': { target: 'reloading' },
              },
            },
            reloading: {
              invoke: {
                id: 'loadUnitDefinition',
                src: 'loadUnitDefinition',
                onDone: {
                  target: 'ready',
                  actions: ['storeLoadedUnitDefinition', 'syncLoadedUnitDefinition'],
                },
                onError: {
                  target: 'reloadFailed',
                  actions: ['storeUnitFailure', 'notifyUnitFailure'],
                },
              },
            },
            reloadFailed: {
              on: {
                'unit.reload': { target: 'reloading' },
                'unit.changed': {
                  target: 'validating',
                  actions: 'prepareChangedUnitSave',
                },
              },
            },
            validating: {
              on: {
                'unit.changed': {
                  target: 'validating',
                  reenter: true,
                  actions: 'prepareChangedUnitSave',
                },
              },
              invoke: {
                id: 'validateUnitDefinition',
                src: 'validateUnitDefinition',
                input: ({ context }) => context.savingUnit ?? context.nextUnit,
                onDone: {
                  target: 'persisting',
                },
                onError: [
                  {
                    guard: 'isSavingSourceChange',
                    target: 'saveFailed',
                    actions: [
                      'storeUnitFailure',
                      'syncSourceSaveFailure',
                      'rollbackFailedSourceSave',
                      'notifyUnitFailure',
                    ],
                  },
                  {
                    target: 'saveFailed',
                    actions: ['storeUnitFailure', 'notifyUnitFailure'],
                  },
                ],
              },
            },
            persisting: {
              on: {
                'unit.changed': {
                  target: 'validating',
                  reenter: true,
                  actions: 'prepareChangedUnitSave',
                },
              },
              invoke: {
                id: 'persistUnitDefinition',
                src: 'persistUnitDefinition',
                input: ({ context }) => ({
                  unitDefinition: context.savingUnit ?? context.nextUnit,
                  sourceId: context.savingSourceId,
                }),
                onDone: {
                  target: 'ready',
                  actions: ['storePersistedUnitDefinition', 'syncSavedUnitDefinition'],
                },
                onError: [
                  {
                    guard: 'isSavingSourceChange',
                    target: 'saveFailed',
                    actions: [
                      'storeUnitFailure',
                      'syncSourceSaveFailure',
                      'rollbackFailedSourceSave',
                      'notifyUnitFailure',
                    ],
                  },
                  {
                    target: 'saveFailed',
                    actions: ['storeUnitFailure', 'notifyUnitFailure'],
                  },
                ],
              },
            },
            saveFailed: {
              on: {
                'unit.changed': {
                  target: 'validating',
                  actions: 'prepareChangedUnitSave',
                },
                'unit.save': {
                  guard: 'hasUnsavedUnitChanges',
                  target: 'validating',
                  actions: 'prepareUnitSave',
                },
                'unit.reload': { target: 'reloading' },
              },
            },
          },
        },
      },
    },
  },
  context: ({ spawn, self }) => {
    const unitDefinition = createEmptyUnitDefinition();
    return {
      urlState: defaultUrlState,
      unit: unitDefinition,
      nextUnit: unitDefinition,
      savingUnit: undefined,
      savingSourceId: undefined,
      savingSourceIntent: undefined,
      // Kept in the Canvas parent so API-backed coordinates can be loaded and
      // persisted alongside the unit without changing the graph components.
      nodePositions: {},
      error: undefined,
      sourcesRef: spawn('sourcesMachine', {
        input: {
          unitDefinition,
          metadataBySourceId: {},
          includeUnconfiguredNodeOnCreate: true,
          parentRef: self,
        },
      }),
    };
  },
});

export function createCanvasMachineImplementations({
  core,
  urlStateStorageContainer,
  apiKeyGenerationDeps,
  loadSourceEnvironment,
  loadUnitDefinition = mockUnitDefinitionRepository.load,
  validateUnitDefinition = validateCanvasUnitDefinition,
  persistUnitDefinition = mockUnitDefinitionRepository.persist,
}: CanvasStateServiceDeps): MachineImplementationsFrom<typeof canvasStateMachine> {
  return {
    actors: {
      initializeUrl: createUrlInitializerActor({ core, urlStateStorageContainer }),
      sourcesMachine: createSourcesMachineActor({
        core,
        apiKeyGenerationDeps,
        loadSourceEnvironment,
      }),
      loadUnitDefinition: createLoadUnitDefinitionActor({ loadUnitDefinition }),
      validateUnitDefinition: createValidateUnitDefinitionActor({ validateUnitDefinition }),
      persistUnitDefinition: createPersistUnitDefinitionActor({ persistUnitDefinition }),
    },
    actions: {
      syncUrlState: createUrlSyncAction({ urlStateStorageContainer }),
      notifyUnitFailure: createNotifyUnitFailureAction({ core }),
    },
  };
}

function createSourcesMachineActor({
  core,
  apiKeyGenerationDeps,
  loadSourceEnvironment,
}: Pick<CanvasStateServiceDeps, 'core' | 'apiKeyGenerationDeps' | 'loadSourceEnvironment'>) {
  return sourcesStateMachine.provide(
    createSourcesMachineImplementations({
      apiKeyGenerationDeps,
      toasts: core.notifications.toasts,
      loadSourceEnvironment,
    })
  );
}

function createLoadUnitDefinitionActor({
  loadUnitDefinition,
}: {
  loadUnitDefinition: UnitDefinitionRepository['load'];
}) {
  return fromPromise(async () => loadUnitDefinition());
}

async function validateCanvasUnitDefinition(unitDefinition: SourcesUnitDefinition): Promise<void> {
  const sourceIds = unitDefinition.sources.map(({ id }) => id);
  if (new Set(sourceIds).size !== sourceIds.length) {
    throw new Error(
      i18n.translate('xpack.streams.streamDetailCanvas.duplicateSourceIdsErrorMessage', {
        defaultMessage: 'Source IDs must be unique.',
      })
    );
  }
}

function createValidateUnitDefinitionActor({
  validateUnitDefinition,
}: {
  validateUnitDefinition: NonNullable<CanvasStateServiceDeps['validateUnitDefinition']>;
}) {
  return fromPromise(async ({ input }: { input: SourcesUnitDefinition }) =>
    validateUnitDefinition(input)
  );
}

function createPersistUnitDefinitionActor({
  persistUnitDefinition,
}: {
  persistUnitDefinition: UnitDefinitionRepository['persist'];
}) {
  return fromPromise(
    async ({ input }: { input: { unitDefinition: SourcesUnitDefinition; sourceId?: string } }) => ({
      unitDefinition: await persistUnitDefinition(input.unitDefinition),
      sourceId: input.sourceId,
    })
  );
}

function createNotifyUnitFailureAction({ core }: Pick<CanvasStateServiceDeps, 'core'>) {
  return ({ event }: ActionArgs<CanvasState, CanvasUrlEvent, CanvasUrlEvent>) => {
    if (
      event.type === 'xstate.error.actor.loadUnitDefinition' ||
      event.type === 'xstate.error.actor.validateUnitDefinition' ||
      event.type === 'xstate.error.actor.persistUnitDefinition'
    ) {
      core.notifications.toasts.addError(toError(event.error), {
        title: i18n.translate('xpack.streams.streamDetailCanvas.sourcesConfigurationErrorMessage', {
          defaultMessage: 'Unable to update the sources configuration',
        }),
      });
    }
  };
}

function createUrlSyncAction({
  urlStateStorageContainer,
}: Pick<CanvasStateServiceDeps, 'urlStateStorageContainer'>) {
  return ({ context }: ActionArgs<CanvasState, CanvasUrlEvent, CanvasUrlEvent>) => {
    urlStateStorageContainer.set(CANVAS_URL_STATE_KEY, context.urlState, {
      replace: false,
    });
  };
}

function createUrlInitializerActor({
  core,
  urlStateStorageContainer,
}: Pick<CanvasStateServiceDeps, 'core' | 'urlStateStorageContainer'>) {
  return fromCallback(({ sendBack }) => {
    const urlStateValues = urlStateStorageContainer.get<CanvasUrlSchema>(CANVAS_URL_STATE_KEY);

    if (!urlStateValues) {
      return sendBack({
        type: 'url.init',
        urlState: defaultUrlState,
      });
    }

    const urlState = canvasUrlSchema.safeParse(urlStateValues);

    if (urlState.success) {
      urlState.data.flyoutTab =
        urlState.data.flyoutName && !urlState.data.flyoutTab ? 'overview' : urlState.data.flyoutTab;
      sendBack({
        type: 'url.init',
        urlState: urlState.data,
      });
    } else {
      withNotifyOnErrors(core.notifications.toasts).onGetError(
        new Error('The default state will be used as fallback.')
      );
      sendBack({
        type: 'url.init',
        urlState: defaultUrlState,
      });
    }
  });
}
