/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadESQLAttributes } from './esql';
import { makeEmbeddableServices } from './mocks';
import type { LensEmbeddableStartServices } from './types';
import type { StructuredDatasourceStates } from '@kbn/lens-common';
import { coreMock } from '@kbn/core/public/mocks';
import { BehaviorSubject } from 'rxjs';
import * as suggestionModule from '../lens_suggestions_api';
// Need to do this magic in order to spy on specific functions
import * as esqlUtils from '@kbn/esql-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createEsqlAdHocDataView } from '../data_views_service/create_esql_ad_hoc_data_view';
jest.mock('@kbn/esql-utils', () => ({
  __esModule: true,
  ...jest.requireActual('@kbn/esql-utils'),
}));
jest.mock('../data_views_service/create_esql_ad_hoc_data_view');

const mockCreateEsqlAdHocDataView = createEsqlAdHocDataView as jest.MockedFunction<
  typeof createEsqlAdHocDataView
>;

function getTextBasedLayer(attributes: Awaited<ReturnType<typeof loadESQLAttributes>>) {
  const layers = (attributes?.state.datasourceStates as StructuredDatasourceStates).textBased
    ?.layers;
  return Object.values(layers ?? {})[0];
}

function getUiSettingsOverrides() {
  const core = coreMock.createStart({ basePath: '/testbasepath' });
  return core.uiSettings;
}

