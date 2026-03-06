/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monotonicFactory } from 'ulid';
import type {
  QueryDslQueryContainer,
  SearchTotalHits,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type DataStreamDefinition, DataStreamClient } from '@kbn/data-streams';
import type { ClientCreateRequest } from '@kbn/data-streams/src/types/es_api';
import type { Logger } from '@kbn/logging';
import { changeHistoryMappings } from './mappings';
import type {
  ChangeHistoryDocument,
  GetHistoryResult,
  LogChangeHistoryOptions,
  GetChangeHistoryOptions,
  ObjectChange,
} from './types';
import { sha256, standardDiffDocCalculation, maskSensitiveFields } from './utils';

const ulid = monotonicFactory();

const DEFAULT_RESULT_SIZE = 100;

type ChangeHistoryDataStreamClient = DataStreamClient<
  typeof changeHistoryMappings,
  ChangeHistoryDocument
> & { startDate: Date };

export interface IChangeHistoryClient {
  dataStreamName: string;
  isInitialized(): boolean;
  initialize(elasticsearchClient: ElasticsearchClient): void;
  log(change: ObjectChange, opts: LogChangeHistoryOptions): Promise<void>;
  logBulk(changes: ObjectChange[], opts: LogChangeHistoryOptions): Promise<void>;
  getHistory(
    objectType: string,
    objectId: string,
    opts?: GetChangeHistoryOptions
  ): Promise<GetHistoryResult>;
}

export class ChangeHistoryClient implements IChangeHistoryClient {
  private module: string;
  private dataset: string;
  private kibanaVersion: string;
  private logger: Logger;
  private client?: ChangeHistoryDataStreamClient;

  // Data stream name is `public` to allow calling code to also access it directly.
  public readonly dataStreamName: string;

  constructor({
    module,
    dataset,
    logger,
    kibanaVersion,
  }: {
    module: string;
    dataset: string;
    logger: Logger;
    kibanaVersion: string;
  }) {
    this.module = module;
    this.dataset = dataset;
    this.kibanaVersion = kibanaVersion;
    this.logger = logger;
    this.dataStreamName = `.kibana-change-history-${module}-${dataset}`;
  }

  /**
   * Check if the change tracking service is initialized.
   * @returns true if the change tracking service is initialized.
   */
  isInitialized() {
    return !!this.client;
  }

  /**
   * Initialize the change tracking service.
   * @param elasticsearchClient - The Elasticsearch client.
   * @returns A promise that resolves when the change tracking service is initialized.
   * @throws An error if the data stream is not initialized properly.
   */
  async initialize(elasticsearchClient: ElasticsearchClient) {
    // Step 1: Create data stream definition
    // TODO: What about ILM policy (defaults to none = keep forever)
    const mappings = { ...changeHistoryMappings };
    const now = new Date();
    const dataStream: DataStreamDefinition<typeof mappings> = {
      name: this.dataStreamName,
      version: 1,
      hidden: true,
      template: {
        _meta: { changeHistoryStartDate: now.toISOString() },
        priority: 100,
        mappings,
      },
    };

    // Step 2: Initialize data stream
    const client = (await DataStreamClient.initialize({
      dataStream,
      elasticsearchClient,
      logger: this.logger,
      lazyCreation: false,
    })) as ChangeHistoryDataStreamClient;

    if (!client) {
      const err = new Error(`Data stream not initialized: [${this.dataStreamName}]`);
      this.logger.error(err);
      throw err;
    }

    // Step 3: Get date history started
    try {
      const {
        data_streams: [{ _meta: meta }],
      } = await elasticsearchClient.indices.getDataStream({
        name: this.dataStreamName,
      });
      client.startDate = meta?.changeHistoryStartDate;
    } catch (err) {
      this.logger.warn('Unable to get change history start date');
    }

    // Step 4: Stash the client for later use
    this.client = client;
  }

  /**
   * Log a change for a single object.
   * @param change - The changes to object that was affected.
   * @param opts - The options for the change.
   * @returns A promise that resolves when the change is logged.
   * @throws An error if the data stream is not initialized, or if an error occurs while logging the change.
   */
  async log(change: ObjectChange, opts: LogChangeHistoryOptions) {
    return this.logBulk([change], opts);
  }

