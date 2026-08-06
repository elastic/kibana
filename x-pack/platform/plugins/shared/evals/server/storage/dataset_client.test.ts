/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
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
import { ExampleNotFoundError } from './example_not_found_error';

type DatasetStorageDocument = DatasetStorageProperties & { _id?: string };
type DatasetExampleStorageDocument = DatasetExampleStorageProperties & { _id?: string };

/**
 * Mirrors how the real StorageIndexAdapter handles `_source` projections:
 * `_source: false` is rejected at runtime (the adapter's `maybeMigrateSource`
 * throws on a non-object source), and `_source: ['field', ...]` returns a
 * partial document. Keeping the mock faithful means a regression to
 * `_source: false` blows up unit tests, not just the adapter-contract suite.
 */
const projectSource = <TDoc extends object>(source: TDoc, sourceParam: unknown): Partial<TDoc> => {
  if (sourceParam === false) {
    throw new Error(`Source must be an object, got undefined`);
  }
  if (Array.isArray(sourceParam)) {
    const projected: Record<string, unknown> = {};
    for (const field of sourceParam) {
      if (typeof field === 'string' && field in source) {
        projected[field] = (source as Record<string, unknown>)[field];
      }
    }
    return projected as Partial<TDoc>;
  }
  return source;
};

interface MockRow {
  _id: string;
  _source: DatasetStorageDocument;
}

type MockQuery = Record<string, any>;

/**
 * Applies the subset of query clauses `DatasetClient` builds. Kept as one
 * recursive matcher so the `bool.must` + `bool.filter` shape used by a filtered
 * list is evaluated the same way as a bare search query nested inside it.
 */
const matchesQuery = (row: MockRow, query: MockQuery | undefined): boolean => {
  if (!query || query.match_all) {
    return true;
  }

  if (query.term) {
    const [[field, value]] = Object.entries(query.term) as Array<[string, string]>;
    if (field === '_id') {
      return row._id === value;
    }
    if (field === 'tags') {
      return (row._source.tags ?? []).includes(value);
    }
    return (row._source as unknown as Record<string, unknown>)[field] === value;
  }

  if (query.terms) {
    const [[field, values]] = Object.entries(query.terms) as Array<[string, string[]]>;
    const actual = (row._source as unknown as Record<string, unknown>)[field];
    return typeof actual === 'string' && values.includes(actual);
  }

  if (query.exists) {
    return (
      (row._source as unknown as Record<string, unknown>)[query.exists.field as string] !==
      undefined
    );
  }

  if (query.wildcard?.name) {
    // Only the `*needle*` form the client builds is supported.
    const needle = String(query.wildcard.name.value).replace(/^\*/, '').replace(/\*$/, '');
    return row._source.name.toLowerCase().includes(needle.toLowerCase());
  }

  if (query.match?.description) {
    return row._source.description
      .toLowerCase()
      .includes(String(query.match.description).toLowerCase());
  }

  if (query.bool) {
    const { must = [], filter = [], should = [], must_not: mustNot = [] } = query.bool;
    const clauses = [...must, ...filter];

    return (
      clauses.every((clause: MockQuery) => matchesQuery(row, clause)) &&
      mustNot.every((clause: MockQuery) => !matchesQuery(row, clause)) &&
      (should.length === 0 || should.some((clause: MockQuery) => matchesQuery(row, clause)))
    );
  }

  throw new Error(`Unsupported mock query clause: ${JSON.stringify(query)}`);
};

const termsBuckets = (rows: MockRow[], field: 'tags' | 'maturity') => {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const value = row._source[field];
    for (const key of Array.isArray(value) ? value : value ? [value] : []) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort(([leftKey, leftCount], [rightKey, rightCount]) =>
      leftCount === rightCount ? leftKey.localeCompare(rightKey) : rightCount - leftCount
    )
    .map(([key, count]) => ({ key, doc_count: count }));
};

/**
 * Mirrors the `global` → `filter` → `terms` aggregation the dataset list uses to
 * keep facet counts independent of the tag and maturity filters: `global`
 * escapes the request query (hence `allRows`) and the `filter` sub-aggregation
 * re-applies only the search clause.
 */
