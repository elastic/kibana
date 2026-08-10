/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import { isEmpty, omitBy } from 'lodash';
import { v5 as uuidv5 } from 'uuid';
import type {
  InternalIStorageClient,
  StorageClientBulkOperation,
  StorageIndexAdapter,
} from '@kbn/storage-adapter';
import { isResponseError } from '@kbn/es-errors';
import { OccWriter, isOccConflictError } from '@kbn/occ';
import type { OccDocument } from '@kbn/occ';
import type { Logger } from '@kbn/logging';
import {
  DATASET_UUID_NAMESPACE,
  DatasetMaturityEnum,
  MAX_DATASET_TAG_FACETS,
  MAX_EXAMPLES_PER_DATASET,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_DATASET,
  type DatasetMaturity,
} from '@kbn/evals-common';
import type { DatasetStorageProperties } from './datasets_storage';
import { DatasetAlreadyExistsError } from './dataset_already_exists_error';
import { ExampleAlreadyExistsError } from './example_already_exists_error';
import { ExampleNotFoundError } from './example_not_found_error';
import type { datasetsStorageSettings } from './datasets_storage';
import type { DatasetExampleStorageProperties } from './examples_storage';
import type { datasetExamplesStorageSettings } from './examples_storage';

type DatasetStorageDocument = DatasetStorageProperties & { _id?: string };
type DatasetExampleStorageDocument = DatasetExampleStorageProperties & { _id?: string };

interface ExampleDocument extends DatasetExampleStorageProperties {
  id: string;
}

interface NormalizedExample {
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface DatasetExampleInput {
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
}

export interface CreateDatasetInput {
  name: string;
  description: string;
  tags?: string[];
  maturity?: DatasetMaturity;
  examples?: DatasetExampleInput[];
}

export interface UpsertDatasetInput {
  name: string;
  description: string;
  tags?: string[];
  maturity?: DatasetMaturity;
  examples: DatasetExampleInput[];
}

/**
 * Fields a caller may change on an existing dataset. `undefined` leaves a field
 * as-is. An empty `tags` array or a `null` `maturity` clears it.
 */
export interface UpdateDatasetInput {
  description?: string;
  tags?: string[];
  maturity?: DatasetMaturity | null;
}

export interface DatasetDocument extends DatasetStorageProperties {
  id: string;
  // Normalized on read: legacy documents missing the stored field are
  // backfilled to 0, so callers can always rely on a number here.
  examples_count: number;
}

export interface DatasetWithExamples extends DatasetDocument {
  examples: ExampleDocument[];
}

export type DatasetSortField = 'name' | 'created_at' | 'updated_at' | 'examples_count' | 'maturity';
export type DatasetSortOrder = 'asc' | 'desc';

const DATASET_SORTABLE_FIELDS: readonly DatasetSortField[] = [
  'name',
  'created_at',
  'updated_at',
  'examples_count',
  'maturity',
];

export interface DatasetListOptions {
  page?: number;
  perPage?: number;
  search?: string;
  tags?: string[];
  maturity?: DatasetMaturity[];
  sortField?: DatasetSortField;
  sortOrder?: DatasetSortOrder;
}

export interface DatasetListItem extends DatasetDocument {
  examples_count: number;
}

export interface DatasetFacetBucket {
  value: string;
  count: number;
}

/**
 * Values the caller can filter on, and how many datasets carry each. Counts
 * honour the search term but ignore the tag and maturity filters, so the
 * available options don't disappear as filters are applied.
 */
export interface DatasetFacets {
  tags: DatasetFacetBucket[];
  maturity: DatasetFacetBucket[];
}

export interface DatasetListResult {
  datasets: DatasetListItem[];
  total: number;
  facets: DatasetFacets;
}

export interface UpsertDatasetResult {
  dataset_id: string;
  added: number;
  removed: number;
  unchanged: number;
}

export type DatasetsStorageAdapter = StorageIndexAdapter<
  typeof datasetsStorageSettings,
  DatasetStorageDocument
>;
export type DatasetExamplesStorageAdapter = StorageIndexAdapter<
  typeof datasetExamplesStorageSettings,
  DatasetExampleStorageDocument
>;

export class DatasetClient {
  private readonly datasetsStorage: InternalIStorageClient<DatasetStorageDocument>;
  private readonly examplesStorage: InternalIStorageClient<DatasetExampleStorageDocument>;
  private readonly datasetWriter: OccWriter<DatasetStorageProperties>;
  private readonly logger?: Logger;

