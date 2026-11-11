/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getDataStreamsMeteringStats } from '.';

interface MeteringDataStream {
  name: string;
  num_docs: number;
  size_in_bytes: number;
}

// Answers each `/_metering/stats/<names>` call with whatever `respond` returns for that chunk.
const makeMeteringClient = (
  respond: (names: string[]) => { datastreams?: MeteringDataStream[] }
): { esClient: ElasticsearchClient; request: jest.Mock } => {
  const request = jest.fn(async ({ path }: { path: string }) =>
    respond(path.replace('/_metering/stats/', '').split(','))
  );
  const esClient = { transport: { request } } as unknown as ElasticsearchClient;
  return { esClient, request };
};

const dataStreamEntry = (name: string, seed: number): MeteringDataStream => ({
  name,
  num_docs: seed,
  size_in_bytes: seed * 10,
});

const makeDataStreamNames = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `logs-app-${String(i).padStart(6, '0')}`);

describe('getDataStreamsMeteringStats', () => {
  it('returns an empty record without calling ES when there are no data streams', async () => {
    const { esClient, request } = makeMeteringClient(() => ({ datastreams: [] }));

    await expect(getDataStreamsMeteringStats({ esClient, dataStreams: [] })).resolves.toEqual({});
    expect(request).not.toHaveBeenCalled();
  });

  it('maps every data stream from every chunk to sizeBytes and totalDocs', async () => {
    const { esClient, request } = makeMeteringClient((names) => ({
      datastreams: names.map((name) => dataStreamEntry(name, Number(name.slice(-6)) + 1)),
    }));

    const result = await getDataStreamsMeteringStats({
      esClient,
      dataStreams: makeDataStreamNames(400),
    });

    expect(request.mock.calls.length).toBeGreaterThan(1);
    expect(Object.keys(result)).toHaveLength(400);
    expect(result['logs-app-000000']).toStrictEqual({ sizeBytes: 10, totalDocs: 1 });
    expect(result['logs-app-000399']).toStrictEqual({ sizeBytes: 4000, totalDocs: 400 });
  });

  it('returns an empty record when no chunk has a datastreams field', async () => {
    const { esClient } = makeMeteringClient(() => ({}));

    await expect(
      getDataStreamsMeteringStats({ esClient, dataStreams: makeDataStreamNames(400) })
    ).resolves.toStrictEqual({});
  });

  it('aggregates 10,000 data streams in linear time', async () => {
    // A quadratic accumulator needs seconds for this input and blocks the Kibana event loop.
    const { esClient } = makeMeteringClient((names) => ({
      datastreams: names.map((name) => dataStreamEntry(name, 1)),
    }));

    const startedAt = performance.now();
    const result = await getDataStreamsMeteringStats({
      esClient,
      dataStreams: makeDataStreamNames(10000),
    });
    const elapsedMs = performance.now() - startedAt;

    expect(Object.keys(result)).toHaveLength(10000);
    expect(elapsedMs).toBeLessThan(1000);
  }, 30000);
});
