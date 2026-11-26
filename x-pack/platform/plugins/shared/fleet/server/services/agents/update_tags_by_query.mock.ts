/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UpdateByQueryRequest,
  UpdateByQueryResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';

/** What a run of the update that was cancelled, and one that timed out, end with. */
export const CANCELLED = { canceled: 'by user request', updated: 3, total: 5 };
export const TIMED_OUT = { timed_out: true, updated: 0, total: 0 };

/** The ids of a request, which also has the filter of the space when the spaces are enabled. */
export const idsOfRequest = (request: UpdateByQueryRequest) => {
  const query = request.query as {
    terms?: { _id: string[] };
    bool?: { filter: Array<{ terms: { _id: string[] } }> };
  };
  return (query.terms ?? query.bool!.filter[0].terms)._id;
};

/** The ids of the run of the update that is the `run`th. */
export const idsOfRun = (esClient: ElasticsearchClientMock, run: number) =>
  idsOfRequest(esClient.updateByQuery.mock.calls[run][0] as UpdateByQueryRequest);

/**
 * Scripts the runs of the update of a batch as tasks: the first run is the whole batch, and the
 * ones after it are its chunks. Each ends with every agent of its ids updated, unless `outcomes`
 * has another for it.
 */
export const scriptUpdateRuns = (
  esClient: ElasticsearchClientMock,
  outcomes: Record<number, Partial<UpdateByQueryResponse>> = {}
) => {
  const sizes: number[] = [];
  esClient.updateByQuery.mockReset();
  esClient.updateByQuery.mockImplementation((async (request: UpdateByQueryRequest) => {
    sizes.push(idsOfRequest(request).length);
    return { task: `node1:${sizes.length - 1}` };
  }) as never);
  esClient.tasks.get.mockImplementation((async ({ task_id: taskId }: { task_id: string }) => {
    const run = Number(taskId.split(':')[1]);
    return {
      completed: true,
      task: {},
      response: {
        failures: [],
        version_conflicts: 0,
        total: sizes[run],
        updated: sizes[run],
        ...outcomes[run],
      },
    };
  }) as never);
};