  constructor({
    datasetsStorageAdapter,
    examplesStorageAdapter,
    logger,
  }: {
    datasetsStorageAdapter: DatasetsStorageAdapter;
    examplesStorageAdapter: DatasetExamplesStorageAdapter;
    logger?: Logger;
  }) {
    this.datasetsStorage = datasetsStorageAdapter.getClient();
    this.examplesStorage = examplesStorageAdapter.getClient();
    this.logger = logger;

    // Every dataset write is a read-modify-write of the whole document, because the
    // storage adapter can only replace documents outright. Without a conditional write
    // a suite touching the dataset for an example batch would silently revert tags a
    // user saved in between, which is the loss this field is supposed to survive.
    this.datasetWriter = new OccWriter<DatasetStorageProperties>({
      get: async (id) => {
        const current = await this.getDatasetForWrite(id);
        return current ?? null;
      },
      index: async ({ id, document, ifSeqNo, ifPrimaryTerm }) => {
        const response = await this.datasetsStorage.index({
          id,
          document,
          refresh: true,
          ...(ifSeqNo != null && ifPrimaryTerm != null
            ? { if_seq_no: ifSeqNo, if_primary_term: ifPrimaryTerm }
            : {}),
        });

        // Typed optional, but Elasticsearch always returns both for a write that
        // landed. Failing here beats handing back made-up values that the next
        // conditional write would treat as real.
        if (response._seq_no == null || response._primary_term == null) {
          throw new Error(`Indexing dataset "${id}" returned no _seq_no/_primary_term`);
        }

        return { seqNo: response._seq_no, primaryTerm: response._primary_term };
      },
      maxRetries: 5,
      retryDelayMs: 150,
      logger,
    });
  }

  static getDatasetId(name: string): string {
    return uuidv5(name, DATASET_UUID_NAMESPACE);
  }

  static getExampleId({
    datasetId,
    example,
  }: {
    datasetId: string;
    example: DatasetExampleInput;
  }): string {
    return objectHash({
      dataset_id: datasetId,
      ...normalizeExample(example),
    });
  }

  async create({
    name,
    description,
    tags,
    maturity,
    examples = [],
  }: CreateDatasetInput): Promise<DatasetWithExamples> {
    const datasetId = DatasetClient.getDatasetId(name);
    const now = new Date().toISOString();

    try {
      await this.datasetsStorage.index({
        id: datasetId,
        op_type: 'create',
        document: buildDatasetDocument(
          {
            name,
            description,
            created_at: now,
            updated_at: now,
          },
          { tags, maturity, examples_count: 0 }
        ),
      });
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 409) {
        throw new DatasetAlreadyExistsError(name);
      }
      throw error;
    }

    if (examples.length > 0) {
      await this.addExamples(datasetId, examples, { touchDataset: false });
      // Persist the count without advancing updated_at past the creation timestamp.
      await this.touchDataset(datasetId, { bumpUpdatedAt: false });
    }

    const created = await this.get(datasetId);
    if (!created) {
      throw new Error(`Failed to create dataset "${datasetId}"`);
    }

    return created;
  }

  async get(datasetId: string): Promise<DatasetWithExamples | undefined> {
    const dataset = await this.getDatasetById(datasetId);
    if (!dataset) {
      return undefined;
    }

    const examples = await this.getExamplesByDatasetId(datasetId);

    return {
      ...dataset,
      examples,
    };
  }

  async datasetExists(datasetId: string): Promise<boolean> {
    const response = await this.datasetsStorage.search({
      track_total_hits: false,
      size: 1,
      _source: ['name'],
      query: {
        term: {
          _id: datasetId,
        },
      },
    });

    return response.hits.hits.length > 0;
  }

