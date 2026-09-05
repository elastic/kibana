/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import {
  type ActionArgs,
  assign,
  fromCallback,
  fromPromise,
  type PromiseActorLogic,
  raise,
  setup,
} from 'xstate';
import { entityTableUrlSchema, type EntityTableUrlSchema } from '../../../../common/url_schema';
import type {
  EntityTableContext,
  EntityTableEvent,
  EntityTableInput,
  EntityTableUrlDeps,
  EntityTableUrlState,
} from './types';

/**
 * Creates the generic machine backing the Streams entity tables (Destinations,
 * and later Sources and Pipelines). It owns the row list (via the `fetchItems`
 * actor provided per entity) and the URL-synced search/sort/pagination state.
 */
export const createEntityTableMachine = <TItem>() =>
  setup({
    types: {
      input: {} as EntityTableInput,
      context: {} as EntityTableContext<TItem>,
      events: {} as EntityTableEvent,
    },
    actors: {
      initializeUrl: getPlaceholderFor(createUrlInitializerActor),
      fetchItems: getPlaceholderFor(
        (): PromiseActorLogic<TItem[]> => fromPromise(() => Promise.resolve<TItem[]>([]))
      ),
    },
    actions: {
      storeUrlState: assign((_, params: { urlState: EntityTableUrlState }) => ({
        urlState: params.urlState,
      })),
      syncUrlState: getPlaceholderFor(createUrlSyncAction<TItem>),
    },
  }).createMachine({
    id: 'entityTableMachine',
    context: ({ input }) => ({
      items: [],
      error: null,
      urlState: input.defaultUrlState,
    }),
    initial: 'initializingFromUrl',
    states: {
      initializingFromUrl: {
        invoke: {
          src: 'initializeUrl',
        },
        on: {
          'url.init': {
            actions: [
              { type: 'storeUrlState', params: ({ event }) => ({ urlState: event.urlState }) },
              { type: 'syncUrlState' },
            ],
            target: 'loading',
          },
        },
      },
      loading: {
        invoke: {
          src: 'fetchItems',
          onDone: {
            actions: assign(({ event }) => ({ items: event.output, error: null })),
            target: 'ready',
          },
          onError: {
            actions: assign(({ event }) => ({
              error: event.error instanceof Error ? event.error : new Error(String(event.error)),
            })),
            target: 'failure',
          },
        },
      },
      ready: {
        on: {
          'items.refresh': { target: 'loading' },
        },
      },
      failure: {
        on: {
          'items.refresh': { target: 'loading' },
        },
      },
    },
    on: {
      'url.sync': {
        actions: [{ type: 'syncUrlState' }],
      },
      'search.change': {
        actions: [
          {
            type: 'storeUrlState',
            // Searching changes the result set, so jump back to the first page.
            params: ({ context, event }) => ({
              urlState: { ...context.urlState, query: event.query, pageIndex: 0 },
            }),
          },
          raise({ type: 'url.sync', replace: true }),
        ],
      },
      'sort.change': {
        actions: [
          {
            type: 'storeUrlState',
            params: ({ context, event }) => ({
              urlState: {
                ...context.urlState,
                sortField: event.sortField,
                sortDirection: event.sortDirection,
                pageIndex: 0,
              },
            }),
          },
          raise({ type: 'url.sync' }),
        ],
      },
      'page.change': {
        actions: [
          {
            type: 'storeUrlState',
            params: ({ context, event }) => ({
              urlState: {
                ...context.urlState,
                pageIndex: event.pageIndex,
                pageSize: event.pageSize,
              },
            }),
          },
          raise({ type: 'url.sync' }),
        ],
      },
    },
  });

export interface EntityTableImplementations<TItem> {
  actors: {
    initializeUrl: ReturnType<typeof createUrlInitializerActor>;
    fetchItems: PromiseActorLogic<TItem[]>;
  };
  actions: {
    syncUrlState: ReturnType<typeof createUrlSyncAction<TItem>>;
  };
}

export function createEntityTableMachineImplementations<TItem>({
  core,
  urlStateStorageContainer,
  urlStateKey,
  defaultUrlState,
  fetchItems,
}: EntityTableUrlDeps & {
  fetchItems: PromiseActorLogic<TItem[]>;
}): EntityTableImplementations<TItem> {
  return {
    actors: {
      initializeUrl: createUrlInitializerActor({
        core,
        urlStateStorageContainer,
        urlStateKey,
        defaultUrlState,
      }),
      fetchItems,
    },
    actions: {
      syncUrlState: createUrlSyncAction<TItem>({ urlStateStorageContainer, urlStateKey }),
    },
  };
}

function createUrlSyncAction<TItem>({
  urlStateStorageContainer,
  urlStateKey,
}: Pick<EntityTableUrlDeps, 'urlStateStorageContainer' | 'urlStateKey'>) {
  return ({
    context,
    event,
  }: ActionArgs<EntityTableContext<TItem>, EntityTableEvent, EntityTableEvent>) => {
    urlStateStorageContainer.set(urlStateKey, context.urlState, {
      replace: event.type === 'url.sync' && event.replace === true,
    });
  };
}

function createUrlInitializerActor({
  core,
  urlStateStorageContainer,
  urlStateKey,
  defaultUrlState,
}: EntityTableUrlDeps) {
  return fromCallback(({ sendBack }: { sendBack: (event: EntityTableEvent) => void }) => {
    const urlStateValues = urlStateStorageContainer.get<EntityTableUrlSchema>(urlStateKey);

    if (!urlStateValues) {
      return sendBack({ type: 'url.init', urlState: defaultUrlState });
    }

    const urlState = entityTableUrlSchema.safeParse(urlStateValues);

    if (urlState.success) {
      sendBack({
        type: 'url.init',
        urlState: { ...defaultUrlState, ...urlState.data },
      });
    } else {
      withNotifyOnErrors(core.notifications.toasts).onGetError(
        new Error('The default state will be used as fallback.')
      );
      sendBack({ type: 'url.init', urlState: defaultUrlState });
    }
  });
}
