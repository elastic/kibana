/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public/plugin';
import type { ViewMode } from '@kbn/presentation-publishing';
import { SerializedEvent } from '@kbn/ui-actions-enhanced-plugin/common';
import {
  UiActionsEnhancedDynamicActionManager as DynamicActionManager,
  UiActionsEnhancedMemoryActionStorage as MemoryActionStorage,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { uiActionsEnhancedPluginMock } from '@kbn/ui-actions-enhanced-plugin/public/mocks';
import { BehaviorSubject, Subject } from 'rxjs';
import { FlyoutEditDrilldownAction, FlyoutEditDrilldownParams } from './flyout_edit_drilldown';

function createAction(overlays = coreMock.createStart().overlays) {
  const uiActionsPlugin = uiActionsEnhancedPluginMock.createPlugin();
  const uiActions = uiActionsPlugin.doStart();
  const params: FlyoutEditDrilldownParams = {
    start: () => ({
      core: {
        overlays,
        application: {
          currentAppId$: new Subject(),
        },
        theme: {
          theme$: new Subject(),
        },
      } as any,
      plugins: {
        uiActionsEnhanced: uiActions,
      },
      self: {},
    }),
  };
  return new FlyoutEditDrilldownAction(params);
}
const dynamicActionsState$ = new BehaviorSubject<DynamicActionsSerializedState['enhancements']>({
  dynamicActions: { events: [{} as SerializedEvent] },
});

const compatibleEmbeddableApi = {
  enhancements: {
    dynamicActions: new DynamicActionManager({
      storage: new MemoryActionStorage(),
      isCompatible: async () => true,
      uiActions: uiActionsEnhancedPluginMock.createStartContract(),
    }),
  },
  setDynamicActions: (newDynamicActions: DynamicActionsSerializedState['enhancements']) => {
    dynamicActionsState$.next(newDynamicActions);
  },
  dynamicActionsState$,
  supportedTriggers: () => {
    return ['VALUE_CLICK_TRIGGER'];
  },
  viewMode: new BehaviorSubject<ViewMode>('edit'),
};

beforeAll(async () => {
  await compatibleEmbeddableApi.enhancements.dynamicActions.createEvent(
    {
      config: {},
      factoryId: 'foo',
      name: '',
    },
    ['VALUE_CLICK_TRIGGER']
  );
});

test('title is a string', () => {
  expect(typeof createAction().getDisplayName() === 'string').toBe(true);
});

test('icon exists', () => {
  expect(typeof createAction().getIconType() === 'string').toBe(true);
});

test('MenuItem exists', () => {
  expect(createAction().MenuItem).toBeDefined();
});

describe('isCompatible', () => {
  test("compatible if dynamicUiActions enabled (with event), 'VALUE_CLICK_TRIGGER' is supported, in edit mode", async () => {
    const action = createAction();
    expect(await action.isCompatible({ embeddable: compatibleEmbeddableApi })).toBe(true);
  });

  test('not compatible if no drilldowns', async () => {
    const newDynamicActionsState$ = new BehaviorSubject<
      DynamicActionsSerializedState['enhancements']
    >({
      dynamicActions: { events: [] },
    });

    const embeddableApi = {
      ...compatibleEmbeddableApi,
      dynamicActionsState$: newDynamicActionsState$,
      setDynamicActions: (newDynamicActions: DynamicActionsSerializedState['enhancements']) => {
        newDynamicActionsState$.next(newDynamicActions);
      },
    };
    const action = createAction();
    expect(await action.isCompatible({ embeddable: embeddableApi })).toBe(false);
  });

  test('not compatible if embeddable is not enhanced', async () => {
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      enhancements: undefined,
    };
    const action = createAction();
    expect(await action.isCompatible({ embeddable: embeddableApi })).toBe(false);
  });

  test('not compatible in view mode', async () => {
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      viewMode: new BehaviorSubject<ViewMode>('view'),
    };
    const action = createAction();
    expect(await action.isCompatible({ embeddable: embeddableApi })).toBe(false);
  });
});

describe('execute', () => {
  test('throws error if no dynamicUiActions', async () => {
    const action = createAction();
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      enhancements: undefined,
    };
    await expect(
      action.execute({
        embeddable: embeddableApi,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Action is incompatible"`);
  });

  test('should open flyout', async () => {
    const overlays = coreMock.createStart().overlays;
    const spy = jest.spyOn(overlays, 'openFlyout');
    const action = createAction(overlays);
    await action.execute({
      embeddable: compatibleEmbeddableApi,
    });
    expect(spy).toBeCalled();
  });
});