  async getByName(name: string): Promise<DatasetWithExamples | undefined> {
    const response = await this.datasetsStorage.search({
      track_total_hits: false,
      size: 1,
      query: {
        term: {
          name,
        },
      },
    });

    const hit = response.hits.hits[0];
    if (!hit?._source || !hit._id) {
      return undefined;
    }

    return this.get(hit._id);
  }

  async list(options: DatasetListOptions = {}): Promise<DatasetListResult> {
    const page = Math.max(1, options.page ?? 1);
    const perPage = Math.max(1, options.perPage ?? 20);
    const from = (page - 1) * perPage;

    const search = options.search?.trim();
    const sortField =
      options.sortField != null && DATASET_SORTABLE_FIELDS.includes(options.sortField)
        ? options.sortField
        : 'updated_at';
    const sortOrder: DatasetSortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc';

    // The leading `*` wildcard on the `name` keyword field can't use the inverted
    // index and scans all dataset name terms, so cost grows with the number of
    // datasets. This is fine at evals scale; if dataset counts grow large, switch
    // `name` to a `text`/`search_as_you_type` mapping with a `match` query.
    const searchQuery = search
      ? {
          bool: {
            should: [
              {
                wildcard: {
                  name: {
                    value: `*${escapeWildcard(search)}*`,
                    case_insensitive: true,
                  },
                },
              },
              {
                match: {
                  description: search,
                },
              },
            ],
            minimum_should_match: 1,
          },
        }
      : { match_all: {} };

    // Tags are ANDed (narrow down to datasets carrying all of them) while
    // maturity levels are ORed, because a dataset has exactly one maturity.
    // Filter tags reuse the per-dataset cap: a dataset can never carry more
    // than that many tags, so a longer conjunction cannot match anything.
    const tagFilters = normalizeTags(options.tags ?? []).map((tag) => ({ term: { tags: tag } }));
    const maturityFilter = dedupe(options.maturity ?? []);
    const filters = [
      ...tagFilters,
      ...(maturityFilter.length > 0 ? [{ terms: { maturity: maturityFilter } }] : []),
    ];

    const datasetsResponse = await this.datasetsStorage.search({
      track_total_hits: true,
      from,
      size: perPage,
      sort: [{ [sortField]: { order: sortOrder } }],
      query: filters.length > 0 ? { bool: { must: [searchQuery], filter: filters } } : searchQuery,
      // `global` escapes the request query so the facet counts aren't narrowed by
      // the tag/maturity filters, then `scoped` re-applies just the search term.
      // Otherwise selecting a tag would hide every tag it doesn't co-occur with.
      aggs: {
        facets: {
          global: {},
          aggs: {
            scoped: {
              filter: searchQuery,
              aggs: {
                tags: { terms: { field: 'tags', size: MAX_DATASET_TAG_FACETS } },
                maturity: { terms: { field: 'maturity', size: MATURITY_FACET_SIZE } },
              },
            },
          },
        },
      },
    });

    const datasets = datasetsResponse.hits.hits
      .filter(
        (hit): hit is typeof hit & { _source: DatasetStorageDocument; _id: string } =>
          Boolean(hit._source) && typeof hit._id === 'string'
      )
      .map((hit) => ({
        id: hit._id,
        ...hit._source,
        examples_count: hit._source.examples_count ?? 0,
      }));

    return {
      datasets,
      total:
        typeof datasetsResponse.hits.total === 'number'
          ? datasetsResponse.hits.total
          : datasetsResponse.hits.total?.value ?? 0,
      facets: parseFacets(datasetsResponse.aggregations),
    };
  }

  async update(
    datasetId: string,
    updates: UpdateDatasetInput
  ): Promise<DatasetWithExamples | undefined> {
    const updatedAt = new Date().toISOString();
    const written = await this.writeDatasetIfPresent(datasetId, (current) =>
      buildDatasetDocument(current, { ...updates, updated_at: updatedAt })
    );

    if (!written) {
      return undefined;
    }

    return this.get(datasetId);
  }

  async delete(datasetId: string): Promise<boolean> {
    const exists = await this.datasetExists(datasetId);
    if (!exists) {
      return false;
    }

    await this.deleteExamplesByDatasetId(datasetId);

    const deleteDatasetResponse = await this.datasetsStorage.delete({ id: datasetId });
    return deleteDatasetResponse.result === 'deleted';
  }