  /**
   * Log a bulk change for one or more objects.
   * @param changes - The changes to objects that were affected.
   * @param opts - The options for the bulk change.
   * @param opts.action - The action performed (`rule-create`, `rule-update`, `rule-delete`, etc.)
   * @param opts.username - Current login name for the user who performed the change.
   * @param opts.userProfileId - Optional user profile ID (auth realm). See Elastic User Profiles.
   * @param opts.spaceId - The ID of the space that the change belongs to.
   * @param opts.timestamp - Optional timestamp of the change.
   * @param opts.correlationId - Optional correlation ID for the bulk change.
   * @param opts.data - Optional data to merge into the change history document.
   * @param opts.ignoreFields - Optional fields to ignore in the diff calculation.
   * @param opts.maskFields - Optional "sensitive data" fields to mask instead of store in plain form.
   * @param opts.diffDocCalculation - Optional function to calculate the diff between the current and next state of the object.
   * @param opts.refresh - Optional indicator to force an ES refresh after changes (affects perfomance)
   * @returns A promise that resolves when the bulk change is logged.
   * @throws An error if the data stream is not initialized, or if an error occurs while logging the change.
   */
  async logBulk(changes: ObjectChange[], opts: LogChangeHistoryOptions) {
    const { module, dataset, client, kibanaVersion } = this;
    if (!client) {
      const err = new Error(`Data stream not initialized: [${this.dataStreamName}]`);
      this.logger.error(err);
      throw err;
    }
    const { username, userProfileId, spaceId: space, correlationId, refresh } = opts;
    const request: ClientCreateRequest<ChangeHistoryDocument> = { documents: [], space, refresh };

    for (const change of changes) {
      // Create document and populate
      const { id, objectType, objectId, index, timestamp, sequence } = change;
      const hash = sha256(JSON.stringify(change.after));
      const document = this.createDocument(id, timestamp, opts.data);
      document.user = { name: username, id: userProfileId };
      document.event = { ...document.event, module, dataset, action: opts.action };
      if (correlationId && !document.event.group) document.event.group = { id: correlationId };

      const fields = {} as { changed?: string[]; masked?: string[] };
      const { masked, snapshot } = maskSensitiveFields(change.after, opts.maskFields);
      fields.masked = masked;
      document.object = { id: objectId, type: objectType, index, hash, sequence, fields, snapshot };
      document.kibana = { space_id: space, version: kibanaVersion };

      // Do we have "before" state?
      // Perform diff using diffDocCalculation(), defaulted to standard if not passed in.
      if (change.before) {
        const diffCalc = opts.diffDocCalculation ?? standardDiffDocCalculation;
        try {
          const a = maskSensitiveFields(change.before, opts.maskFields);
          const { fieldChanges, oldvalues } = diffCalc({
            a: a.snapshot,
            b: snapshot,
            ignoreFields: opts.ignoreFields,
          });
          fields.masked = Array.from(new Set([...a.masked, ...fields.masked]));
          fields.changed = fieldChanges;
          document.object = { ...document.object, oldvalues };
        } catch (err) {
          // Uncalculated diff should not be fatal, just log and continue
          this.logger.error(new Error('Unable to calculate change history diff', { cause: err }));
        }
      }
      // Queue operations
      request.documents.push({ _id: document.event.id, ...document });
    }

    try {
      await client.create({ ...request });
    } catch (err) {
      const error = new Error(`Error saving change history: ${err}`, { cause: err });
      this.logger.error(error);
      throw error;
    }
  }

  /**
   * Get the change history of an object.
   * @param objectType - The type of the object.
   * @param objectId - The ID of the object.
   * @param opts - The options for the history query.
   * @param opts.additionalFilters - Additional filters to apply to the history query.
   * @param opts.sort - The sort order for the history query.
   * @param opts.from - The starting index for the history query.
   * @param opts.size - The number of results to return.
   * @param opts.transportOpts - Additional ES transport options
   * @returns The history of the object.
   * @throws An error if the data stream is not initialized, or if an error occurs while getting the history.
   */
  async getHistory(
    objectType: string,
    objectId: string,
    opts?: GetChangeHistoryOptions
  ): Promise<GetHistoryResult> {
    const client = this.client;
    if (!client) {
      throw new Error(`Data stream not initialized: [${this.dataStreamName}]`);
    }
    const filter: QueryDslQueryContainer[] = [
      { term: { 'object.type': objectType } },
      { term: { 'object.id': objectId } },
    ];
    if (opts?.additionalFilters) {
      filter.push(...opts.additionalFilters);
    }
    const defaultSort: SortCombinations[] = [
      { 'object.sequence': { order: 'desc', missing: 0 } }, // <-- If available, `sequence` ordering overrides timestamps.
      { '@timestamp': { order: 'desc' } },
      { 'event.id': { order: 'desc' } },
    ];
    const history = await client.search<Record<string, ChangeHistoryDocument>>({
      query: { bool: { filter } },
      sort: opts?.sort ?? defaultSort,
      size: opts?.size ?? DEFAULT_RESULT_SIZE,
      from: opts?.from,
    });
    return {
      startDate: client.startDate,
      total: Number((history.hits.total as SearchTotalHits)?.value) || 0,
      items: history.hits.hits.map((h) => h._source).filter((i) => !!i),
    };
  }

  private createDocument(
    eventId?: string,
    timestamp?: string,
    data?: Partial<ChangeHistoryDocument>
  ): ChangeHistoryDocument {
    const { event, metadata, tags } = data ?? {};
    return {
      '@timestamp': new Date(timestamp || Date.now()).toISOString(),
      event: {
        id: eventId || ulid(), // <-- ULIDs make 'same millisecond' event order deterministic (helps with integration tests)
        type: event?.type ?? 'change',
        outcome: event?.outcome ?? 'success',
        reason: event?.reason,
      },
      tags,
      metadata,
    } as ChangeHistoryDocument;
  }
}
