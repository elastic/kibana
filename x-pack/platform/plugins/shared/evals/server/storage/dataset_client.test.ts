/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { InternalIStorageClient } from '@kbn/storage-adapter';
import type { DatasetExampleStorageProperties } from './examples_storage';
import type { DatasetStorageProperties } from './datasets_storage';
import type {
  DatasetExamplesStorageAdapter,
  DatasetsStorageAdapter,
  DatasetExampleInput,
} from './dataset_client';
import { DatasetClient } from './dataset_client';
import { DatasetAlreadyExistsError } from './dataset_already_exists_error';
import { ExampleAlreadyExistsError } from './example_already_exists_error';

type DatasetStorageDocument = DatasetStorageProperties & { _id?: string };
type DatasetExampleStorageDocument = DatasetExampleStorageProperties & { _id?: string };

const createDatasetStorageClient = () => {
  const docs = new Map<string, DatasetStorageDocument>();

  const search = jest.fn(async (params: Record<string, unknown>) => {
    const termQuery = (params.query as { term?: Record<string, string> } | undefined)?.term;
    let rows = Array.from(docs.entries()).map(([id, document]) => ({ _id: id, _source: document }));

    if (termQuery?.name) {
      rows = rows.filter((row) => row._source.name === termQuery.name);
    } else if (termQuery?._id) {
      rows = rows.filter((row) => row._id === termQuery._id);
    }

    const sortOrder = (
      params.sort as Array<{ updated_at?: { order?: 'asc' | 'desc' } }> | undefined
    )?.[0]?.updated_at?.order;
    if (sortOrder) {
      rows.sort((left, right) => {
        const leftAt = left._source.updated_at ?? '';
        const rightAt = right._source.updated_at ?? '';
        return sortOrder === 'desc' ? rightAt.localeCompare(leftAt) : leftAt.localeCompare(rightAt);
      });
    }

    const from = (params.from as number | undefined) ?? 0;
    const size = (params.size as number | undefined) ?? rows.length;
    const paged = rows.slice(from, from + size);

    return {
      hits: {
        hits: paged,
        total: { value: rows.length },
      },
    };
  });

  const index = jest.fn(async ({ id, op_type: opType, document }: Record<string, unknown>) => {
    if (opType === 'create' && docs.has(id as string)) {
      throw new errors.ResponseError({
        statusCode: 409,
        body: {},
        headers: {},
        warnings: [],
        meta: {} as any,
      });
    }

    docs.set(id as string, document as DatasetStorageDocument);
    return { result: 'created' };
  });

  const remove = jest.fn(async ({ id }: Record<string, unknown>) => {
    const deleted = docs.delete(id as string);
    return { result: deleted ? 'deleted' : 'not_found' };
  });

  const client = {
    search,
    index,
    delete: remove,
  } as unknown as InternalIStorageClient<DatasetStorageDocument>;

  return { docs, client };
};

const createExamplesStorageClient = () => {
  const docs = new Map<string, DatasetExampleStorageDocument>();

  const search = jest.fn(async (params: Record<string, unknown>) => {
    const termQuery = (params.query as { term?: Record<string, string> } | undefined)?.term;
    const termsQuery = (params.query as { terms?: { dataset_id?: string[] } } | undefined)?.terms
      ?.dataset_id;

    let rows = Array.from(docs.entries()).map(([id, document]) => ({ _id: id, _source: document }));

    if (termQuery?.dataset_id) {
      rows = rows.filter((row) => row._source.dataset_id === termQuery.dataset_id);
    } else if (termQuery?._id) {
      rows = rows.filter((row) => row._id === termQuery._id);
    } else if (termsQuery) {
      rows = rows.filter((row) => termsQuery.includes(row._source.dataset_id));
    }

    const sortOrder = (
      params.sort as Array<{ created_at?: { order?: 'asc' | 'desc' } }> | undefined
    )?.[0]?.created_at?.order;
    if (sortOrder) {
      rows.sort((left, right) => {
        const leftAt = left._source.created_at ?? '';
        const rightAt = right._source.created_at ?? '';
        return sortOrder === 'desc' ? rightAt.localeCompare(leftAt) : leftAt.localeCompare(rightAt);
      });
    }

    const size = (params.size as number | undefined) ?? rows.length;
    const hits = rows.slice(0, size);

    if ((params.aggs as { by_dataset_id?: unknown } | undefined)?.by_dataset_id) {
      const countsByDatasetId = new Map<string, number>();
      for (const row of rows) {
        countsByDatasetId.set(
          row._source.dataset_id,
          (countsByDatasetId.get(row._source.dataset_id) ?? 0) + 1
        );
      }
      return {
        hits: { hits, total: { value: rows.length } },
        aggregations: {
          by_dataset_id: {
            buckets: Array.from(countsByDatasetId.entries()).map(([key, docCount]) => ({
              key,
              doc_count: docCount,
            })),
          },
        },
      };
    }

    return {
      hits: {
        hits,
        total: { value: rows.length },
      },
    };
  });

  const index = jest.fn(async ({ id, document }: Record<string, unknown>) => {
    docs.set(id as string, document as DatasetExampleStorageDocument);
    return { result: 'created' };
  });

  const remove = jest.fn(async ({ id }: Record<string, unknown>) => {
    const deleted = docs.delete(id as string);
    return { result: deleted ? 'deleted' : 'not_found' };
  });

  const bulk = jest.fn(
    async ({
      operations,
      throwOnFail,
    }: {
      operations: Array<{
        index?: { _id: string; document: DatasetExampleStorageDocument };
        delete?: { _id: string };
      }>;
      throwOnFail?: boolean;
    }) => {
      const items: Array<{ index?: { status: number }; delete?: { status: number } }> = [];

      for (const operation of operations) {
        if (operation.index) {
          const { _id: id, document } = operation.index;
          if (docs.has(id)) {
            items.push({ index: { status: 409 } });
          } else {
            docs.set(id, document);
            items.push({ index: { status: 201 } });
          }
          continue;
        }

        if (operation.delete) {
          docs.delete(operation.delete._id);
          items.push({ delete: { status: 200 } });
        }
      }

      if (
        throwOnFail &&
        items.some((item) => (item.index?.status ?? item.delete?.status ?? 200) >= 400)
      ) {
        throw new Error('bulk operation failed');
      }

      return { items };
    }
  );

  const client = {
    search,
    index,
    delete: remove,
    bulk,
  } as unknown as InternalIStorageClient<DatasetExampleStorageDocument>;

  return { docs, client };
};

