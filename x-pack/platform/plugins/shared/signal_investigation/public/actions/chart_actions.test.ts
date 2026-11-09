/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, of } from 'rxjs';

jest.mock('../telemetry/shown_telemetry', () => ({
  reportSignalInvestigationShown: jest.fn(),
}));
import { buildPhraseFilter, buildRangeFilter, type Filter } from '@kbn/es-query';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { LensApi, LensPublicStart } from '@kbn/lens-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { reportSignalInvestigationShown } from '../telemetry/shown_telemetry';
import {
  createFindRelatedChangesChartAction,
  createFindRelatedChangesPanelAction,
  isChartFilterActionCompatible,
  resolveChartOrigin,
} from './chart_actions';

const reportShown = reportSignalInvestigationShown as jest.Mock;

const indexPattern = { id: 'logs-view', title: 'logs-*' };

const rangeFilter = (): Filter =>
  buildRangeFilter(
    { name: '@timestamp', type: 'date' } as never,
    { gte: '2026-11-02T11:10:00.000Z', lte: '2026-11-02T11:20:00.000Z' },
    indexPattern as never
  );

const phraseFilter = (): Filter =>
  buildPhraseFilter({ name: 'service.name', type: 'string' }, 'checkout', indexPattern);

const makeLensEmbeddable = (): LensApi =>
  ({
    type: LENS_EMBEDDABLE_TYPE,
    canViewUnderlyingData$: new BehaviorSubject(true),
    getSavedVis: () => ({}),
    getViewUnderlyingDataArgs: () => ({}),
    isTextBasedLanguage: () => false,
    getTextBasedLanguage: () => '',
    title$: new BehaviorSubject('Checkout requests'),
    hideTitle$: new BehaviorSubject(false),
    timeRange$: new BehaviorSubject({
      from: '2026-11-02T11:00:00.000Z',
      to: '2026-11-02T12:00:00.000Z',
    }),
    filters$: new BehaviorSubject<Filter[]>([]),
    query$: new BehaviorSubject({ language: 'kuery', query: '' }),
    dataSources$: new BehaviorSubject([indexPattern]),
  } as unknown as LensApi);

const makeServices = (platinum = true) => {
  const openInvestigation = jest.fn(async () => {});
  const lens = {
    stateHelperApi: async () => ({
      chartInfo: Promise.resolve({
        getChartInfo: async () => undefined,
      }),
    }),
  } as unknown as LensPublicStart;
  const licensing = {
    license$: of({ hasAtLeast: () => platinum }),
  } as unknown as LicensingPluginStart;

  return { openInvestigation, lens, licensing };
};

describe('isChartFilterActionCompatible', () => {
  it('requires chartActionEnabled, a compatible space, a Lens embeddable, and a time-range filter', () => {
    const embeddable = makeLensEmbeddable();
    const filters = [rangeFilter(), phraseFilter()];

    expect(
      isChartFilterActionCompatible({
        chartActionEnabled: true,
        isCompatibleSpace: true,
        currentAppId: 'discover',
        context: { embeddable, filters, timeFieldName: '@timestamp' },
      })
    ).toEqual({
      compatible: true,
      origin: { app: 'discover', surface: 'histogram' },
      timeRange: {
        from: '2026-11-02T11:10:00.000Z',
        to: '2026-11-02T11:20:00.000Z',
      },
      restOfFilters: [phraseFilter()],
    });

    // Rejects when flag is disabled
    expect(
      isChartFilterActionCompatible({
        chartActionEnabled: false,
        isCompatibleSpace: true,
        currentAppId: 'discover',
        context: { embeddable, filters, timeFieldName: '@timestamp' },
      }).compatible
    ).toBe(false);

    // Rejects in Security/Search spaces
    expect(
      isChartFilterActionCompatible({
        chartActionEnabled: true,
        isCompatibleSpace: false,
        currentAppId: 'discover',
        context: { embeddable, filters, timeFieldName: '@timestamp' },
      }).compatible
    ).toBe(false);

    // Rejects saved-search cell filter events without a time-range filter or Lens embeddable
    expect(
      isChartFilterActionCompatible({
        chartActionEnabled: true,
        isCompatibleSpace: true,
        currentAppId: 'discover',
        context: {
          embeddable: { type: 'search' },
          filters: [phraseFilter()],
          timeFieldName: '@timestamp',
        },
      }).compatible
    ).toBe(false);

    expect(
      isChartFilterActionCompatible({
        chartActionEnabled: true,
        isCompatibleSpace: true,
        currentAppId: 'discover',
        context: { embeddable, filters: [phraseFilter()], timeFieldName: '@timestamp' },
      }).compatible
    ).toBe(false);

    expect(
      isChartFilterActionCompatible({
        chartActionEnabled: true,
        isCompatibleSpace: true,
        currentAppId: 'apm',
        context: { embeddable, filters, timeFieldName: '@timestamp' },
      }).compatible
    ).toBe(false);
  });
});

