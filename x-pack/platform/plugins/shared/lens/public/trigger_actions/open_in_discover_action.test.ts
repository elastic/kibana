/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsService } from '@kbn/data-views-plugin/public';
import { type EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { createOpenInDiscoverAction } from './open_in_discover_action';
import type { DiscoverAppLocator } from './open_in_discover_helpers';
import { getLensApiMock } from '../react_embeddable/mocks';

describe('open in discover action', () => {
  const compatibleEmbeddableApi = getLensApiMock();

  describe('compatibility check', () => {
    it('is incompatible with non-lens embeddables', async () => {
      const embeddable = { type: 'NOT_LENS' };

      const isCompatible = await createOpenInDiscoverAction(
        {} as DiscoverAppLocator,
        {} as DataViewsService,
        true
      ).isCompatible({
        embeddable,
      } as ActionExecutionContext<EmbeddableApiContext>);

      expect(isCompatible).toBeFalsy();
    });
    it('is incompatible if user cant access Discover app', async () => {
      // setup
      const lensApi = {
        ...compatibleEmbeddableApi,
        canViewUnderlyingData$: { getValue: jest.fn(() => true) },
      };

      let hasDiscoverAccess = true;
      // make sure it would work if we had access to Discover
      expect(
        await createOpenInDiscoverAction(
          {} as DiscoverAppLocator,
          {} as DataViewsService,
          hasDiscoverAccess
        ).isCompatible({
          embeddable: lensApi,
        } as ActionExecutionContext<EmbeddableApiContext>)
      ).toBeTruthy();

      // make sure no Discover access makes the action incompatible
      hasDiscoverAccess = false;
      expect(
        await createOpenInDiscoverAction(
          {} as DiscoverAppLocator,
          {} as DataViewsService,
          hasDiscoverAccess
        ).isCompatible({
          embeddable: lensApi,
        } as ActionExecutionContext<EmbeddableApiContext>)
      ).toBeFalsy();
    });
    it('checks for ability to view underlying data if lens embeddable', async () => {
      // setup
      const embeddable = {
        ...compatibleEmbeddableApi,
        canViewUnderlyingData$: { getValue: jest.fn(() => false) },
      };

      // test false
      expect(
        await createOpenInDiscoverAction(
          {} as DiscoverAppLocator,
          {} as DataViewsService,
          true
        ).isCompatible({
          embeddable,
        } as ActionExecutionContext<EmbeddableApiContext>)
      ).toBeFalsy();

      expect(embeddable.canViewUnderlyingData$.getValue).toHaveBeenCalledTimes(1);

      // test true
      embeddable.canViewUnderlyingData$.getValue = jest.fn(() => true);

      expect(
        await createOpenInDiscoverAction(
          {} as DiscoverAppLocator,
          {} as DataViewsService,
          true
        ).isCompatible({
          embeddable,
        } as ActionExecutionContext<EmbeddableApiContext>)
      ).toBeTruthy();

      expect(embeddable.canViewUnderlyingData$.getValue).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates to discover when executed', async () => {
    const viewUnderlyingDataArgs = {
      dataViewSpec: { id: 'index-pattern-id' },
      timeRange: {},
      filters: [],
      query: undefined,
      esqlControls: undefined,
      columns: [],
    };

    const embeddable = {
      ...compatibleEmbeddableApi,
      getViewUnderlyingDataArgs: jest.fn(() => viewUnderlyingDataArgs),
    };

    const discoverUrl = 'https://discover-redirect-url';
    const locator = {
      getRedirectUrl: jest.fn(() => discoverUrl),
    } as unknown as DiscoverAppLocator;

    globalThis.open = jest.fn();

    await createOpenInDiscoverAction(
      locator,
      {
        get: () => ({
          isTimeBased: () => true,
          toSpec: () => ({ id: 'index-pattern-id' }),
        }),
      } as unknown as DataViewsService,
      true
    ).execute({
      embeddable,
    } as ActionExecutionContext<EmbeddableApiContext>);

    expect(embeddable.getViewUnderlyingDataArgs).toHaveBeenCalled();
    expect(locator.getRedirectUrl).toHaveBeenCalledWith(viewUnderlyingDataArgs);
    expect(globalThis.open).toHaveBeenCalledWith(discoverUrl, '_blank');
  });

  it('navigates to discover for an ES|QL chart and appends translatable filters as a WHERE clause', async () => {
    const viewUnderlyingDataArgs = {
      dataViewSpec: { id: 'index-pattern-id' },
      timeRange: {},
      filters: [
        {
          meta: { type: 'phrase', key: 'host.name', params: { query: 'web-1' } },
          query: { match_phrase: { 'host.name': 'web-1' } },
        },
      ],
      query: { esql: 'FROM logs' },
      esqlControls: undefined,
      columns: [],
    };

    const embeddable = {
      ...compatibleEmbeddableApi,
      getViewUnderlyingDataArgs: jest.fn(() => viewUnderlyingDataArgs),
      isTextBasedLanguage: jest.fn(() => true),
    };

    const discoverUrl = 'https://discover-redirect-url';
    const locator = {
      getRedirectUrl: jest.fn(() => discoverUrl),
    } as unknown as DiscoverAppLocator;

    globalThis.open = jest.fn();

    await createOpenInDiscoverAction(
      locator,
      {
        get: () => ({
          isTimeBased: () => true,
          toSpec: () => ({ id: 'index-pattern-id' }),
        }),
      } as unknown as DataViewsService,
      true
    ).execute({
      embeddable,
    } as ActionExecutionContext<EmbeddableApiContext>);

    expect(embeddable.getViewUnderlyingDataArgs).toHaveBeenCalled();
    expect(locator.getRedirectUrl).toHaveBeenCalledWith({
      ...viewUnderlyingDataArgs,
      filters: [],
      query: { esql: 'FROM logs\n| WHERE `host.name` : "web-1"' },
    });
    expect(globalThis.open).toHaveBeenCalledWith(discoverUrl, '_blank');
  });

  it('navigates to discover for an ES|QL chart and translates the dashboard KQL into a KQL(...) clause', async () => {
    const viewUnderlyingDataArgs = {
      dataViewSpec: { id: 'index-pattern-id' },
      timeRange: {},
      filters: [],
      query: { esql: 'FROM logs' },
      esqlControls: undefined,
      columns: [],
    };

    const embeddable = {
      ...compatibleEmbeddableApi,
      getViewUnderlyingDataArgs: jest.fn(() => viewUnderlyingDataArgs),
      isTextBasedLanguage: jest.fn(() => true),
      parentApi: {
        query$: { getValue: () => ({ language: 'kuery', query: 'host.name : "web-1"' }) },
        filters$: { getValue: () => [] },
        timeRange$: { getValue: () => undefined },
      },
    };

    const discoverUrl = 'https://discover-redirect-url';
    const locator = {
      getRedirectUrl: jest.fn(() => discoverUrl),
    } as unknown as DiscoverAppLocator;

    globalThis.open = jest.fn();

    await createOpenInDiscoverAction(
      locator,
      {
        get: () => ({
          isTimeBased: () => true,
          toSpec: () => ({ id: 'index-pattern-id' }),
        }),
      } as unknown as DataViewsService,
      true
    ).execute({
      embeddable,
    } as ActionExecutionContext<EmbeddableApiContext>);

    expect(locator.getRedirectUrl).toHaveBeenCalledWith({
      ...viewUnderlyingDataArgs,
      filters: [],
      query: { esql: 'FROM logs\n| WHERE KQL("""host.name : "web-1"""")' },
    });
  });

  it('navigates to discover for an ES|QL chart and drops untranslatable filters', async () => {
    const viewUnderlyingDataArgs = {
      dataViewSpec: { id: 'index-pattern-id' },
      timeRange: {},
      filters: [{ meta: { type: 'custom', key: 'host.name' }, query: { custom: {} } }],
      query: { esql: 'FROM logs' },
      esqlControls: undefined,
      columns: [],
    };

    const embeddable = {
      ...compatibleEmbeddableApi,
      getViewUnderlyingDataArgs: jest.fn(() => viewUnderlyingDataArgs),
      isTextBasedLanguage: jest.fn(() => true),
    };

    const discoverUrl = 'https://discover-redirect-url';
    const locator = {
      getRedirectUrl: jest.fn(() => discoverUrl),
    } as unknown as DiscoverAppLocator;

    globalThis.open = jest.fn();

    await createOpenInDiscoverAction(
      locator,
      {
        get: () => ({
          isTimeBased: () => true,
          toSpec: () => ({ id: 'index-pattern-id' }),
        }),
      } as unknown as DataViewsService,
      true
    ).execute({
      embeddable,
    } as ActionExecutionContext<EmbeddableApiContext>);

    expect(embeddable.getViewUnderlyingDataArgs).toHaveBeenCalled();
    expect(locator.getRedirectUrl).toHaveBeenCalledWith({
      ...viewUnderlyingDataArgs,
      filters: [],
    });
    expect(globalThis.open).toHaveBeenCalledWith(discoverUrl, '_blank');
  });
});
