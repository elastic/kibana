/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';
import type { HttpStart } from '@kbn/core/public';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
import type { ResolvedLogView } from '../../../common/log_views';
import { defaultLogViewsStaticConfig, FetchLogViewStatusError } from '../../../common/log_views';
import { LogViewsClient } from './log_views_client';

const PROJECT_ROUTING = '_alias:*';

const resolvedLogView = {
  indices: 'log-indices-*',
} as ResolvedLogView<DataView>;

const createSearchResponse = (
  shardsTotal: number,
  hitsTotal: number | { value: number; relation: 'eq' }
) => of({ rawResponse: { _shards: { total: shardsTotal }, hits: { total: hitsTotal } } });

const createClient = (searchResult: Observable<unknown> = createSearchResponse(1, 1)) => {
  const search = jest
    .fn()
    .mockReturnValue(searchResult) as unknown as jest.MockedFunction<ISearchGeneric>;

  const client = new LogViewsClient(
    {} as DataViewsContract,
    {} as LogSourcesService,
    {} as HttpStart,
    search,
    defaultLogViewsStaticConfig
  );

  return { client, search };
};

describe('LogViewsClient', () => {
  describe('getResolvedLogViewStatus', () => {
    it('scopes the status search to the given project routing', async () => {
      const { client, search } = createClient();

      await client.getResolvedLogViewStatus(resolvedLogView, {
        projectRouting: PROJECT_ROUTING,
      });

      expect(search).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ projectRouting: PROJECT_ROUTING })
      );
    });

    it('leaves the project routing to the search interceptor when none is given', async () => {
      const { client, search } = createClient();

      await client.getResolvedLogViewStatus(resolvedLogView);

      expect(search).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ projectRouting: undefined })
      );
    });

    it('reports the index as missing when no shards match the log view indices', async () => {
      const { client } = createClient(createSearchResponse(0, 0));

      await expect(client.getResolvedLogViewStatus(resolvedLogView)).resolves.toEqual({
        index: 'missing',
      });
    });

    it('reports the index as missing when the search fails with a 404', async () => {
      const { client } = createClient(throwError(() => ({ status: 404 })));

      await expect(client.getResolvedLogViewStatus(resolvedLogView)).resolves.toEqual({
        index: 'missing',
      });
    });

    it('reports the index as empty when it exists but has no documents', async () => {
      const { client } = createClient(createSearchResponse(1, 0));

      await expect(client.getResolvedLogViewStatus(resolvedLogView)).resolves.toEqual({
        index: 'empty',
      });
    });

    it('reports the index as available when it has documents', async () => {
      const { client } = createClient(createSearchResponse(1, 1));

      await expect(client.getResolvedLogViewStatus(resolvedLogView)).resolves.toEqual({
        index: 'available',
      });
    });

    it('reports the index as available when the hit count comes as a total object', async () => {
      const { client } = createClient(createSearchResponse(1, { value: 3, relation: 'eq' }));

      await expect(client.getResolvedLogViewStatus(resolvedLogView)).resolves.toEqual({
        index: 'available',
      });
    });

    it('throws a FetchLogViewStatusError when the search fails for any other reason', async () => {
      const { client } = createClient(throwError(() => ({ status: 500 })));

      await expect(client.getResolvedLogViewStatus(resolvedLogView)).rejects.toBeInstanceOf(
        FetchLogViewStatusError
      );
    });
  });
});
