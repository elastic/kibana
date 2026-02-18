/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { ActionDefinitionContext } from '@kbn/ui-actions-plugin/public/actions';
import {
  UiActionsEnhancedMemoryActionStorage as MemoryActionStorage,
  UiActionsEnhancedDynamicActionManager as DynamicActionManager,
} from '@kbn/ui-actions-enhanced-plugin/public';
import type { EmbeddableApiContext, ViewMode } from '@kbn/presentation-publishing';
import { flyoutCreateDrilldownAction } from './flyout_create_drilldown';
import { uiActionsEnhancedPluginMock } from '@kbn/ui-actions-enhanced-plugin/public/mocks';
import type { UiActionsEnhancedActionFactory } from '@kbn/ui-actions-enhanced-plugin/public';
import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';
import { ON_CLICK_VALUE, ON_SELECT_RANGE } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { coreServices, uiActionsEnhancedServices } from '../../../kibana_services';

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
    uiActionsEnhancedServices: {
      getActionFactories: jest.fn(() => [
        {
          supportedTriggers: () => ['on_click_value'],
          isCompatibleLicense: () => true,
        } as unknown as UiActionsEnhancedActionFactory,
      ]),
    },
  };
});

const dynamicActionsState$ = new BehaviorSubject<DynamicActionsSerializedState['enhancements']>({
  dynamicActions: { events: [] },
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
  parentApi: {
    type: 'dashboard',
  },
  supportedTriggers: () => {
    return [ON_CLICK_VALUE];
  },
  viewMode$: new BehaviorSubject<ViewMode>('edit'),
};

const context = {} as unknown as ActionDefinitionContext<EmbeddableApiContext>;

test('title is a string', () => {
  expect(
    flyoutCreateDrilldownAction.getDisplayName &&
      typeof flyoutCreateDrilldownAction.getDisplayName(context) === 'string'
  ).toBe(true);
});

test('icon exists', () => {
  expect(
    flyoutCreateDrilldownAction.getIconType &&
      typeof flyoutCreateDrilldownAction.getIconType(context) === 'string'
  ).toBe(true);
});

describe('isCompatible', () => {
  test('compatible if dynamicUiActions enabled, ON_CLICK_VALUE is supported, in edit mode', async () => {
    expect(
      flyoutCreateDrilldownAction.isCompatible &&
        (await flyoutCreateDrilldownAction.isCompatible({ embeddable: compatibleEmbeddableApi }))
    ).toBe(true);
  });

  test('not compatible if embeddable is not enhanced', async () => {
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      enhancements: undefined,
    };
    expect(
      flyoutCreateDrilldownAction.isCompatible &&
        (await flyoutCreateDrilldownAction.isCompatible({ embeddable: embeddableApi }))
    ).toBe(false);
  });

  test('not compatible if ON_CLICK_VALUE is not supported', async () => {
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      supportedTriggers: () => {
        return [];
      },
    };
    expect(
      flyoutCreateDrilldownAction.isCompatible &&
        (await flyoutCreateDrilldownAction.isCompatible({ embeddable: embeddableApi }))
    ).toBe(false);
  });

  test('not compatible if in view mode', async () => {
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      viewMode$: new BehaviorSubject<ViewMode>('view'),
    };
    expect(
      flyoutCreateDrilldownAction.isCompatible &&
        (await flyoutCreateDrilldownAction.isCompatible({ embeddable: embeddableApi }))
    ).toBe(false);
  });

  test('not compatible if parent embeddable is not "dashboard"', async () => {
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      parentApi: {
        type: 'visualization',
      },
    };
    expect(
      flyoutCreateDrilldownAction.isCompatible &&
        (await flyoutCreateDrilldownAction.isCompatible({ embeddable: embeddableApi }))
    ).toBe(false);
  });
  test('not compatible if no triggers intersect', async () => {
    // Mock getActionFactories to return a factory that only supports ON_SELECT_RANGE
    (uiActionsEnhancedServices.getActionFactories as jest.Mock).mockImplementation(() => [
      {
        supportedTriggers: () => [ON_SELECT_RANGE],
        isCompatibleLicense: () => true,
      } as unknown as UiActionsEnhancedActionFactory,
    ]);

    expect(
      flyoutCreateDrilldownAction.isCompatible &&
        (await flyoutCreateDrilldownAction.isCompatible({ embeddable: compatibleEmbeddableApi }))
    ).toBe(false);
    (uiActionsEnhancedServices.getActionFactories as jest.Mock).mockImplementation(() => [
      {
        supportedTriggers: () => [],
        isCompatibleLicense: () => true,
      } as unknown as UiActionsEnhancedActionFactory,
    ]);
    expect(
      flyoutCreateDrilldownAction.isCompatible &&
        (await flyoutCreateDrilldownAction.isCompatible({ embeddable: compatibleEmbeddableApi }))
    ).toBe(false);
  });
});

describe('execute', () => {
  test('throws if no dynamicUiActions', async () => {
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      enhancements: undefined,
    };
    await expect(
      flyoutCreateDrilldownAction.execute({ embeddable: embeddableApi })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Action is incompatible"`);
  });

  test('should open flyout', async () => {
    await flyoutCreateDrilldownAction.execute({
      embeddable: compatibleEmbeddableApi,
    });
    expect(coreServices.overlays.openFlyout).toBeCalled();
  });
});