const buildAggregations = (aggs: MockQuery | undefined, allRows: MockRow[]) => {
  if (!aggs?.facets) {
    return {};
  }

  const scopedFilter = aggs.facets.aggs?.scoped?.filter as MockQuery | undefined;
  const scopedRows = allRows.filter((row) => matchesQuery(row, scopedFilter));

  return {
    aggregations: {
      facets: {
        doc_count: allRows.length,
        scoped: {
          doc_count: scopedRows.length,
          tags: { buckets: termsBuckets(scopedRows, 'tags') },
          maturity: { buckets: termsBuckets(scopedRows, 'maturity') },
        },
      },
    },
  };
};

const createDatasetStorageClient = ({ onReadForWrite }: { onReadForWrite?: () => void } = {}) => {
  const docs = new Map<string, DatasetStorageDocument>();
  const seqNos = new Map<string, number>();
  const PRIMARY_TERM = 1;

  const nextSeqNo = (id: string) => {
    const seqNo = (seqNos.get(id) ?? -1) + 1;
    seqNos.set(id, seqNo);
    return seqNo;
  };

  const search = jest.fn(async (params: Record<string, unknown>) => {
    const query = params.query as MockQuery | undefined;
    const allRows: MockRow[] = Array.from(docs.entries()).map(([id, document]) => ({
      _id: id,
      _source: document,
    }));
    const rows = allRows.filter((row) => matchesQuery(row, query));

    const sortClause = (
      params.sort as Array<Record<string, { order?: 'asc' | 'desc' }>> | undefined
    )?.[0];
    if (sortClause) {
      const [field, { order = 'asc' }] = Object.entries(sortClause)[0];
      rows.sort((left, right) => {
        const leftVal = (left._source as unknown as Record<string, unknown>)[field];
        const rightVal = (right._source as unknown as Record<string, unknown>)[field];

        const leftMissing = leftVal === undefined || leftVal === null;
        const rightMissing = rightVal === undefined || rightVal === null;
        if (leftMissing || rightMissing) {
          if (leftMissing && rightMissing) {
            return 0;
          }
          return leftMissing ? 1 : -1;
        }

        const comparison =
          typeof leftVal === 'number' && typeof rightVal === 'number'
            ? leftVal - rightVal
            : String(leftVal).localeCompare(String(rightVal));
        return order === 'desc' ? -comparison : comparison;
      });
    }

    const from = (params.from as number | undefined) ?? 0;
    const size = (params.size as number | undefined) ?? rows.length;
    const withVersion = params.seq_no_primary_term === true;
    const paged = rows.slice(from, from + size).map((row) => ({
      _id: row._id,
      _source: projectSource(row._source, params._source),
      ...(withVersion ? { _seq_no: seqNos.get(row._id) ?? 0, _primary_term: PRIMARY_TERM } : {}),
    }));

    if (withVersion) {
      onReadForWrite?.();
    }

    return {
      hits: {
        hits: paged,
        total: { value: rows.length },
      },
      ...buildAggregations(params.aggs as MockQuery | undefined, allRows),
    };
  });

  const conflict = () =>
    new errors.ResponseError({
      statusCode: 409,
      body: {},
      headers: {},
      warnings: [],
      meta: {} as any,
    });

  const index = jest.fn(
    async ({
      id,
      op_type: opType,
      document,
      if_seq_no: ifSeqNo,
      if_primary_term: ifPrimaryTerm,
    }: Record<string, unknown>) => {
      const docId = id as string;

      if (opType === 'create' && docs.has(docId)) {
        throw conflict();
      }

      if (ifSeqNo !== undefined || ifPrimaryTerm !== undefined) {
        const currentSeqNo = seqNos.get(docId);
        if (!docs.has(docId) || ifSeqNo !== currentSeqNo || ifPrimaryTerm !== PRIMARY_TERM) {
          throw conflict();
        }
      }

      docs.set(docId, document as DatasetStorageDocument);
      return { result: 'created', _seq_no: nextSeqNo(docId), _primary_term: PRIMARY_TERM };
    }
  );

  const remove = jest.fn(async ({ id }: Record<string, unknown>) => {
    const deleted = docs.delete(id as string);
    seqNos.delete(id as string);
    return { result: deleted ? 'deleted' : 'not_found' };
  });

  const bulk = jest.fn(
    async ({
      operations,
    }: {
      operations: Array<{
        index?: { _id: string; document: DatasetStorageDocument };
        delete?: { _id: string };
      }>;
    }) => {
      const items: Array<{ index?: { status: number }; delete?: { status: number } }> = [];

      for (const operation of operations) {
        if (operation.index) {
          // ES `index` action overwrites (no 409), matching the storage adapter.
          docs.set(operation.index._id, operation.index.document);
          nextSeqNo(operation.index._id);
          items.push({ index: { status: 200 } });
          continue;
        }

        if (operation.delete) {
          docs.delete(operation.delete._id);
          seqNos.delete(operation.delete._id);
          items.push({ delete: { status: 200 } });
        }
      }

      return { items };
    }
  );

  const client = {
    search,
    index,
    delete: remove,
    bulk,
  } as unknown as InternalIStorageClient<DatasetStorageDocument>;

  return { docs, seqNos, client };
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
    const hits = rows.slice(0, size).map((row) => ({
      _id: row._id,
      _source: projectSource(row._source, params._source),
    }));

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

const createClient = ({ onReadForWrite }: { onReadForWrite?: () => void } = {}) => {
  const datasetsStorage = createDatasetStorageClient({ onReadForWrite });
  const examplesStorage = createExamplesStorageClient();

  const datasetsStorageAdapter = {
    getClient: () => datasetsStorage.client,
  } as unknown as DatasetsStorageAdapter;
  const examplesStorageAdapter = {
    getClient: () => examplesStorage.client,
  } as unknown as DatasetExamplesStorageAdapter;

  const logger = { warn: jest.fn(), debug: jest.fn() } as unknown as Logger;

  const client = new DatasetClient({
    datasetsStorageAdapter,
    examplesStorageAdapter,
    logger,
  });

  return { client, datasetsStorage, examplesStorage, logger };
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

    const created = await client.create({
      name: 'dataset-1',
      description: 'A dataset',
      examples: [baseExampleA, baseExampleB],
    });
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

    const created = await client.create({
      name: 'dataset-1',
      description: 'A dataset',
      examples: [baseExampleA],
    });
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

    const created = await client.create({
      name: 'dataset-1',
      description: 'A dataset',
      examples: [baseExampleA, baseExampleB],
    });
    const deleted = await client.delete(created.id);
    const fetched = await client.get(created.id);

    expect(deleted).toBe(true);
    expect(fetched).toBeUndefined();
  });

  it('returns true for datasetExists when the dataset exists', async () => {
    const { client, datasetsStorage } = createClient();

    const created = await client.create({
      name: 'dataset-1',
      description: 'A dataset',
      examples: [baseExampleA],
    });

    await expect(client.datasetExists(created.id)).resolves.toBe(true);
    expect(datasetsStorage.client.search).toHaveBeenLastCalledWith(
      expect.objectContaining({ _source: ['name'] })
    );
  });

  it('returns false for datasetExists when the dataset does not exist', async () => {
    const { client } = createClient();

    await expect(client.datasetExists('non-existent-id')).resolves.toBe(false);
  });

  it('deletes a single example and preserves remaining examples', async () => {
    const { client, examplesStorage } = createClient();

    const created = await client.create({
      name: 'dataset-1',
      description: 'A dataset',
      examples: [baseExampleA, baseExampleB],
    });
    const exampleToDelete = created.examples[0];

    await client.deleteExample(exampleToDelete.id, created.id);
    const fetched = await client.get(created.id);

    expect(fetched?.examples).toHaveLength(1);
    expect(fetched?.examples[0].input).toEqual(baseExampleB.input);
    expect(examplesStorage.client.search).toHaveBeenCalledWith(
      expect.objectContaining({ _source: ['dataset_id'] })
    );
  });

  it('throws ExampleNotFoundError when deleting a non-existent example', async () => {
    const { client } = createClient();

    const created = await client.create({
      name: 'dataset-1',
      description: 'A dataset',
      examples: [baseExampleA],
    });

    await expect(client.deleteExample('non-existent-example-id', created.id)).rejects.toThrow(
      ExampleNotFoundError
    );
  });

  it('deletes an example when expectedDatasetId matches', async () => {
    const { client } = createClient();

    const created = await client.create({
      name: 'dataset-1',
      description: 'A dataset',
      examples: [baseExampleA],
    });
    const exampleToDelete = created.examples[0];

    await client.deleteExample(exampleToDelete.id, created.id);
    const fetched = await client.get(created.id);

    expect(fetched?.examples).toHaveLength(0);
  });

  it('throws ExampleNotFoundError when expectedDatasetId does not match', async () => {
    const { client } = createClient();

    const created = await client.create({
      name: 'dataset-1',
      description: 'A dataset',
      examples: [baseExampleA],
    });
    const exampleToDelete = created.examples[0];

    await expect(client.deleteExample(exampleToDelete.id, 'wrong-dataset-id')).rejects.toThrow(
      ExampleNotFoundError
    );

    const fetched = await client.get(created.id);
    expect(fetched?.examples).toHaveLength(1);
  });

  it('updates an example when expectedDatasetId matches', async () => {
    const { client } = createClient();

    const created = await client.create({
      name: 'dataset-1',
      description: 'A dataset',
      examples: [baseExampleA],
    });
    const exampleToUpdate = created.examples[0];

    const updated = await client.updateExample(
      exampleToUpdate.id,
      { output: { expected: 'updated' } },
      created.id
    );

    expect(updated).toBeDefined();
    expect(updated?.output).toEqual({ expected: 'updated' });
  });

  it('throws ExampleNotFoundError when updating with non-matching expectedDatasetId', async () => {
    const { client } = createClient();

    const created = await client.create({
      name: 'dataset-1',
      description: 'A dataset',
      examples: [baseExampleA],
    });
    const exampleToUpdate = created.examples[0];

    await expect(
      client.updateExample(
        exampleToUpdate.id,
        { output: { expected: 'updated' } },
        'wrong-dataset-id'
      )
    ).rejects.toThrow(ExampleNotFoundError);

    const fetched = await client.get(created.id);
    expect(fetched?.examples[0].output).toEqual(baseExampleA.output);
  });

  it('deleteExamplesByDatasetId removes all examples for a dataset', async () => {
    const { client, examplesStorage } = createClient();

    const created = await client.create({
      name: 'dataset-1',
      description: 'A dataset',
      examples: [baseExampleA, baseExampleB],
    });
    const result = await client.deleteExamplesByDatasetId(created.id);

    expect(result).toEqual({ deleted: 2 });

    const fetched = await client.get(created.id);
    expect(fetched?.examples).toHaveLength(0);
    expect(examplesStorage.client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        _source: ['dataset_id'],
        query: { term: { dataset_id: created.id } },
      })
    );
  });

  it('deleteExamplesByDatasetId returns zero when dataset has no examples', async () => {
    const { client } = createClient();

    const created = await client.create({ name: 'dataset-1', description: 'A dataset' });
    const result = await client.deleteExamplesByDatasetId(created.id);

    expect(result).toEqual({ deleted: 0 });
  });

  it('throws DatasetAlreadyExistsError when creating a dataset with a duplicate name', async () => {
    const { client } = createClient();

    await client.create({ name: 'dataset-1', description: 'A dataset' });
    await expect(client.create({ name: 'dataset-1', description: 'Duplicate' })).rejects.toThrow(
      DatasetAlreadyExistsError
    );
  });

  it('upsert diffs examples and reports added removed unchanged', async () => {
    const { client } = createClient();

    await client.create({
      name: 'dataset-1',
      description: 'A dataset',
      examples: [baseExampleA, baseExampleB],
    });
    const result = await client.upsert({
      name: 'dataset-1',
      description: 'Updated description',
      examples: [baseExampleB, baseExampleC],
    });
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

    const created = await client.create({
      name: 'dataset-1',
      description: 'A dataset',
      examples: [baseExampleA, baseExampleB],
    });
    const exampleToUpdate = created.examples[0];

    await expect(
      client.updateExample(
        exampleToUpdate.id,
        {
          input: baseExampleB.input,
          output: baseExampleB.output,
          metadata: baseExampleB.metadata ?? undefined,
        },
        created.id
      )
    ).rejects.toThrow(ExampleAlreadyExistsError);

    const dataset = await client.get(created.id);
    expect(dataset?.examples).toHaveLength(2);
  });

  it('throws ExampleAlreadyExistsError when adding a duplicate example', async () => {
    const { client } = createClient();

    const created = await client.create({
      name: 'dataset-1',
      description: 'A dataset',
      examples: [baseExampleA],
    });

    await expect(client.addExamples(created.id, [baseExampleA])).rejects.toThrow(
      ExampleAlreadyExistsError
    );

    const dataset = await client.get(created.id);
    expect(dataset?.examples).toHaveLength(1);
  });

  it('filters datasets by name via search', async () => {
    const { client } = createClient();

    await client.create({
      name: 'kibana-dataset',
      description: 'About dashboards',
      examples: [baseExampleA],
    });
    await client.create({
      name: 'elasticsearch-dataset',
      description: 'About queries',
      examples: [baseExampleB],
    });

    const result = await client.list({ search: 'kibana' });

    expect(result.total).toBe(1);
    expect(result.datasets.map((dataset) => dataset.name)).toEqual(['kibana-dataset']);
  });

  it('filters datasets by description via search', async () => {
    const { client } = createClient();

    await client.create({
      name: 'dataset-a',
      description: 'covers dashboards',
      examples: [baseExampleA],
    });
    await client.create({
      name: 'dataset-b',
      description: 'covers ingest pipelines',
      examples: [baseExampleB],
    });

    const result = await client.list({ search: 'ingest' });

    expect(result.total).toBe(1);
    expect(result.datasets.map((dataset) => dataset.name)).toEqual(['dataset-b']);
  });

  it('sorts datasets by example count', async () => {
    const { client } = createClient();

    await client.create({ name: 'few', description: 'A dataset', examples: [baseExampleA] });
    await client.create({
      name: 'many',
      description: 'A dataset',
      examples: [baseExampleA, baseExampleB, baseExampleC],
    });

    const ascending = await client.list({ sortField: 'examples_count', sortOrder: 'asc' });
    expect(ascending.datasets.map((dataset) => dataset.name)).toEqual(['few', 'many']);

    const descending = await client.list({ sortField: 'examples_count', sortOrder: 'desc' });
    expect(descending.datasets.map((dataset) => dataset.name)).toEqual(['many', 'few']);
  });

  it('maintains examples_count as examples are added and removed', async () => {
    const { client } = createClient();

    const created = await client.create({
      name: 'dataset-1',
      description: 'A dataset',
      examples: [baseExampleA],
    });
    expect((await client.list()).datasets[0].examples_count).toBe(1);

    await client.addExamples(created.id, [baseExampleB]);
    expect((await client.list()).datasets[0].examples_count).toBe(2);

    await client.deleteExample(created.examples[0].id, created.id);
    expect((await client.list()).datasets[0].examples_count).toBe(1);
  });

  it('backfills examples_count for datasets missing it and is idempotent', async () => {
    const { client, datasetsStorage } = createClient();

    const created = await client.create({
      name: 'legacy',
      description: 'legacy dataset',
      examples: [baseExampleA, baseExampleB],
    });

    // Simulate a dataset written before examples_count existed.
    const stored = datasetsStorage.docs.get(created.id);
    expect(stored).toBeDefined();
    const updatedAtBefore = stored!.updated_at;
    delete (stored as { examples_count?: number }).examples_count;

    const firstRun = await client.backfillDatasetCounts();
    expect(firstRun.updated).toBe(1);
    expect(datasetsStorage.docs.get(created.id)?.examples_count).toBe(2);
    // Backfill preserves updated_at (it is not a user-facing modification).
    expect(datasetsStorage.docs.get(created.id)?.updated_at).toBe(updatedAtBefore);

    const secondRun = await client.backfillDatasetCounts();
    expect(secondRun.updated).toBe(0);
  });

  describe('tags and maturity', () => {
    it('normalizes tags on create and stores maturity', async () => {
      const { client } = createClient();

      const created = await client.create({
        name: 'dataset-1',
        description: 'A dataset',
        tags: ['  Golden  ', 'golden', 'Regression-Suite', ''],
        maturity: 'golden',
      });

      expect(created.tags).toEqual(['golden', 'regression-suite']);
      expect(created.maturity).toBe('golden');
    });

    it('leaves untagged datasets without tag fields', async () => {
      const { client, datasetsStorage } = createClient();

      const created = await client.create({ name: 'dataset-1', description: 'A dataset' });

      expect(created.tags).toBeUndefined();
      expect(created.maturity).toBeUndefined();
      expect(datasetsStorage.docs.get(created.id)).not.toHaveProperty('tags');
      expect(datasetsStorage.docs.get(created.id)).not.toHaveProperty('maturity');
    });

    it('updates tags and maturity independently of the description', async () => {
      const { client } = createClient();

      const created = await client.create({
        name: 'dataset-1',
        description: 'A dataset',
        tags: ['raw-capture'],
        maturity: 'raw',
      });

      const withNewTags = await client.update(created.id, { tags: ['cleaned-up'] });
      expect(withNewTags?.tags).toEqual(['cleaned-up']);
      expect(withNewTags?.maturity).toBe('raw');
      expect(withNewTags?.description).toBe('A dataset');

      const withNewDescription = await client.update(created.id, { description: 'Updated' });
      expect(withNewDescription?.description).toBe('Updated');
      expect(withNewDescription?.tags).toEqual(['cleaned-up']);
      expect(withNewDescription?.maturity).toBe('raw');
    });

    it('clears tags with an empty array and maturity with null', async () => {
      const { client } = createClient();

      const created = await client.create({
        name: 'dataset-1',
        description: 'A dataset',
        tags: ['golden'],
        maturity: 'golden',
      });

      const cleared = await client.update(created.id, { tags: [], maturity: null });

      expect(cleared?.tags).toBeUndefined();
      expect(cleared?.maturity).toBeUndefined();
    });

    // Dataset documents are rewritten wholesale on every example change, so a
    // regression here silently wipes curation metadata.
    it('preserves tags and maturity when examples change', async () => {
      const { client } = createClient();

      const created = await client.create({
        name: 'dataset-1',
        description: 'A dataset',
        tags: ['golden'],
        maturity: 'golden',
        examples: [baseExampleA],
      });
      expect(created.tags).toEqual(['golden']);

      await client.addExamples(created.id, [baseExampleB]);
      const afterAdd = await client.get(created.id);
      expect(afterAdd?.tags).toEqual(['golden']);
      expect(afterAdd?.maturity).toBe('golden');
      expect(afterAdd?.examples_count).toBe(2);

      await client.deleteExample(created.examples[0].id, created.id);
      const afterDelete = await client.get(created.id);
      expect(afterDelete?.tags).toEqual(['golden']);
      expect(afterDelete?.maturity).toBe('golden');
    });

    // Omitting tags from a write is one way to lose them; the other is timing.
    // A suite adding examples reads the dataset, then writes it back, and a tag
    // edit landing in that gap must not be rolled back by the stale copy.
    it('keeps tags saved concurrently with an example write', async () => {
      let raceNextRead: (() => void) | undefined;
      const { client, datasetsStorage } = createClient({
        onReadForWrite: () => raceNextRead?.(),
      });

      const created = await client.create({
        name: 'dataset-1',
        description: 'A dataset',
        tags: ['stale'],
      });

      raceNextRead = () => {
        // One-shot: the retry must see the competing write, not another race.
        raceNextRead = undefined;
        const current = datasetsStorage.docs.get(created.id)!;
        datasetsStorage.docs.set(created.id, { ...current, tags: ['curated'], maturity: 'golden' });
        datasetsStorage.seqNos.set(created.id, (datasetsStorage.seqNos.get(created.id) ?? 0) + 1);
      };

      await client.addExamples(created.id, [baseExampleA]);

      const afterRace = await client.get(created.id);
      expect(afterRace?.tags).toEqual(['curated']);
      expect(afterRace?.maturity).toBe('golden');
      // The retry still lands the count it was asked to write.
      expect(afterRace?.examples_count).toBe(1);
    });

    it('reports an update as a miss when the dataset is deleted mid-write', async () => {
      const harness: { current?: () => void } = {};
      const { client, datasetsStorage } = createClient({
        onReadForWrite: () => harness.current?.(),
      });

      const created = await client.create({ name: 'dataset-1', description: 'A dataset' });

      harness.current = () => {
        harness.current = undefined;
        datasetsStorage.docs.delete(created.id);
        datasetsStorage.seqNos.delete(created.id);
      };

      await expect(client.update(created.id, { tags: ['golden'] })).resolves.toBeUndefined();
    });

    // Under sustained contention the retries run out. What happens then depends on
    // what the write was carrying, because only one of the two is recoverable.
    describe('when conflicts outlast the retries', () => {
      const withoutRetryDelays = async <T>(run: () => Promise<T>): Promise<T> => {
        jest.useFakeTimers();
        try {
          const settled = run().then(
            (value) => () => value,
            (error) => () => {
              throw error;
            }
          );
          await jest.advanceTimersByTimeAsync(10_000);
          return (await settled)();
        } finally {
          jest.useRealTimers();
        }
      };

      // Never disarmed, so every attempt reads a version that is stale by the time
      // it writes.
      const raceEveryRead =
        (storage: { docs: Map<string, DatasetStorageDocument>; seqNos: Map<string, number> }) =>
        () => {
          for (const [id, document] of storage.docs) {
            storage.docs.set(id, { ...document, description: `touched-${Date.now()}` });
            storage.seqNos.set(id, (storage.seqNos.get(id) ?? 0) + 1);
          }
        };

      it('lets an example write through, leaving the count to self-correct', async () => {
        const harness: { current?: () => void } = {};
        const { client, datasetsStorage, logger } = createClient({
          onReadForWrite: () => harness.current?.(),
        });

        const created = await client.create({ name: 'dataset-1', description: 'A dataset' });
        harness.current = raceEveryRead(datasetsStorage);

        // The examples themselves are written before the dataset is touched, so
        // failing here would report an error for work that already succeeded.
        await expect(
          withoutRetryDelays(() => client.addExamples(created.id, [baseExampleA]))
        ).resolves.toEqual({ added: 1 });
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(created.id));
      });

      it('surfaces a metadata edit that could not be applied', async () => {
        const harness: { current?: () => void } = {};
        const { client, datasetsStorage } = createClient({
          onReadForWrite: () => harness.current?.(),
        });

        const created = await client.create({ name: 'dataset-1', description: 'A dataset' });
        harness.current = raceEveryRead(datasetsStorage);

        await expect(
          withoutRetryDelays(() => client.update(created.id, { tags: ['golden'] }))
        ).rejects.toThrow(/conflict/i);
      });
    });

    it('preserves tags and maturity when backfilling example counts', async () => {
      const { client, datasetsStorage } = createClient();

      const created = await client.create({
        name: 'legacy',
        description: 'legacy dataset',
        tags: ['golden'],
        maturity: 'golden',
        examples: [baseExampleA],
      });
      delete (datasetsStorage.docs.get(created.id) as { examples_count?: number }).examples_count;

      await client.backfillDatasetCounts();

      expect(datasetsStorage.docs.get(created.id)).toMatchObject({
        tags: ['golden'],
        maturity: 'golden',
        examples_count: 1,
      });
    });

    it('applies declared tags on upsert and keeps undeclared ones', async () => {
      const { client } = createClient();

      const created = await client.create({
        name: 'dataset-1',
        description: 'A dataset',
        tags: ['golden'],
        maturity: 'golden',
        examples: [baseExampleA],
      });

      // A suite that doesn't mention tags must not wipe tags set in the UI.
      await client.upsert({
        name: 'dataset-1',
        description: 'A dataset',
        examples: [baseExampleA, baseExampleB],
      });
      expect((await client.get(created.id))?.tags).toEqual(['golden']);

      await client.upsert({
        name: 'dataset-1',
        description: 'A dataset',
        tags: ['cleaned-up'],
        maturity: 'cleaned',
        examples: [baseExampleA, baseExampleB],
      });
      const upserted = await client.get(created.id);
      expect(upserted?.tags).toEqual(['cleaned-up']);
      expect(upserted?.maturity).toBe('cleaned');
    });

    it('requires every filter tag to be present and matches case-insensitively', async () => {
      const { client } = createClient();

      await client.create({
        name: 'both',
        description: 'A dataset',
        tags: ['golden', 'esql'],
      });
      await client.create({ name: 'one', description: 'A dataset', tags: ['golden'] });
      await client.create({ name: 'none', description: 'A dataset' });

      const singleTag = await client.list({ tags: ['golden'] });
      expect(singleTag.datasets.map(({ name }) => name).sort()).toEqual(['both', 'one']);

      const bothTags = await client.list({ tags: ['GOLDEN', 'esql'] });
      expect(bothTags.total).toBe(1);
      expect(bothTags.datasets.map(({ name }) => name)).toEqual(['both']);
    });

    it('filters by any of the requested maturity levels', async () => {
      const { client } = createClient();

      await client.create({ name: 'raw-one', description: 'A dataset', maturity: 'raw' });
      await client.create({ name: 'cleaned-one', description: 'A dataset', maturity: 'cleaned' });
      await client.create({ name: 'golden-one', description: 'A dataset', maturity: 'golden' });

      const result = await client.list({ maturity: ['raw', 'golden'] });

      expect(result.total).toBe(2);
      expect(result.datasets.map(({ name }) => name).sort()).toEqual(['golden-one', 'raw-one']);
    });

    it('sorts by maturity alphabetically, leaving datasets without one last', async () => {
      const { client } = createClient();

      await client.create({ name: 'raw-one', description: 'A dataset', maturity: 'raw' });
      await client.create({ name: 'unset', description: 'A dataset' });
      await client.create({ name: 'golden-one', description: 'A dataset', maturity: 'golden' });
      await client.create({ name: 'cleaned-one', description: 'A dataset', maturity: 'cleaned' });

      const ascending = await client.list({ sortField: 'maturity', sortOrder: 'asc' });
      expect(ascending.datasets.map(({ name }) => name)).toEqual([
        'cleaned-one',
        'golden-one',
        'raw-one',
        'unset',
      ]);

      // Reversing the order flips the levels but keeps the unset dataset last.
      const descending = await client.list({ sortField: 'maturity', sortOrder: 'desc' });
      expect(descending.datasets.map(({ name }) => name)).toEqual([
        'raw-one',
        'golden-one',
        'cleaned-one',
        'unset',
      ]);
    });

    it('reports facet counts that ignore the active filters but honour the search term', async () => {
      const { client } = createClient();

      await client.create({
        name: 'kibana-golden',
        description: 'A dataset',
        tags: ['golden'],
        maturity: 'golden',
      });
      await client.create({
        name: 'kibana-raw',
        description: 'A dataset',
        tags: ['raw-capture'],
        maturity: 'raw',
      });
      await client.create({
        name: 'other',
        description: 'Unrelated',
        tags: ['golden'],
        maturity: 'golden',
      });

      // Filtering to one tag must still offer the others as options.
      const filtered = await client.list({ tags: ['golden'] });
      expect(filtered.total).toBe(2);
      expect(filtered.facets.tags).toEqual([
        { value: 'golden', count: 2 },
        { value: 'raw-capture', count: 1 },
      ]);
      expect(filtered.facets.maturity).toEqual([
        { value: 'golden', count: 2 },
        { value: 'raw', count: 1 },
      ]);

      // Searching does narrow the facets, since it narrows what's on the page.
      const searched = await client.list({ search: 'kibana' });
      expect(searched.facets.tags).toEqual([
        { value: 'golden', count: 1 },
        { value: 'raw-capture', count: 1 },
      ]);
    });
  });
});
