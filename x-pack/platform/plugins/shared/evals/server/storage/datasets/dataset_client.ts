/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import { isEmpty, omitBy } from 'lodash';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  InternalIStorageClient,
  StorageClientBulkOperation,
  StorageIndexAdapter,
} from '@kbn/storage-adapter';
import { isResponseError } from '@kbn/es-errors';
import { OccWriter, isElasticsearchWriteConflict, isOccConflictError } from '@kbn/occ';
import type { OccDocument, OccMetadata } from '@kbn/occ';
import type { Logger } from '@kbn/logging';
import {
  DatasetMaturityEnum,
  MAX_DATASET_TAG_FACETS,
  MAX_EXAMPLES_PER_DATASET,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_DATASET,
  buildSpaceFilter,
  getDatasetId,
  type DatasetMaturity,
} from '@kbn/evals-common';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { DatasetStorageProperties } from './datasets_storage';
import { DatasetAlreadyExistsError } from './dataset_already_exists_error';
import { ExampleAlreadyExistsError } from './example_already_exists_error';
import { ExampleNotFoundError } from './example_not_found_error';
import { LastSpaceError } from './last_space_error';
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
  /** Spaces to assign the dataset to. Defaults to the client's own space. */
  spaceIds?: string[];
}

export interface UpsertDatasetInput {
  name: string;
  description: string;
  tags?: string[];
  maturity?: DatasetMaturity;
  examples: DatasetExampleInput[];
  /**
   * Spaces to assign on create. An upsert never reassigns an existing dataset,
   * so a CI run can't move one that other spaces are reading.
   */
  spaceIds?: string[];
}

/**
 * Fields a caller may change on an existing dataset. `undefined` leaves a field
 * as-is. An empty `tags` array or a `null` `maturity` clears it.
 */
export interface UpdateDatasetInput {
  description?: string;
  tags?: string[];
  maturity?: DatasetMaturity | null;
  /** Reassigns the dataset's spaces. Must be non-empty when provided. */
  spaceIds?: string[];
}

/**
 * Whether a delete removed the dataset or only detached it from one space.
 * `intent_mismatch` is the other one happening to a caller that said it only
 * meant this one.
 */
export type DatasetDeleteResult = 'deleted' | 'unshared' | 'not_found' | 'intent_mismatch';

/**
 * Which outcome the caller is asking for, when being handed the other one
 * instead would be a surprise: the UI offers "remove from this space" and
 * "delete permanently" as different actions, behind different confirmations,
 * decided from an assignment that may have moved on since it was read.
 */
export type DatasetDeleteIntent = 'unshare' | 'delete';

export interface DatasetDocument extends DatasetStorageProperties {
  id: string;
  // Normalized on read: legacy documents missing the stored field are
  // backfilled to 0, so callers can always rely on a number here.
  examples_count: number;
  // Normalized on read: an absent assignment resolves to the default space.
  space_ids: string[];
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

/**
 * Settles name lookups on the dataset that has held the name longest, so
 * anything predating the per-space name check still resolves the same way
 * every time.
 */
const OLDEST_FIRST = [{ created_at: { order: 'asc' as const } }];

/**
 * How many times a delete re-reads the dataset when its spaces change under it.
 * Each retry needs another write to have landed in between, so exhausting them
 * means contention no number of attempts would settle.
 */
const DELETE_MAX_ATTEMPTS = 3;

/**
 * How many derived ids a create tries before giving up. Each one it passes over
 * is held by a dataset of the same name that has moved out of this space, so
 * even a couple is more history than a name is likely to have.
 */
const MAX_DATASET_ID_GENERATIONS = 5;

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
  /** The space reads are narrowed to and writes are stamped with. */
  private readonly spaceId: string;
  private readonly spaceFilter: QueryDslQueryContainer;