const createClient = () => {
  const datasetsStorage = createDatasetStorageClient();
  const examplesStorage = createExamplesStorageClient();

  const datasetsStorageAdapter = {
    getClient: () => datasetsStorage.client,
  } as unknown as DatasetsStorageAdapter;
  const examplesStorageAdapter = {
    getClient: () => examplesStorage.client,
  } as unknown as DatasetExamplesStorageAdapter;

  const client = new DatasetClient({
    datasetsStorageAdapter,
    examplesStorageAdapter,
  });

  return { client, datasetsStorage, examplesStorage };
};

describe('DatasetClient', () => {
  const baseExampleA: DatasetExampleInput = {
    input: { question: 'What is Kibana?' },
    output: { expected: 'An observability and security UI' },
    metadata: { source: 'docs' },
  };
  const baseExampleB: DatasetExampleInput = {
    input: { question: 'What is Elasticsearch?' },
    output: { expected: 'A search and analytics engine' },
    metadata: { source: 'docs' },
  };
  const baseExampleC: DatasetExampleInput = {
    input: { question: 'What is an index?' },
    output: { expected: 'A logical namespace for documents' },
    metadata: { source: 'guide' },
  };

  it('creates and lists datasets with example counts', async () => {
    const { client } = createClient();

    const created = await client.create('dataset-1', 'A dataset', [baseExampleA, baseExampleB]);
    const listing = await client.list({ page: 1, perPage: 10 });
    const fetched = await client.get(created.id);

    expect(created.name).toBe('dataset-1');
    expect(created.examples).toHaveLength(2);
    expect(fetched?.examples).toHaveLength(2);
    expect(listing.total).toBe(1);
    expect(listing.datasets[0]).toMatchObject({
      id: created.id,
      name: 'dataset-1',
      description: 'A dataset',
      examples_count: 2,
    });
  });

  it('updates dataset description without changing the ID', async () => {
    const { client } = createClient();

    const created = await client.create('dataset-1', 'A dataset', [baseExampleA]);
    const updated = await client.update(created.id, {
      description: 'Updated description',
    });

    expect(updated).toBeDefined();
    expect(updated?.id).toBe(created.id);
    expect(updated?.name).toBe('dataset-1');
    expect(updated?.description).toBe('Updated description');
    expect(updated?.examples).toHaveLength(1);
  });

  it('deletes dataset and all associated examples', async () => {
    const { client } = createClient();

    const created = await client.create('dataset-1', 'A dataset', [baseExampleA, baseExampleB]);
    const deleted = await client.delete(created.id);
    const fetched = await client.get(created.id);

    expect(deleted).toBe(true);
    expect(fetched).toBeUndefined();
  });

  it('throws DatasetAlreadyExistsError when creating a dataset with a duplicate name', async () => {
    const { client } = createClient();

    await client.create('dataset-1', 'A dataset');
    await expect(client.create('dataset-1', 'Duplicate')).rejects.toThrow(
      DatasetAlreadyExistsError
    );
  });

  it('upsert diffs examples and reports added removed unchanged', async () => {
    const { client } = createClient();

    await client.create('dataset-1', 'A dataset', [baseExampleA, baseExampleB]);
    const result = await client.upsert('dataset-1', 'Updated description', [
      baseExampleB,
      baseExampleC,
    ]);
    const dataset = await client.get(result.dataset_id);

    expect(result).toEqual({
      dataset_id: DatasetClient.getDatasetId('dataset-1'),
      added: 1,
      removed: 1,
      unchanged: 1,
    });
    expect(dataset?.description).toBe('Updated description');
    expect(dataset?.examples).toHaveLength(2);
    expect(dataset?.examples.map((example) => example.input)).toEqual([
      baseExampleB.input,
      baseExampleC.input,
    ]);
  });

  it('throws ExampleAlreadyExistsError when updating an example to match another existing example', async () => {
    const { client } = createClient();

    const created = await client.create('dataset-1', 'A dataset', [baseExampleA, baseExampleB]);
    const exampleToUpdate = created.examples[0];

    await expect(
      client.updateExample(exampleToUpdate.id, {
        input: baseExampleB.input,
        output: baseExampleB.output,
        metadata: baseExampleB.metadata ?? undefined,
      })
    ).rejects.toThrow(ExampleAlreadyExistsError);

    const dataset = await client.get(created.id);
    expect(dataset?.examples).toHaveLength(2);
  });

  it('throws ExampleAlreadyExistsError when adding a duplicate example', async () => {
    const { client } = createClient();

    const created = await client.create('dataset-1', 'A dataset', [baseExampleA]);

    await expect(client.addExamples(created.id, [baseExampleA])).rejects.toThrow(
      ExampleAlreadyExistsError
    );

    const dataset = await client.get(created.id);
    expect(dataset?.examples).toHaveLength(1);
  });
});