describe('ES|QL attributes creation', () => {
  function getServices(servicesOverrides?: Partial<LensEmbeddableStartServices>) {
    return {
      ...makeEmbeddableServices(new BehaviorSubject<string>(''), undefined, {
        visOverrides: { id: 'lnsXY' },
        dataOverrides: { id: 'formBased' },
      }),
      uiSettings: { ...getUiSettingsOverrides(), get: jest.fn().mockReturnValue(true) },
      ...servicesOverrides,
    };
  }
  it('keeps a ROW-backed document when no index is available and no suggestions are generated', async () => {
    jest.spyOn(esqlUtils, 'getIndexForESQLQuery').mockResolvedValueOnce(null);
    mockCreateEsqlAdHocDataView.mockResolvedValueOnce(dataViewMock);
    jest.spyOn(esqlUtils, 'getESQLQueryColumns').mockResolvedValueOnce([]);
    jest.spyOn(suggestionModule, 'suggestionsApi').mockReturnValue([]);

    const attributes = await loadESQLAttributes(getServices());
    expect(attributes?.visualizationType).toBe('lnsDatatable');
    const layer = getTextBasedLayer(attributes);
    expect(layer?.query?.esql).toBe('ROW x = 1');
    expect(layer?.errors).toBeUndefined();
  });

  it('keeps an editable ES|QL document when no suggestion is generated', async () => {
    jest.spyOn(esqlUtils, 'getIndexForESQLQuery').mockResolvedValueOnce('index');
    jest.spyOn(esqlUtils, 'getInitialESQLQuery').mockReturnValueOnce('FROM index');
    mockCreateEsqlAdHocDataView.mockResolvedValueOnce(dataViewMock);
    jest.spyOn(esqlUtils, 'getESQLQueryColumns').mockResolvedValueOnce([]);
    jest.spyOn(suggestionModule, 'suggestionsApi').mockReturnValue([]);

    const attributes = await loadESQLAttributes(getServices());
    expect(attributes?.visualizationType).toBe('lnsDatatable');
    const layer = getTextBasedLayer(attributes);
    expect(layer?.query?.esql).toBe('FROM index');
    expect(layer?.errors).toBeUndefined();
  });

  it('keeps an editable ES|QL document when the starting query fails', async () => {
    jest.spyOn(esqlUtils, 'getIndexForESQLQuery').mockResolvedValueOnce('logs*');
    jest.spyOn(esqlUtils, 'getInitialESQLQuery').mockReturnValueOnce('FROM logs*');
    mockCreateEsqlAdHocDataView.mockResolvedValueOnce(dataViewMock);
    jest
      .spyOn(esqlUtils, 'getESQLQueryColumns')
      .mockRejectedValueOnce(new Error('Unable to load columns. index closed'));

    const attributes = await loadESQLAttributes(getServices());

    expect(attributes?.visualizationType).toBe('lnsDatatable');
    const layer = getTextBasedLayer(attributes);
    expect(layer?.query?.esql).toBe('FROM logs*');
    expect(layer?.errors?.map((error) => error.message)).toEqual([
      'Unable to load columns. index closed',
    ]);
  });

  it('should fall back to ROW x=1 attributes when the main path times out', async () => {
    jest.useFakeTimers();

    // Main path hangs indefinitely
    jest.spyOn(esqlUtils, 'getIndexForESQLQuery').mockReturnValue(new Promise(() => {}));

    // Fallback path (ROW x=1) succeeds
    mockCreateEsqlAdHocDataView.mockResolvedValue(dataViewMock);
    jest.spyOn(esqlUtils, 'getESQLQueryColumns').mockResolvedValue([]);
    jest.spyOn(suggestionModule, 'suggestionsApi').mockReturnValue([
      {
        title: 'Fallback',
        visualizationId: 'lnsXY',
        datasourceId: 'formBased',
        datasourceState: {},
        visualizationState: {},
        columns: 1,
        score: 1,
        previewIcon: 'icon',
        changeType: 'initial',
        keptLayerIds: [],
      },
    ]);

    const attributesPromise = loadESQLAttributes(getServices());
    jest.advanceTimersByTime(5001);
    const attributes = await attributesPromise;

    expect(attributes).not.toBeUndefined();
    jest.useRealTimers();
  });

  it('should update the attributes if there is a valid suggestion', async () => {
    jest.spyOn(esqlUtils, 'getIndexForESQLQuery').mockResolvedValueOnce('index');
    mockCreateEsqlAdHocDataView.mockResolvedValueOnce(dataViewMock);
    jest.spyOn(esqlUtils, 'getESQLQueryColumns').mockResolvedValueOnce([]);
    jest.spyOn(suggestionModule, 'suggestionsApi').mockReturnValue([
      {
        title: 'MyTitle',
        visualizationId: 'lnsXY',
        datasourceId: 'formBased',
        datasourceState: {},
        visualizationState: {},
        columns: 1,
        score: 1,
        previewIcon: 'icon',
        changeType: 'initial',
        keptLayerIds: [],
      },
    ]);

    const attributes = await loadESQLAttributes(getServices());
    expect(attributes).not.toBeUndefined();
  });

  it('prefers a main result that lands while the fallback is still loading', async () => {
    jest.useFakeTimers();
    let resolveIndex: (indexName: string) => void = () => {};
    const indexSpy = jest.spyOn(esqlUtils, 'getIndexForESQLQuery').mockReturnValue(
      new Promise((resolve) => {
        resolveIndex = resolve;
      })
    );
    mockCreateEsqlAdHocDataView.mockImplementation(({ query }) => {
      if (query === 'ROW x = 1') {
        return new Promise(() => {});
      }
      return Promise.resolve(dataViewMock);
    });
    jest.spyOn(esqlUtils, 'getESQLQueryColumns').mockResolvedValue([]);
    jest.spyOn(suggestionModule, 'suggestionsApi').mockReturnValue([
      {
        title: 'Main',
        visualizationId: 'lnsXY',
        datasourceId: 'formBased',
        datasourceState: {},
        visualizationState: {},
        columns: 1,
        score: 1,
        previewIcon: 'icon',
        changeType: 'initial',
        keptLayerIds: [],
      },
    ]);

    try {
      const attributesPromise = loadESQLAttributes(getServices());
      await jest.advanceTimersByTimeAsync(5001);
      resolveIndex('index');
      const attributes = await attributesPromise;

      expect(attributes).not.toBeUndefined();
      expect(mockCreateEsqlAdHocDataView).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.stringContaining('FROM index') })
      );
    } finally {
      indexSpy.mockRestore();
      mockCreateEsqlAdHocDataView.mockReset();
      jest.useRealTimers();
    }
  });
});
