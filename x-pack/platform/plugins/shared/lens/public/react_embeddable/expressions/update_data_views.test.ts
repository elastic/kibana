/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpStart } from '@kbn/core/public';
import { EsqlSource, registerEsqlSourceInDataViewsCache } from '@kbn/data-source';
import { createMockDataViewsService } from '@kbn/data-source/src/__mocks__/data_views_service.mock';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/public';
import { getUsedDataViews } from './update_data_views';

jest.mock('@kbn/data-source', () => ({
  ...jest.requireActual('@kbn/data-source'),
  registerEsqlSourceInDataViewsCache: jest.fn(),
}));

const mockRegisterEsqlSourceInDataViewsCache =
  registerEsqlSourceInDataViewsCache as jest.MockedFunction<
    typeof registerEsqlSourceInDataViewsCache
  >;

const query = { esql: 'FROM logs-* | STATS count = COUNT(*) BY host.name | LIMIT 10' };

describe('getUsedDataViews', () => {
  const dataViews = dataViewPluginMocks.createStartContract();
  const http = { post: jest.fn().mockResolvedValue({ columns: [] }) } as unknown as HttpStart;
  const spec: DataViewSpec = {
    id: 'esql-dataset-id',
    title: 'logs-*',
    timeFieldName: '@timestamp',
  };
  const layers = {
    layer1: { index: 'esql-dataset-id', query, columns: [], timeField: '@timestamp' },
  };
  const shimDataView = { id: 'esql-dataset-id' } as DataView;
  let createSpy: jest.SpyInstance;

  beforeEach(() => {
    EsqlSource.clearCache();
    dataViews.create.mockReset();
    dataViews.get.mockReset();
    mockRegisterEsqlSourceInDataViewsCache.mockReset().mockResolvedValue(shimDataView);
    createSpy = jest.spyOn(EsqlSource, 'create');
  });

  afterEach(() => {
    createSpy.mockRestore();
  });

  it('uses the DataView registered for the dataset of an ES|QL layer, not one created from the spec', async () => {
    const result = await getUsedDataViews([], { [spec.id!]: spec }, dataViews, { layers, http });

    expect(result).toEqual([shimDataView]);
    expect(dataViews.create).not.toHaveBeenCalled();
  });

  it('registers the DataView from the schema the source was just created with', async () => {
    await getUsedDataViews([], { [spec.id!]: spec }, dataViews, { layers, http });

    // no `http`: the lookup already ran for this source, registering must not request it again
    expect(mockRegisterEsqlSourceInDataViewsCache).toHaveBeenCalledWith(
      dataViews,
      expect.any(EsqlSource)
    );
  });

  describe('schema lookups of the real registration', () => {
    const publish = async (esql: string, response: unknown) => {
      const post = jest.fn().mockResolvedValue(response);
      const { datasetId } = await EsqlSource.resolveDataset({
        query: esql,
        timeFieldName: '@timestamp',
      });
      mockRegisterEsqlSourceInDataViewsCache.mockImplementation(
        jest.requireActual('@kbn/data-source').registerEsqlSourceInDataViewsCache
      );
      const result = await getUsedDataViews(
        [],
        { [datasetId]: { id: datasetId, title: 'x', timeFieldName: '@timestamp' } },
        createMockDataViewsService(),
        {
          layers: {
            layer1: { index: datasetId, query: { esql }, columns: [], timeField: '@timestamp' },
          },
          http: { post } as unknown as HttpStart,
        }
      );
      return { requests: post.mock.calls.length, dataView: result[0] };
    };

    it('requests the schema of a dataset once and publishes its fields', async () => {
      const { requests, dataView } = await publish('FROM lookup-ok-*', {
        columns: [{ name: 'message', esType: 'keyword' }],
      });

      expect(requests).toBe(1);
      expect(dataView.fields.getByName('message')).toBeDefined();
    });

    it('gets the fields of the dataset once a failed lookup succeeds on a later reload', async () => {
      const esql = 'FROM lookup-recover-*';
      const post = jest
        .fn()
        .mockResolvedValueOnce({ columns: [], error: { statusCode: 503, message: 'transient' } })
        .mockResolvedValue({ columns: [{ name: 'message', esType: 'keyword' }] });
      const { datasetId } = await EsqlSource.resolveDataset({
        query: esql,
        timeFieldName: '@timestamp',
      });
      mockRegisterEsqlSourceInDataViewsCache.mockImplementation(
        jest.requireActual('@kbn/data-source').registerEsqlSourceInDataViewsCache
      );
      const dataViewsService = createMockDataViewsService();
      const reload = async () =>
        (
          await getUsedDataViews(
            [],
            { [datasetId]: { id: datasetId, title: 'x', timeFieldName: '@timestamp' } },
            dataViewsService,
            {
              layers: {
                layer1: { index: datasetId, query: { esql }, columns: [], timeField: '@timestamp' },
              },
              http: { post } as unknown as HttpStart,
            }
          )
        )[0];

      expect((await reload()).fields.getByName('message')).toBeUndefined();
      expect((await reload()).fields.getByName('message')).toBeDefined();
    });

    it('does not repeat a failing schema lookup while registering the DataView', async () => {
      const { requests } = await publish('FROM lookup-failing-*', {
        columns: [],
        error: { statusCode: 404, message: 'no such index' },
      });

      expect(requests).toBe(1);
    });
  });

  it('resolves the dataset from the source command of the query, with the layer time field', async () => {
    await getUsedDataViews([], { [spec.id!]: spec }, dataViews, { layers, http });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'FROM logs-*',
        timeFieldName: '@timestamp',
        resolveTimeField: false,
      })
    );
  });

  it('prefers the project routing of the query over the picker one', async () => {
    const routedLayers = {
      layer1: {
        ...layers.layer1,
        query: { esql: 'SET project_routing = "_alias:project-a"; FROM logs-*' },
      },
    };

    await getUsedDataViews([], { [spec.id!]: spec }, dataViews, {
      layers: routedLayers,
      http,
      projectRouting: 'project-b',
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ projectRouting: '_alias:project-a' })
    );
  });

  it('falls back to the spec when the dataset resolves to another id than the layer one', async () => {
    const specDataView = { id: 'esql-dataset-id', fromSpec: true } as unknown as DataView;
    mockRegisterEsqlSourceInDataViewsCache.mockResolvedValue({ id: 'another-id' } as DataView);
    dataViews.create.mockResolvedValue(specDataView);

    const result = await getUsedDataViews([], { [spec.id!]: spec }, dataViews, { layers, http });

    expect(result).toEqual([specDataView]);
    expect(dataViews.create).toHaveBeenCalledWith(spec);
  });

  it('creates the DataView from the spec when there is no ES|QL layer for it', async () => {
    const formBasedSpec: DataViewSpec = { id: 'ad-hoc-form-based', title: 'metrics-*' };
    const created = { id: 'ad-hoc-form-based' } as DataView;
    dataViews.create.mockResolvedValue(created);

    const result = await getUsedDataViews([], { [formBasedSpec.id!]: formBasedSpec }, dataViews, {
      layers,
      http,
    });

    expect(result).toEqual([created]);
    expect(mockRegisterEsqlSourceInDataViewsCache).not.toHaveBeenCalled();
  });

  it('creates the DataView from the spec when no ES|QL context is given', async () => {
    const created = { id: spec.id } as DataView;
    dataViews.create.mockResolvedValue(created);

    const result = await getUsedDataViews([], { [spec.id!]: spec }, dataViews);

    expect(result).toEqual([created]);
    expect(mockRegisterEsqlSourceInDataViewsCache).not.toHaveBeenCalled();
  });
});