describe('resolveChartOrigin', () => {
  it('uses the dashboard parent, then Discover, and rejects other apps', () => {
    const discoverEmbeddable = makeLensEmbeddable();
    expect(
      resolveChartOrigin({ embeddable: discoverEmbeddable, currentAppId: 'discover' })
    ).toEqual({
      app: 'discover',
      surface: 'histogram',
    });
    expect(resolveChartOrigin({ embeddable: discoverEmbeddable, currentAppId: 'apm' })).toBe(
      undefined
    );

    const dashboardEmbeddable = {
      ...makeLensEmbeddable(),
      parentApi: { type: 'dashboard' },
    } as unknown as LensApi;
    expect(resolveChartOrigin({ embeddable: dashboardEmbeddable, currentAppId: 'apm' })).toEqual({
      app: 'dashboard',
      panelTitle: 'Checkout requests',
    });
  });
});

describe('createFindRelatedChangesPanelAction and createFindRelatedChangesChartAction', () => {
  it('checks license and space compatibility and opens the investigation with session start', async () => {
    const services = makeServices(true);
    const deps = {
      chartActionEnabled: true,
      isCompatibleSpace: () => true,
      getCurrentAppId: () => 'discover',
      getServices: async () => services,
    };

    const panelAction = createFindRelatedChangesPanelAction(deps);
    const chartAction = createFindRelatedChangesChartAction(deps);
    const embeddable = makeLensEmbeddable();

    expect(await panelAction.isCompatible?.({ embeddable })).toBe(true);
    await panelAction.execute({ embeddable });
    expect(services.openInvestigation).toHaveBeenCalledWith(
      expect.objectContaining({
        session: 'start',
        metricUnreadable: true,
      })
    );

    const chartContext = {
      embeddable,
      filters: [rangeFilter(), phraseFilter()],
      timeFieldName: '@timestamp',
    };
    expect(await chartAction.isCompatible?.(chartContext)).toBe(true);
    await chartAction.execute(chartContext);
    expect(services.openInvestigation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        session: 'start',
        seed: expect.objectContaining({
          origin: { app: 'discover', surface: 'histogram' },
          timeRange: {
            from: '2026-11-02T11:10:00.000Z',
            to: '2026-11-02T11:20:00.000Z',
          },
          entities: { 'service.name': 'checkout' },
        }),
      })
    );

    const otherAppDeps = { ...deps, getCurrentAppId: () => 'apm' };
    expect(
      await createFindRelatedChangesPanelAction(otherAppDeps).isCompatible?.({ embeddable })
    ).toBe(false);
    expect(
      await createFindRelatedChangesChartAction(otherAppDeps).isCompatible?.(chartContext)
    ).toBe(false);
  });

  it('reports the panel action once per embeddable and the chart action on every brush', async () => {
    reportShown.mockClear();
    const services = makeServices(true);
    const deps = {
      chartActionEnabled: true,
      isCompatibleSpace: () => true,
      getCurrentAppId: () => 'dashboard',
      getServices: async () => services,
    };
    const panelAction = createFindRelatedChangesPanelAction(deps);
    const firstPanel = {
      ...makeLensEmbeddable(),
      parentApi: { type: 'dashboard' },
    } as unknown as LensApi;
    const secondPanel = {
      ...makeLensEmbeddable(),
      parentApi: { type: 'dashboard' },
    } as unknown as LensApi;

    expect(await panelAction.isCompatible?.({ embeddable: firstPanel })).toBe(true);
    expect(await panelAction.isCompatible?.({ embeddable: firstPanel })).toBe(true);
    expect(await panelAction.isCompatible?.({ embeddable: secondPanel })).toBe(true);
    expect(reportShown).toHaveBeenCalledTimes(2);
    expect(reportShown).toHaveBeenNthCalledWith(1, {
      app: 'dashboard',
      surface: 'panelMenu',
    });

    reportShown.mockClear();
    const chartAction = createFindRelatedChangesChartAction({
      ...deps,
      getCurrentAppId: () => 'discover',
    });
    const chartContext = {
      embeddable: makeLensEmbeddable(),
      filters: [rangeFilter(), phraseFilter()],
      timeFieldName: '@timestamp',
    };
    expect(await chartAction.isCompatible?.(chartContext)).toBe(true);
    expect(await chartAction.isCompatible?.(chartContext)).toBe(true);
    expect(reportShown).toHaveBeenCalledTimes(2);
    expect(reportShown).toHaveBeenCalledWith({
      app: 'discover',
      surface: 'histogram',
    });
  });
});
