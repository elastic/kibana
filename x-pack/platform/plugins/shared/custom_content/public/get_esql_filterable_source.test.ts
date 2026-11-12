/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { EsqlSource } from '@kbn/data-source';
import type { FilterableSource } from '@kbn/data-source';
import { getEsqlFilterableSource } from './get_esql_filterable_source';

describe('getEsqlFilterableSource', () => {
  const http = {} as HttpStart;
  const filterableSource = { id: 'dataset-id' } as FilterableSource;
  const toFilterableSource = jest.fn();
  let resolveDataset: jest.SpyInstance;
  let create: jest.SpyInstance;

  beforeEach(() => {
    toFilterableSource.mockReset().mockResolvedValue(filterableSource);
    resolveDataset = jest.spyOn(EsqlSource, 'resolveDataset').mockResolvedValue({
      datasetId: 'dataset-id',
      title: 'sales',
      timeFieldName: 'sale_date',
      projectRouting: undefined,
    });
    create = jest
      .spyOn(EsqlSource, 'create')
      .mockResolvedValue({ toFilterableSource } as unknown as EsqlSource);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads the time field from the whole query, which can name it with ?_tstart', async () => {
    const query = 'FROM sales | WHERE sale_date >= ?_tstart | STATS total = COUNT(*)';

    await getEsqlFilterableSource({ query, http, projectRouting: undefined });

    expect(resolveDataset).toHaveBeenCalledWith({ query, http, projectRouting: undefined });
  });

  it('builds the source from the source command alone, with the time field it found', async () => {
    await getEsqlFilterableSource({
      query: 'FROM sales | WHERE sale_date >= ?_tstart | STATS total = COUNT(*)',
      http,
      projectRouting: undefined,
    });

    expect(create).toHaveBeenCalledWith({
      query: 'FROM sales',
      http,
      projectRouting: undefined,
      timeFieldName: 'sale_date',
      resolveTimeField: false,
    });
  });

  it('uses the project routing of the query over the one of the picker', async () => {
    await getEsqlFilterableSource({
      query: 'SET project_routing = "_alias:_origin"; FROM sales | LIMIT 1',
      http,
      projectRouting: '_alias:*',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ projectRouting: '_alias:_origin' })
    );
  });

  it('returns the plain source of the dataset, not a data view', async () => {
    await expect(
      getEsqlFilterableSource({ query: 'FROM sales | LIMIT 1', http, projectRouting: undefined })
    ).resolves.toBe(filterableSource);

    expect(toFilterableSource).toHaveBeenCalledWith(http);
  });
});
