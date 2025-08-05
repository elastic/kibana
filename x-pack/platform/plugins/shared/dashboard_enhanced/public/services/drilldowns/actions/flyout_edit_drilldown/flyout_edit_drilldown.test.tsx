/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';
import type { EmbeddableApiContext, ViewMode } from '@kbn/presentation-publishing';
import { SerializedEvent } from '@kbn/ui-actions-enhanced-plugin/common';
import {
  UiActionsEnhancedDynamicActionManager as DynamicActionManager,
  UiActionsEnhancedMemoryActionStorage as MemoryActionStorage,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { uiActionsEnhancedPluginMock } from '@kbn/ui-actions-enhanced-plugin/public/mocks';
import { BehaviorSubject } from 'rxjs';
import { flyoutEditDrilldownAction } from './flyout_edit_drilldown';
import { ActionDefinitionContext } from '@kbn/ui-actions-plugin/public/actions';

jest.mock('../../../kibana_services', () => {
  return {
    coreServices: {
      overlays: {
        openFlyout: jest.fn(),
      },
      application: {
        currentAppId$: { pipe: () => ({ subscribe: () => {} }) },
      },
    } as any,
    uiActionsEnhancedServices: {},
  };
});
import { coreServices } from '../../../kibana_services';

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
  viewMode$: new BehaviorSubject<ViewMode>('edit'),
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
const context = {} as unknown as ActionDefinitionContext<EmbeddableApiContext>;

test('title is a string', () => {
  expect(
    flyoutEditDrilldownAction.getDisplayName &&
      typeof flyoutEditDrilldownAction.getDisplayName(context) === 'string'
  ).toBeTruthy();
});

test('icon exists', () => {
  expect(
    flyoutEditDrilldownAction.getIconType &&
      typeof flyoutEditDrilldownAction.getIconType(context) === 'string'
  ).toBe(true);
});

test('MenuItem exists', () => {
  expect(flyoutEditDrilldownAction.MenuItem).toBeDefined();
});

describe('isCompatible', () => {
  test("compatible if dynamicUiActions enabled (with event), 'VALUE_CLICK_TRIGGER' is supported, in edit mode", async () => {
    expect(
      flyoutEditDrilldownAction.isCompatible &&
        (await flyoutEditDrilldownAction.isCompatible({ embeddable: compatibleEmbeddableApi }))
    ).toBe(true);
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
    expect(
      flyoutEditDrilldownAction.isCompatible &&
        (await flyoutEditDrilldownAction.isCompatible({ embeddable: embeddableApi }))
    ).toBe(false);
  });

  test('not compatible if embeddable is not enhanced', async () => {
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      enhancements: undefined,
    };
    expect(
      flyoutEditDrilldownAction.isCompatible &&
        (await flyoutEditDrilldownAction.isCompatible({ embeddable: embeddableApi }))
    ).toBe(false);
  });

  test('not compatible in view mode', async () => {
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      viewMode$: new BehaviorSubject<ViewMode>('view'),
    };
    expect(
      flyoutEditDrilldownAction.isCompatible &&
        (await flyoutEditDrilldownAction.isCompatible({ embeddable: embeddableApi }))
    ).toBe(false);
  });
});

describe('execute', () => {
  test('throws error if no dynamicUiActions', async () => {
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      enhancements: undefined,
    };
    await expect(
      flyoutEditDrilldownAction.execute({
        embeddable: embeddableApi,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Action is incompatible"`);
  });

  test('should open flyout', async () => {
    await flyoutEditDrilldownAction.execute({
      embeddable: compatibleEmbeddableApi,
    });

    expect(coreServices.overlays.openFlyout).toBeCalled();
  });
});
