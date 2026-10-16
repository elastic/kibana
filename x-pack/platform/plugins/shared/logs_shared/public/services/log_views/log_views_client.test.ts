/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { HttpStart } from '@kbn/core/public';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
import type { ResolvedLogView } from '../../../common/log_views';
import { defaultLogViewsStaticConfig } from '../../../common/log_views';
import { LogViewsClient } from './log_views_client';

const PROJECT_ROUTING = '_alias:*';

const resolvedLogView = {
  indices: 'log-indices-*',
} as ResolvedLogView<DataView>;

const createClient = () => {
  const search = jest.fn().mockReturnValue(
    of({
      rawResponse: { _shards: { total: 1 }, hits: { total: 1 } },
    })
  ) as unknown as jest.MockedFunction<ISearchGeneric>;

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
  });
});