  async addExamples(
    datasetId: string,
    examples: DatasetExampleInput[],
    options: { touchDataset?: boolean; rejectDuplicates?: boolean } = {}
  ): Promise<{ added: number }> {
    if (examples.length === 0) {
      return { added: 0 };
    }

    const rejectDuplicates = options.rejectDuplicates ?? true;
    const now = new Date().toISOString();
    const operations: Array<StorageClientBulkOperation<DatasetExampleStorageDocument>> =
      examples.map((example) => {
        const normalizedExample = normalizeExample(example);
        return {
          index: {
            _id: DatasetClient.getExampleId({
              datasetId,
              example: normalizedExample,
            }),
            document: {
              dataset_id: datasetId,
              ...normalizedExample,
              created_at: now,
              updated_at: now,
            },
          },
        };
      });

    const response = await this.examplesStorage.bulk({
      operations,
      throwOnFail: false,
    });

    const { conflicts, failed } = summarizeBulkResult(response.items);
    if (failed > 0) {
      throw new Error(`Failed to add ${failed} examples to dataset "${datasetId}"`);
    }

    if (rejectDuplicates && conflicts > 0) {
      throw new ExampleAlreadyExistsError(`${conflicts} duplicate${conflicts > 1 ? 's' : ''}`);
    }

    const added = operations.length - conflicts;

    if ((options.touchDataset ?? true) && added > 0) {
      await this.touchDataset(datasetId);
    }

    return { added };
  }

  async updateExample(
    exampleId: string,
    updates: Partial<Pick<DatasetExampleStorageProperties, 'input' | 'output' | 'metadata'>>,
    expectedDatasetId: string
  ): Promise<ExampleDocument> {
    const ownerDatasetId = await this.getExampleDatasetId(exampleId);
    if (!ownerDatasetId || ownerDatasetId !== expectedDatasetId) {
      throw new ExampleNotFoundError(exampleId);
    }

    const existing = await this.getExampleById(exampleId);
    if (!existing) {
      throw new ExampleNotFoundError(exampleId);
    }

    const updatedExample = normalizeExample({
      input: updates.input ?? existing.input,
      output: updates.output ?? existing.output,
      metadata: updates.metadata ?? existing.metadata,
    });
    const updatedAt = new Date().toISOString();
    const updatedId = DatasetClient.getExampleId({
      datasetId: existing.dataset_id,
      example: updatedExample,
    });

    if (updatedId !== exampleId) {
      const collision = await this.getExampleById(updatedId);
      if (collision) {
        throw new ExampleAlreadyExistsError(updatedId);
      }
    }

    await this.examplesStorage.index({
      id: updatedId,
      document: {
        dataset_id: existing.dataset_id,
        ...updatedExample,
        created_at: existing.created_at,
        updated_at: updatedAt,
      },
    });

    if (updatedId !== exampleId) {
      await this.examplesStorage.delete({ id: exampleId });
    }

    await this.touchDataset(existing.dataset_id);

    const updated = await this.getExampleById(updatedId);
    if (!updated) {
      throw new Error(`Failed to read back updated example "${updatedId}"`);
    }
    return updated;
  }

  async deleteExample(exampleId: string, expectedDatasetId: string): Promise<void> {
    const datasetId = await this.getExampleDatasetId(exampleId);
    if (!datasetId || datasetId !== expectedDatasetId) {
      throw new ExampleNotFoundError(exampleId);
    }

    const response = await this.examplesStorage.delete({
      id: exampleId,
    });

    if (response.result === 'deleted') {
      await this.touchDataset(datasetId);
    }
  }

