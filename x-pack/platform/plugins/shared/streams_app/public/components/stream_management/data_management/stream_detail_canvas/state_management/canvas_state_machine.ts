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
  type MachineImplementationsFrom,
  raise,
  setup,
} from 'xstate';
import {
  CANVAS_URL_STATE_KEY,
  canvasUrlSchema,
  type CanvasUrlSchema,
} from '../../../../../../common/url_schema';
import {
  defaultCanvasUrlState,
  toCanvasUrlInput,
  type CanvasState,
  type CanvasStateServiceDeps,
  type CanvasUrlEvent,
  type CanvasUrlInput,
} from './types';

export const canvasStateMachine = setup({
  types: {
    input: {} as CanvasUrlInput,
    context: {} as CanvasState,
    events: {} as CanvasUrlEvent,
  },
  actors: {
    initializeUrl: getPlaceholderFor(createUrlInitializerActor),
  },
  actions: {
    /* URL state actions */
    storeUrlState: assign((_, params: CanvasState) => ({
      urlState: params.urlState,
    })),
    syncUrlState: getPlaceholderFor(createUrlSyncAction),
    syncUrlStateReplace: getPlaceholderFor(createUrlSyncReplaceAction),
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
        'focus.clear': {
          actions: [
            {
              type: 'storeUrlState',
              params: ({ context }) => ({
                urlState: {
                  ...context.urlState,
                  focusNodeId: null,
                },
              }),
            },
            { type: 'syncUrlStateReplace' },
          ],
        },
      },
    },
  },
  context: {
    urlState: defaultCanvasUrlState,
  },
});

export function createCanvasMachineImplementations({
  core,
  urlStateStorageContainer,
}: CanvasStateServiceDeps): MachineImplementationsFrom<typeof canvasStateMachine> {
  return {
    actors: {
      initializeUrl: createUrlInitializerActor({ core, urlStateStorageContainer }),
    },
    actions: {
      syncUrlState: createUrlSyncAction({ urlStateStorageContainer }),
      syncUrlStateReplace: createUrlSyncReplaceAction({ urlStateStorageContainer }),
    },
  };
}

function createUrlSyncAction({
  urlStateStorageContainer,
}: Pick<CanvasStateServiceDeps, 'urlStateStorageContainer'>) {
  return createUrlSync({ urlStateStorageContainer, replace: false });
}

function createUrlSyncReplaceAction({
  urlStateStorageContainer,
}: Pick<CanvasStateServiceDeps, 'urlStateStorageContainer'>) {
  return createUrlSync({ urlStateStorageContainer, replace: true });
}

function createUrlSync({
  urlStateStorageContainer,
  replace,
}: Pick<CanvasStateServiceDeps, 'urlStateStorageContainer'> & { replace: boolean }) {
  return ({
    context,
  }: ActionArgs<{ urlState: CanvasUrlInput }, CanvasUrlEvent, CanvasUrlEvent>) => {
    urlStateStorageContainer.set(CANVAS_URL_STATE_KEY, context.urlState, {
      replace,
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
        urlState: defaultCanvasUrlState,
      });
    }

    const urlState = canvasUrlSchema.safeParse(urlStateValues);

    if (urlState.success) {
      const nextUrlState = toCanvasUrlInput(urlState.data);
      sendBack({
        type: 'url.init',
        urlState: {
          ...nextUrlState,
          flyoutTab:
            nextUrlState.flyoutName && !nextUrlState.flyoutTab
              ? 'overview'
              : nextUrlState.flyoutTab,
        },
      });
    } else {
      withNotifyOnErrors(core.notifications.toasts).onGetError(
        new Error('The default state will be used as fallback.')
      );
      sendBack({
        type: 'url.init',
        urlState: defaultCanvasUrlState,
      });
    }
  });
}
