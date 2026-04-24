/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { DataViewsService } from '@kbn/data-views-plugin/public';
import { type EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { appendEsqlFilterExpressionToQuery, convertFiltersToESQLExpression } from '@kbn/esql-utils';
import { createOpenInDiscoverAction } from './open_in_discover_action';
import type { DiscoverAppLocator } from './open_in_discover_helpers';
import { getLensApiMock } from '../react_embeddable/mocks';

describe('open in discover action', () => {
  const compatibleEmbeddableApi = getLensApiMock();

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('merges translatable filters into the ES|QL string for text-based Lens and passes only untranslatable as pills', async () => {
    const translatable: Filter = {
      meta: { key: 'machine.os' },
      query: { match_phrase: { 'machine.os': 'ios' } },
    };
    const untranslatable: Filter = {
      meta: { type: 'range', key: 'scripted_field' },
      query: {
        script: {
          script: {
            source: 'test',
            lang: 'painless',
            params: { gte: 0, lt: 100 },
          },
        },
      },
    };

    const { esqlExpression: multiExpr, untranslatableFilters } = convertFiltersToESQLExpression([
      translatable,
      untranslatable,
    ]);
    const expectedEsql = appendEsqlFilterExpressionToQuery('FROM index-pattern-id', multiExpr);

    const viewUnderlyingDataArgs = {
      dataViewSpec: { id: 'index-pattern-id' },
      timeRange: {},
      filters: [translatable, untranslatable],
      query: { esql: 'FROM index-pattern-id' },
      esqlControls: undefined,
      columns: ['col_a'],
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

    expect(multiExpr).toBe('`machine.os` : "ios"');
    expect(untranslatableFilters).toHaveLength(1);
    expect(locator.getRedirectUrl).toHaveBeenCalledWith({
      ...viewUnderlyingDataArgs,
      query: { esql: expectedEsql },
      filters: untranslatableFilters,
    });
    expect(globalThis.open).toHaveBeenCalledWith(discoverUrl, '_blank');
  });
});
