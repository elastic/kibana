/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';

export interface DataStreamApiService {
  cleanUp: () => Promise<void>;
}

export const getDataStreamApiService = ({
  log,
  esClient,
  dataStreamName,
}: {
  log: ScoutLogger;
  esClient: EsClient;
  dataStreamName: string;
}): DataStreamApiService => ({
  cleanUp: () =>
    measurePerformanceAsync(log, `dataStream[${dataStreamName}].cleanUp`, async () => {
      await esClient.deleteByQuery(
        {
          index: dataStreamName,
          query: { match_all: {} },
          refresh: true,
          wait_for_completion: true,
          conflicts: 'proceed',
        },
        { ignore: [404] }
      );
    }),
});