  async deleteExamplesByDatasetId(datasetId: string): Promise<{ deleted: number }> {
    const searchResponse = await this.examplesStorage.search({
      track_total_hits: true,
      size: MAX_EXAMPLES_PER_DATASET,
      _source: ['dataset_id'],
      query: {
        term: {
          dataset_id: datasetId,
        },
      },
    });

    const total =
      typeof searchResponse.hits.total === 'number'
        ? searchResponse.hits.total
        : searchResponse.hits.total?.value ?? 0;
    if (total > MAX_EXAMPLES_PER_DATASET) {
      throw new Error(
        `Dataset "${datasetId}" has ${total} examples, exceeding the maximum of ${MAX_EXAMPLES_PER_DATASET}`
      );
    }

    const ids = searchResponse.hits.hits
      .filter((hit): hit is typeof hit & { _id: string } => typeof hit._id === 'string')
      .map((hit) => hit._id);

    if (ids.length === 0) {
      return { deleted: 0 };
    }

    const bulkResponse = await this.examplesStorage.bulk({
      operations: ids.map((id) => ({
        delete: {
          _id: id,
        },
      })),
      throwOnFail: false,
    });

    const { failed } = summarizeBulkResult(bulkResponse.items);
    if (failed > 0) {
      throw new Error(`Failed to delete examples for dataset "${datasetId}"`);
    }

    return { deleted: ids.length };
  }

  async upsert({
    name,
    description,
    tags,
    maturity,
    examples,
  }: UpsertDatasetInput): Promise<UpsertDatasetResult> {
    const existing = await this.getByName(name);

    if (!existing) {
      const created = await this.create({ name, description, tags, maturity, examples });
      return {
        dataset_id: created.id,
        added: created.examples.length,
        removed: 0,
        unchanged: 0,
      };
    }

    const nextExamplesByHash = new Map<string, DatasetExampleInput>();
    for (const example of examples) {
      const normalizedExample = normalizeExample(example);
      const hash = DatasetClient.getExampleId({
        datasetId: existing.id,
        example: normalizedExample,
      });
      nextExamplesByHash.set(hash, normalizedExample);
    }

    const existingExampleIdsByHash = new Map<string, string>();
    for (const example of existing.examples) {
      const hash = DatasetClient.getExampleId({
        datasetId: existing.id,
        example,
      });
      existingExampleIdsByHash.set(hash, example.id);
    }

    const toAdd: DatasetExampleInput[] = [];
    let unchanged = 0;

    for (const [hash, example] of nextExamplesByHash.entries()) {
      if (existingExampleIdsByHash.has(hash)) {
        unchanged += 1;
        existingExampleIdsByHash.delete(hash);
      } else {
        toAdd.push(example);
      }
    }

    const toDelete = Array.from(existingExampleIdsByHash.values());

    const [{ added }] = await Promise.all([
      this.addExamples(existing.id, toAdd, { touchDataset: false, rejectDuplicates: false }),
      this.examplesStorage.bulk({
        operations: toDelete.map((id) => ({
          delete: { _id: id },
        })),
        throwOnFail: true,
      }),
    ]);

    const examplesChanged = added > 0 || toDelete.length > 0;
    // Only fields the caller declared are compared, so tags and maturity set
    // through the UI survive an upsert from code that doesn't mention them.
    const metadataPatch: DatasetPatch = {
      ...(description !== existing.description ? { description } : {}),
      ...(tags !== undefined && !haveSameTags(tags, existing.tags) ? { tags } : {}),
      ...(maturity !== undefined && maturity !== existing.maturity ? { maturity } : {}),
    };
    const metadataChanged = Object.keys(metadataPatch).length > 0;

    // Write the dataset document at most once. When examples changed we recompute
    // the count (and fold in any metadata edit); otherwise the count is
    // unchanged, so a metadata-only edit reuses the known count.
    if (examplesChanged) {
      await this.touchDataset(existing.id, metadataPatch);
    } else if (metadataChanged) {
      const updatedAt = new Date().toISOString();
      await this.writeDatasetIfPresent(existing.id, (current) =>
        buildDatasetDocument(current, { ...metadataPatch, updated_at: updatedAt })
      );
    }

    return {
      dataset_id: existing.id,
      added,
      removed: toDelete.length,
      unchanged,
    };
  }

