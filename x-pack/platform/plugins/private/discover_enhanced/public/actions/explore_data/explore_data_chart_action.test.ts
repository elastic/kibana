/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/public/mocks';
import { DataView } from '@kbn/data-views-plugin/common';
import { DiscoverAppLocator } from '@kbn/discover-plugin/common';
import type { Filter, RangeFilter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { ViewMode } from '@kbn/presentation-publishing';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { BehaviorSubject } from 'rxjs';
import { Params, PluginDeps } from './abstract_explore_data_action';
import { ExploreDataChartAction, ExploreDataChartActionContext } from './explore_data_chart_action';

const i18nTranslateSpy = i18n.translate as unknown as jest.SpyInstance;

jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: jest.fn((key, options) => options.defaultMessage),
  },
}));

afterEach(() => {
  i18nTranslateSpy.mockClear();
});

const setup = (
  {
    useRangeEvent = false,
    timeFieldName,
    filters = [],
  }: {
    useRangeEvent?: boolean;
    filters?: Filter[];
    timeFieldName?: string;
  } = { filters: [] }
) => {
  const core = coreMock.createStart();
  const locator: DiscoverAppLocator = {
    ...sharePluginMock.createLocator(),
    getLocation: jest.fn(() =>
      Promise.resolve({
        app: 'discover',
        path: '/foo#bar',
        state: {},
      })
    ),
  };

  const plugins: PluginDeps = {
    discover: {
      locator,
    },
  };

  const params: Params = {
    start: () => ({
      plugins,
      self: {},
      core,
    }),
  };
  const action = new ExploreDataChartAction(params);

  const embeddable = {
    type: 'anyEmbeddable',
    dataViews$: new BehaviorSubject<undefined | DataView[]>([
      {
        id: 'index-ptr-foo',
      } as DataView,
    ]),
    filters$: new BehaviorSubject<Filter[]>([]),
    parentApi: {
      viewMode$: new BehaviorSubject<ViewMode>('view'),
    },
  };

  const context = {
    filters,
    timeFieldName,
    embeddable,
  } as ExploreDataChartActionContext;

  return { core, plugins, locator, params, action, embeddable, context };
};

describe('"Explore underlying data" panel action', () => {
  test('action has Discover icon', () => {
    const { action } = setup();
    expect(action.getIconType()).toBe('discoverApp');
  });

  test('title is "Explore underlying data"', () => {
    const { action } = setup();
    expect(action.getDisplayName()).toBe('Explore underlying data');
  });

  test('translates title', () => {
    expect(i18nTranslateSpy).toHaveBeenCalledTimes(0);

    const { action } = setup();
    action.getDisplayName();

    expect(i18nTranslateSpy).toHaveBeenCalledTimes(1);
    expect(i18nTranslateSpy.mock.calls[0][0]).toBe(
      'xpack.discover.FlyoutCreateDrilldownAction.displayName'
    );
  });

  describe('isCompatible()', () => {
    test('returns true when all conditions are met', async () => {
      const { action, context } = setup();

      const isCompatible = await action.isCompatible(context);

      expect(isCompatible).toBe(true);
    });

    test('returns false when URL generator is not present', async () => {
      const { action, plugins, context } = setup();
      (plugins.discover as any).locator = undefined;

      const isCompatible = await action.isCompatible(context);

      expect(isCompatible).toBe(false);
    });

    test('returns false if embeddable has more than one data view', async () => {
      const { action, embeddable, context } = setup();
      embeddable.dataViews$ = new BehaviorSubject<undefined | DataView[]>([
        {
          id: 'index-ptr-foo',
        } as DataView,
        {
          id: 'index-ptr-bar',
        } as DataView,
      ]);

      const isCompatible = await action.isCompatible(context);

      expect(isCompatible).toBe(false);
    });

    test('returns false if embeddable does not have data views', async () => {
      const { action, embeddable, context } = setup();
      // @ts-expect-error
      embeddable.dataViews$ = undefined;

      const isCompatible = await action.isCompatible(context);

      expect(isCompatible).toBe(false);
    });

    test('returns false if embeddable data views are empty', async () => {
      const { action, embeddable, context } = setup();
      embeddable.dataViews$ = new BehaviorSubject<undefined | DataView[]>([]);

      const isCompatible = await action.isCompatible(context);

      expect(isCompatible).toBe(false);
    });

    test('returns false if dashboard is in edit mode', async () => {
      const { action, embeddable, context } = setup();
      if (embeddable.parentApi) {
        embeddable.parentApi.viewMode$ = new BehaviorSubject<ViewMode>('edit');
      }
      const isCompatible = await action.isCompatible(context);

      expect(isCompatible).toBe(false);
    });

    test('returns false if Discover app is disabled', async () => {
      const { action, context, core } = setup();

      core.application.capabilities = { ...core.application.capabilities };
      (core.application.capabilities as any).discover_v2 = {
        show: false,
      };

      const isCompatible = await action.isCompatible(context);
      expect(isCompatible).toBe(false);
    });
  });

  describe('getHref()', () => {
    test('calls URL generator with right arguments', async () => {
      const { action, locator, context } = setup();

      expect(locator.getLocation).toHaveBeenCalledTimes(0);

      await action.getHref(context);

      expect(locator.getLocation).toHaveBeenCalledTimes(1);
      expect(locator.getLocation).toHaveBeenCalledWith({
        filters: [],
        dataViewId: 'index-ptr-foo',
        timeRange: undefined,
      });
    });

    test('applies chart event filters', async () => {
      const timeFieldName = 'timeField';
      const from = '2020-07-13T13:40:43.583Z';
      const to = '2020-07-13T13:44:43.583Z';
      const filters: Array<Filter | RangeFilter> = [
        {
          meta: {
            alias: 'alias',
            disabled: false,
            negate: false,
          },
        },
        {
          meta: {
            alias: 'alias',
            disabled: false,
            negate: false,
            field: timeFieldName,
            params: {
              gte: from,
              lte: to,
            },
          },
          query: {
            range: {
              [timeFieldName]: {
                gte: from,
                lte: to,
              },
            },
          },
        },
      ];

      const { action, context, locator } = setup({ filters, timeFieldName });

      await action.getHref(context);

      expect(locator.getLocation).toHaveBeenCalledWith({
        filters: [
          {
            meta: {
              alias: 'alias',
              disabled: false,
              negate: false,
            },
          },
        ],
        dataViewId: 'index-ptr-foo',
        timeRange: {
          from,
          to,
        },
      });
    });
  });

  describe('execute()', () => {
    test('calls platform SPA navigation method', async () => {
      const { action, context, core } = setup();

      expect(core.application.navigateToApp).toHaveBeenCalledTimes(0);

      await action.execute(context);

      expect(core.application.navigateToApp).toHaveBeenCalledTimes(1);
    });

    test('calls platform SPA navigation method with right arguments', async () => {
      const { action, context, core } = setup();

      await action.execute(context);

      expect(core.application.navigateToApp).toHaveBeenCalledTimes(1);
      expect(core.application.navigateToApp.mock.calls[0]).toEqual([
        'discover',
        {
          path: '/foo#bar',
        },
      ]);
    });
  });
});
