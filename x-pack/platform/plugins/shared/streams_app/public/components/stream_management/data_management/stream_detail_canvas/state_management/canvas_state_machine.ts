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
import type { CanvasStateServiceDeps, CanvasUrlInput, CanvasUrlEvent, CanvasState } from './types';

const defaultUrlState = {
  flyoutName: null,
  flyoutTab: null,
};

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
      },
    },
  },
  context: {
    urlState: defaultUrlState,
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
    },
  };
}

function createUrlSyncAction({
  urlStateStorageContainer,
}: Pick<CanvasStateServiceDeps, 'urlStateStorageContainer'>) {
  return ({
    context,
  }: ActionArgs<{ urlState: CanvasUrlInput }, CanvasUrlEvent, CanvasUrlEvent>) => {
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