  /**
   * Reads a dataset along with the `_seq_no`/`_primary_term` a conditional write has
   * to send back. Separate from `getDatasetById` so `seq_no_primary_term` can't be
   * forgotten: without it both are undefined and the write silently becomes
   * unconditional.
   */
  private async getDatasetForWrite(
    datasetId: string
  ): Promise<OccDocument<DatasetStorageProperties> | undefined> {
    const response = await this.datasetsStorage.search({
      track_total_hits: false,
      size: 1,
      seq_no_primary_term: true,
      query: {
        term: {
          _id: datasetId,
        },
      },
    });

    const hit = response.hits.hits[0];
    if (!hit?._source || hit._seq_no == null || hit._primary_term == null) {
      return undefined;
    }

    return {
      id: datasetId,
      source: hit._source,
      occ: { seqNo: hit._seq_no, primaryTerm: hit._primary_term },
    };
  }

  private async getDatasetById(datasetId: string): Promise<DatasetDocument | undefined> {
    const response = await this.datasetsStorage.search({
      track_total_hits: false,
      size: 1,
      query: {
        term: {
          _id: datasetId,
        },
      },
    });

    const hit = response.hits.hits[0];
    if (!hit?._source || !hit._id) {
      return undefined;
    }

    return {
      id: hit._id,
      ...hit._source,
      examples_count: hit._source.examples_count ?? 0,
    };
  }