  constructor({
    datasetsStorageAdapter,
    examplesStorageAdapter,
    logger,
    spaceId,
  }: {
    datasetsStorageAdapter: DatasetsStorageAdapter;
    examplesStorageAdapter: DatasetExamplesStorageAdapter;
    logger?: Logger;
    spaceId: string;
  }) {
    this.datasetsStorage = datasetsStorageAdapter.getClient();
    this.examplesStorage = examplesStorageAdapter.getClient();
    this.logger = logger;
    this.spaceId = spaceId;
    this.spaceFilter = buildSpaceFilter(spaceId);

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

  /**
   * Narrows a query to the client's space. Every read of a dataset goes through
   * this, apart from the name-conflict check, which has to see the datasets
   * this space cannot.
   */
  private scoped(query: QueryDslQueryContainer): QueryDslQueryContainer {
    return { bool: { must: [query], filter: [this.spaceFilter] } };
  }

  async create({
    name,
    description,
    tags,
    maturity,
    examples = [],
    spaceIds,
  }: CreateDatasetInput): Promise<DatasetWithExamples> {
    const activeSpaceId = this.spaceId;
    const targetSpaceIds = normalizeSpaceIds(spaceIds, activeSpaceId);
    const now = new Date().toISOString();

    if (await this.hasNameConflict(name, targetSpaceIds)) {
      throw new DatasetAlreadyExistsError(name);
    }

    const document = buildDatasetDocument(
      {
        name,
        description,
        created_at: now,
        updated_at: now,
        space_ids: targetSpaceIds,
      },
      { tags, maturity, examples_count: 0 }
    );

    const datasetId = await this.indexNewDataset({ name, targetSpaceIds, document });

    // A dataset is deleted document-first, so one whose delete died in between
    // could have left examples behind under an id this name derives again.
    await this.deleteExamplesByDatasetId(datasetId);

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

  /**
   * Writes a new dataset under the id its space and name derive, moving on to
   * the next derivation when one is held by a dataset that has since moved to
   * spaces this one cannot see.
   *
   * Every id a name can take is derived from it, so two creates of one name
   * compete for the same one and Elasticsearch decides between them. That is
   * what makes the name unique here: the search above can only report what was
   * indexed a refresh ago, and on its own would let both creates through.
   */
  private async indexNewDataset({
    name,
    targetSpaceIds,
    document,
  }: {
    name: string;
    targetSpaceIds: string[];
    document: DatasetStorageProperties;
  }): Promise<string> {
    for (let generation = 0; generation < MAX_DATASET_ID_GENERATIONS; generation++) {
      const datasetId = getDatasetId(this.spaceId, name, generation);

      try {
        await this.datasetsStorage.index({ id: datasetId, op_type: 'create', document });
        return datasetId;
      } catch (error) {
        if (!isResponseError(error) || error.statusCode !== 409) {
          throw error;
        }
      }

      const holder = await this.getAnyMetadata(datasetId);

      // Nothing to read at an id that just refused a write means the document
      // holding it is too new to search, and only this name derives that id. A
      // holder still going by the name where this one is headed is a duplicate
      // too; anything else has left the name free.
      if (
        !holder ||
        (holder.name === name && holder.space_ids.some((id) => targetSpaceIds.includes(id)))
      ) {
        throw new DatasetAlreadyExistsError(name);
      }
    }

    throw new Error(
      `Every id derived for dataset "${name}" is taken after ${MAX_DATASET_ID_GENERATIONS} attempts`
    );
  }

  async get(datasetId: string): Promise<DatasetWithExamples | undefined> {
    const dataset = await this.getMetadata(datasetId);
    if (!dataset) {
      return undefined;
    }

    const examples = await this.getExamplesByDatasetId(datasetId);

    return {
      ...dataset,
      examples,
    };
  }

  /**
   * Whether a dataset already holds `name` in any space the new one would show
   * up in. An id only encodes the space creating it, so the write itself catches
   * a name taken here but not one shared in from elsewhere, and names are how
   * the CLI and `_resolve` find a dataset. Unscoped on purpose: every target
   * space has to be covered, not just the one this client reads from.
   */
  private async hasNameConflict(
    name: string,
    spaceIds: string[],
    { excludeDatasetId }: { excludeDatasetId?: string } = {}
  ): Promise<boolean> {
    const matchesName: QueryDslQueryContainer = {
      bool: {
        must: [{ term: { name } }],
        filter: [{ bool: { should: spaceIds.map(buildSpaceFilter), minimum_should_match: 1 } }],
      },
    };

    const query: QueryDslQueryContainer = excludeDatasetId
      ? { bool: { must: [matchesName], must_not: [{ term: { _id: excludeDatasetId } }] } }
      : matchesName;

    const response = await this.datasetsStorage.search({
      track_total_hits: false,
      size: 1,
      _source: ['name'],
      query,
    });

    return response.hits.hits.length > 0;
  }

  /**
   * Refuses a reassignment that would leave two datasets of one name in a
   * space. Only the spaces it is joining are checked: a name that is already
   * ambiguous somewhere shouldn't block an unrelated edit.
   */
  private async assertNameFreeInNewSpaces(
    datasetId: string,
    nextSpaceIds: string[]
  ): Promise<void> {
    const current = await this.getMetadata(datasetId);
    if (!current) {
      return;
    }

    const currentSpaceIds = normalizeSpaceIds(current.space_ids);
    const joining = nextSpaceIds.filter((spaceId) => !currentSpaceIds.includes(spaceId));
    if (joining.length === 0) {
      return;
    }

    if (await this.hasNameConflict(current.name, joining, { excludeDatasetId: datasetId })) {
      throw new DatasetAlreadyExistsError(current.name);
    }
  }

  async datasetExists(datasetId: string): Promise<boolean> {
    const response = await this.datasetsStorage.search({
      track_total_hits: false,
      size: 1,
      _source: ['name'],
      query: this.scoped({
        term: {
          _id: datasetId,
        },
      }),
    });

    return response.hits.hits.length > 0;
  }

  async getByName(name: string): Promise<DatasetWithExamples | undefined> {
    const response = await this.datasetsStorage.search({
      track_total_hits: false,
      size: 1,
      sort: OLDEST_FIRST,
      query: this.scoped({
        term: {
          name,
        },
      }),
    });

    const hit = response.hits.hits[0];
    if (!hit?._source || !hit._id) {
      return undefined;
    }

    return this.get(hit._id);
  }

  /** Resolves a name to a dataset without loading its examples. */
  async resolveByName(name: string): Promise<DatasetDocument | undefined> {
    const response = await this.datasetsStorage.search({
      track_total_hits: false,
      size: 1,
      sort: OLDEST_FIRST,
      query: this.scoped({
        term: {
          name,
        },
      }),
    });

    const hit = response.hits.hits[0];
    if (!hit?._source || !hit._id) {
      return undefined;
    }

    return {
      id: hit._id,
      ...hit._source,
      examples_count: hit._source.examples_count ?? 0,
      space_ids: normalizeSpaceIds(hit._source.space_ids),
    };
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
      query: this.scoped(
        filters.length > 0 ? { bool: { must: [searchQuery], filter: filters } } : searchQuery
      ),
      // `global` escapes the request query so the facet counts aren't narrowed by
      // the tag/maturity filters, then `scoped` re-applies just the search term.
      // Otherwise selecting a tag would hide every tag it doesn't co-occur with.
      // The space filter is escaped too, so `scoped` puts that back as well.
      aggs: {
        facets: {
          global: {},
          aggs: {
            scoped: {
              filter: this.scoped(searchQuery),
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
        space_ids: normalizeSpaceIds(hit._source.space_ids),
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
    { spaceIds, ...updates }: UpdateDatasetInput
  ): Promise<DatasetWithExamples | undefined> {
    const updatedAt = new Date().toISOString();
    const nextSpaceIds = spaceIds ? normalizeSpaceIds(spaceIds, this.spaceId) : undefined;

    if (nextSpaceIds) {
      await this.assertNameFreeInNewSpaces(datasetId, nextSpaceIds);
    }

    const written = await this.writeDatasetIfPresent(datasetId, (current) =>
      buildDatasetDocument(current, {
        ...updates,
        ...(nextSpaceIds ? { space_ids: nextSpaceIds } : {}),
        updated_at: updatedAt,
      })
    );

    if (!written) {
      return undefined;
    }

    return this.get(datasetId);
  }

  /**
   * Removes the dataset from the caller's space: detaching it while other
   * spaces still share it, destroying it when the last one lets go.
   *
   * Which of the two happens is decided from the assignment, and both are
   * conditional on it not having moved since. A share landing mid-delete is
   * answered by detaching instead of destroying what the other space just took
   * on, and a concurrent detach by destroying rather than writing back the
   * spaces this call read. A caller that only meant one of the two says so, and
   * gets `intent_mismatch` rather than the other.
   */
  async delete(
    datasetId: string,
    { intent }: { intent?: DatasetDeleteIntent } = {}
  ): Promise<DatasetDeleteResult> {
    for (let attempt = 1; attempt <= DELETE_MAX_ATTEMPTS; attempt++) {
      const current = await this.getDatasetForWrite(datasetId);
      if (!current) {
        return 'not_found';
      }

      if (this.otherSpaceIds(current.source.space_ids).length > 0) {
        if (intent === 'delete') {
          return 'intent_mismatch';
        }

        const detached = await this.detachFromSpace(datasetId);
        if (detached !== 'last_space') {
          return detached;
        }

        // The other spaces let go while we were detaching, so there is nothing
        // left to leave it to.
        continue;
      }

      if (intent === 'unshare') {
        return 'intent_mismatch';
      }

      const destroyed = await this.destroyIfUnchanged(datasetId, current.occ);
      if (destroyed !== 'conflict') {
        return destroyed;
      }
    }

    throw new Error(
      `Could not delete dataset "${datasetId}": its spaces kept changing across ${DELETE_MAX_ATTEMPTS} attempts`
    );
  }

  /** The dataset's spaces other than the one being deleted from. */
  private otherSpaceIds(spaceIds: string[] | undefined): string[] {
    return normalizeSpaceIds(spaceIds).filter((spaceId) => spaceId !== this.spaceId);
  }

  /**
   * Drops the caller's space from the assignment, recomputing it from whatever
   * the conditional write finds so a retry can't restore a space that has since
   * let go.
   */
  private async detachFromSpace(
    datasetId: string
  ): Promise<Extract<DatasetDeleteResult, 'unshared' | 'not_found'> | 'last_space'> {
    try {
      const written = await this.writeDatasetIfPresent(datasetId, (dataset) => {
        const remaining = this.otherSpaceIds(dataset.space_ids);
        if (remaining.length === 0) {
          throw new LastSpaceError(datasetId);
        }

        return buildDatasetDocument(dataset, {
          space_ids: remaining,
          updated_at: new Date().toISOString(),
        });
      });

      return written ? 'unshared' : 'not_found';
    } catch (error) {
      if (error instanceof LastSpaceError) {
        return 'last_space';
      }

      throw error;
    }
  }

  /**
   * Deletes the dataset, provided it is still the one that was read. Its
   * examples go afterwards: a delete that loses the race has to leave the
   * surviving dataset whole.
   */
  private async destroyIfUnchanged(
    datasetId: string,
    occ: OccMetadata
  ): Promise<Extract<DatasetDeleteResult, 'deleted' | 'not_found'> | 'conflict'> {
    try {
      const response = await this.datasetsStorage.delete({
        id: datasetId,
        if_seq_no: occ.seqNo,
        if_primary_term: occ.primaryTerm,
      });

      if (response.result !== 'deleted') {
        return 'not_found';
      }
    } catch (error) {
      if (isElasticsearchWriteConflict(error)) {
        return 'conflict';
      }

      throw error;
    }

    await this.deleteExamplesByDatasetId(datasetId);
    return 'deleted';
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
    // Examples carry no space of their own, so an example is only reachable
    // through a dataset this space can see.
    if (!(await this.datasetExists(expectedDatasetId))) {
      throw new ExampleNotFoundError(exampleId);
    }

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
    if (!(await this.datasetExists(expectedDatasetId))) {
      throw new ExampleNotFoundError(exampleId);
    }

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
    spaceIds,
  }: UpsertDatasetInput): Promise<UpsertDatasetResult> {
    const existing = await this.getByName(name);

    if (!existing) {
      const created = await this.create({ name, description, tags, maturity, examples, spaceIds });
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
   * to send back. Separate from `getMetadata` so `seq_no_primary_term` can't be
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
      query: this.scoped({
        term: {
          _id: datasetId,
        },
      }),
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

  /**
   * The name and spaces of whatever holds an id, from any space. Only for
   * deciding whether an id is free to write to: what a dataset outside this
   * space contains is not this client's to read.
   */
  private async getAnyMetadata(
    datasetId: string
  ): Promise<{ name: string; space_ids: string[] } | undefined> {
    const response = await this.datasetsStorage.search({
      track_total_hits: false,
      size: 1,
      _source: ['name', 'space_ids'],
      query: { term: { _id: datasetId } },
    });

    const source = response.hits.hits[0]?._source;
    if (!source) {
      return undefined;
    }

    return { name: source.name, space_ids: normalizeSpaceIds(source.space_ids) };
  }

  /** A dataset without its examples, for callers that only need its metadata. */
  async getMetadata(datasetId: string): Promise<DatasetDocument | undefined> {
    const response = await this.datasetsStorage.search({
      track_total_hits: false,
      size: 1,
      query: this.scoped({
        term: {
          _id: datasetId,
        },
      }),
    });

    const hit = response.hits.hits[0];
    if (!hit?._source || !hit._id) {
      return undefined;
    }

    return {
      id: hit._id,
      ...hit._source,
      examples_count: hit._source.examples_count ?? 0,
      space_ids: normalizeSpaceIds(hit._source.space_ids),
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
  space_ids?: string[];
}

/**
 * Resolves the spaces a dataset belongs to. An absent assignment means the
 * default space, as it does for scores. An empty one would hide the dataset
 * everywhere, so it falls back rather than being stored.
 */
const normalizeSpaceIds = (
  spaceIds: string[] | undefined,
  fallback: string = DEFAULT_SPACE_ID
): string[] => {
  const normalized = dedupe((spaceIds ?? []).filter((spaceId) => spaceId.length > 0));

  if (normalized.length === 0) {
    return [fallback];
  }

  return normalized;
};

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
  // Writes replace the whole document, so dropping this would reset the dataset
  // to the default space on the next example insert.
  const spaceIds = patch.space_ids === undefined ? existing.space_ids : patch.space_ids;

  return {
    name: existing.name,
    description: patch.description ?? existing.description,
    examples_count: patch.examples_count ?? existing.examples_count ?? 0,
    created_at: existing.created_at,
    updated_at: patch.updated_at ?? existing.updated_at,
    ...(tags && tags.length > 0 ? { tags } : {}),
    ...(maturity ? { maturity } : {}),
    ...(spaceIds && spaceIds.length > 0 ? { space_ids: spaceIds } : {}),
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