  private async getExamplesByDatasetId(datasetId: string): Promise<ExampleDocument[]> {
    const response = await this.examplesStorage.search({
      track_total_hits: true,
      size: MAX_EXAMPLES_PER_DATASET,
      sort: [
        {
          created_at: {
            order: 'asc',
          },
        },
      ],
      query: {
        term: {
          dataset_id: datasetId,
        },
      },
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;
    if (total > MAX_EXAMPLES_PER_DATASET) {
      throw new Error(
        `Dataset "${datasetId}" has ${total} examples, exceeding the maximum of ${MAX_EXAMPLES_PER_DATASET}`
      );
    }

    return response.hits.hits
      .filter(
        (hit): hit is typeof hit & { _source: DatasetExampleStorageDocument; _id: string } =>
          Boolean(hit._source) && typeof hit._id === 'string'
      )
      .map((hit) => ({
        id: hit._id,
        ...hit._source,
      }));
  }

  private async getExampleById(exampleId: string): Promise<ExampleDocument | undefined> {
    const response = await this.examplesStorage.search({
      track_total_hits: false,
      size: 1,
      query: {
        term: {
          _id: exampleId,
        },
      },
    });

    const hit = response.hits.hits[0];
    if (!hit?._source || !hit._id) {
      return undefined;
    }

    return {
      id: hit._id,
      ...hit._source,
    };
  }

  private async getExampleDatasetId(exampleId: string): Promise<string | undefined> {
    const response = await this.examplesStorage.search({
      track_total_hits: false,
      size: 1,
      _source: ['dataset_id'],
      query: {
        term: {
          _id: exampleId,
        },
      },
    });

    return response.hits.hits[0]?._source?.dataset_id;
  }

  private async countExamplesByDatasetId(datasetId: string): Promise<number> {
    const response = await this.examplesStorage.search({
      track_total_hits: true,
      size: 0,
      query: {
        term: {
          dataset_id: datasetId,
        },
      },
    });

    return typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? 0;
  }

  /**
   * Counts examples for many datasets in a single request via a `terms`
   * aggregation. Used by the backfill to avoid one count search per dataset.
   * Datasets with no examples are absent from the result (callers default to 0).
   */
  private async countExamplesByDatasetIds(datasetIds: string[]): Promise<Map<string, number>> {
    if (datasetIds.length === 0) {
      return new Map();
    }

    const response = await this.examplesStorage.search({
      track_total_hits: false,
      size: 0,
      query: {
        terms: {
          dataset_id: datasetIds,
        },
      },
      aggs: {
        by_dataset_id: {
          terms: {
            field: 'dataset_id',
            size: datasetIds.length,
          },
        },
      },
    });

    const buckets =
      (
        response.aggregations?.by_dataset_id as
          | { buckets?: Array<{ key: string; doc_count: number }> }
          | undefined
      )?.buckets ?? [];

    const counts = new Map<string, number>();
    for (const bucket of buckets) {
      counts.set(bucket.key, bucket.doc_count);
    }
    return counts;
  }

  /**
   * Recomputes the denormalized `examples_count` for a dataset and writes it
   * back, optionally applying a metadata patch in the same write. By default
   * this also advances `updated_at` (a "touch"); pass `bumpUpdatedAt: false` to
   * refresh the count while preserving the timestamp. Recompute-after-write
   * (rather than incrementing) keeps the count correct even when duplicate
   * examples are skipped or writes race.
   *
   * The count is taken once rather than per attempt, since `mutate` is synchronous:
   * a retry can write a count another writer has moved past, which self-corrects on
   * the next example change.
   */
  private async touchDataset(
    datasetId: string,
    patch: DatasetPatch & { bumpUpdatedAt?: boolean } = {}
  ): Promise<void> {
    const { bumpUpdatedAt = true, ...metadata } = patch;
    const examplesCount = await this.countExamplesByDatasetId(datasetId);
    const updatedAt = bumpUpdatedAt ? new Date().toISOString() : undefined;

    await this.writeDatasetIfPresent(
      datasetId,
      (current) =>
        buildDatasetDocument(current, {
          ...metadata,
          examples_count: examplesCount,
          ...(updatedAt ? { updated_at: updatedAt } : {}),
        }),
      { tolerateConflict: isEmpty(metadata) }
    );
  }

  /**
   * Conditional read-modify-write that skips an already-deleted dataset instead of
   * resurrecting it, which is what these callers used to get from reading the
   * document before writing it back. Returns false when there was nothing to write.
   */
  private async writeDatasetIfPresent(
    datasetId: string,
    mutate: (current: DatasetStorageProperties) => DatasetStorageProperties,
    { tolerateConflict = false }: { tolerateConflict?: boolean } = {}
  ): Promise<boolean> {
    const exists = await this.datasetExists(datasetId);
    if (!exists) {
      return false;
    }

    try {
      await this.datasetWriter.readModifyWrite({ id: datasetId, mutate });
      return true;
    } catch (error) {
      if (tolerateConflict && isOccConflictError(error)) {
        this.logger?.warn(
          `Gave up refreshing dataset "${datasetId}" after repeated write conflicts; its example count may lag until the next change`
        );
        return true;
      }

      // A delete landing between the check above and the write makes the writer throw.
      // Existence is re-read rather than matching its message, which is untyped text:
      // a dataset that is genuinely gone is a miss, like one absent from the start.
      if (!(await this.datasetExists(datasetId))) {
        return false;
      }

      throw error;
    }
  }

  /**
   * Backfills the denormalized `examples_count` on datasets that predate the
   * field. Idempotent: only datasets missing the field are processed, so reruns
   * (and fresh/empty deployments) are no-ops. Intended to run once on plugin
   * start.
   *
   * Unlike the other write paths this one isn't version-checked, since bulk needs
   * per-item conflict handling. The exposure is a single start-up pass over
   * documents old enough to be missing the field, so an edit would have to land in
   * that window to be lost.
   */
  async backfillDatasetCounts(): Promise<{ updated: number }> {
    const batchSize = 100;
    let updated = 0;

    for (;;) {
      // Reads the whole document rather than a field projection: the rewrite
      // below replaces the document, so anything left out would be dropped.
      const response = await this.datasetsStorage.search({
        track_total_hits: false,
        size: batchSize,
        query: {
          bool: {
            must_not: [{ exists: { field: 'examples_count' } }],
          },
        },
      });

      const hits = response.hits.hits.filter(
        (hit): hit is typeof hit & { _source: DatasetStorageDocument; _id: string } =>
          Boolean(hit._source) && typeof hit._id === 'string'
      );

      if (hits.length === 0) {
        break;
      }

      const counts = await this.countExamplesByDatasetIds(hits.map((hit) => hit._id));

      const operations: Array<StorageClientBulkOperation<DatasetStorageDocument>> = hits.map(
        (hit) => ({
          index: {
            _id: hit._id,
            document: buildDatasetDocument(hit._source, {
              examples_count: counts.get(hit._id) ?? 0,
            }),
          },
        })
      );

      await this.datasetsStorage.bulk({ operations, refresh: 'wait_for', throwOnFail: true });
      updated += operations.length;
    }

    return { updated };
  }
}

/**
 * Escapes Elasticsearch wildcard metacharacters (`\`, `*`, `?`) so user input
 * is matched literally inside a `wildcard` query rather than interpreted.
 */
const escapeWildcard = (input: string): string => input.replace(/[\\*?]/g, (ch) => `\\${ch}`);

const MATURITY_FACET_SIZE = Object.keys(DatasetMaturityEnum).length;

interface DatasetPatch {
  description?: string;
  tags?: string[];
  maturity?: DatasetMaturity | null;
  examples_count?: number;
  updated_at?: string;
}

/**
 * Rebases a patch onto the current document, since the storage adapter can only
 * replace whole ones. Routing every write through here is what keeps fields the
 * caller didn't mention, such as tags on an example insert, from being dropped.
 * Empty tags and unset maturity are omitted rather than stored as `[]`/`null`.
 */
const buildDatasetDocument = (
  existing: DatasetStorageProperties,
  patch: DatasetPatch = {}
): DatasetStorageProperties => {
  const tags = patch.tags === undefined ? existing.tags : normalizeTags(patch.tags);
  const maturity = patch.maturity === undefined ? existing.maturity : patch.maturity;

  return {
    name: existing.name,
    description: patch.description ?? existing.description,
    examples_count: patch.examples_count ?? existing.examples_count ?? 0,
    created_at: existing.created_at,
    updated_at: patch.updated_at ?? existing.updated_at,
    ...(tags && tags.length > 0 ? { tags } : {}),
    ...(maturity ? { maturity } : {}),
  };
};

/**
 * Lowercases so `Golden` and `golden` don't become two facets, then trims, dedupes
 * and caps. Duplicates route validation to also cover callers that skip a route.
 */
const normalizeTags = (tags: string[]): string[] => {
  const normalized = new Set<string>();

  for (const tag of tags) {
    if (normalized.size === MAX_TAGS_PER_DATASET) {
      break;
    }
    const value = tag.trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
    if (value) {
      normalized.add(value);
    }
  }

  return Array.from(normalized);
};

const dedupe = <T>(values: T[]): T[] => Array.from(new Set(values));

const haveSameTags = (next: string[], current: string[] = []): boolean => {
  const normalized = normalizeTags(next);
  const currentTags = new Set(current);
  return normalized.length === currentTags.size && normalized.every((tag) => currentTags.has(tag));
};

interface TermsAggregation {
  buckets?: Array<{ key: string; doc_count: number }>;
}

const toFacetBuckets = (aggregation: TermsAggregation | undefined): DatasetFacetBucket[] =>
  (aggregation?.buckets ?? []).map(({ key, doc_count: count }) => ({ value: key, count }));

const parseFacets = (aggregations: Record<string, unknown> | undefined): DatasetFacets => {
  const scoped = (
    aggregations?.facets as
      | { scoped?: { tags?: TermsAggregation; maturity?: TermsAggregation } }
      | undefined
  )?.scoped;

  return {
    tags: toFacetBuckets(scoped?.tags),
    maturity: toFacetBuckets(scoped?.maturity),
  };
};

const EMPTY_EXAMPLE_METADATA = { description: 'empty-example' } as const;

const normalizeExample = (example: DatasetExampleInput): NormalizedExample => {
  const hasInput = example.input != null;
  const hasOutput = example.output != null;
  const hasMetadata = example.metadata != null;

  if (!hasInput && !hasOutput && !hasMetadata) {
    return { metadata: EMPTY_EXAMPLE_METADATA };
  }

  return {
    ...(hasInput ? { input: example.input } : {}),
    ...(hasOutput ? { output: example.output } : {}),
    ...(hasMetadata ? { metadata: omitBy(example.metadata!, isEmpty) } : {}),
  };
};

const summarizeBulkResult = (
  items: Array<{ index?: { status: number }; delete?: { status: number } }>
): {
  conflicts: number;
  failed: number;
} => {
  let conflicts = 0;
  let failed = 0;

  for (const item of items) {
    const status = item.index?.status ?? item.delete?.status;
    if (!status) {
      continue;
    }
    if (status === 409) {
      conflicts += 1;
      continue;
    }
    if (status >= 400) {
      failed += 1;
    }
  }

  return {
    conflicts,
    failed,
  };
};
