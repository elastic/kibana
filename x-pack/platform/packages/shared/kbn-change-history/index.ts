/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  SearchTotalHits,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type DataStreamDefinition, DataStreamClient } from '@kbn/data-streams';
import type { ClientBulkOperation } from '@kbn/data-streams/src/types/es_api';
import type { Logger } from '@kbn/logging';
import crypto from 'node:crypto';
import { changeHistoryMappings } from './src/mappings';
import type {
  ChangeHistoryDocument,
  GetHistoryResult,
  LogChangeHistoryOptions,
  GetChangeHistoryOptions,
  ObjectChange,
} from './src/types';
import { standardDiffDocCalculation } from './src/utils';

export * from './src/types';

const MAX_RESULT_SIZE = 100;

type ChangeHistoryDataStreamClient = DataStreamClient<
  typeof changeHistoryMappings,
  ChangeHistoryDocument
> & { startDate: Date };

export interface IChangeHistoryClient {
  dataStreamName: string;
  isInitialized(): boolean;
  initialize(elasticsearchClient: ElasticsearchClient): void;
  log(change: ObjectChange, opts: LogChangeHistoryOptions): void;
  logBulk(changes: ObjectChange[], opts: LogChangeHistoryOptions): void;
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
  public dataStreamName: string;

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
   * @param opts.correlationId - The correlation ID for the bulk change.
   * @param opts.overrides - Optional overrides for the change history document.
   * @param opts.excludeFields - Optional fields to exclude from the diff calculation.
   * @param opts.diffDocCalculation - Optional function to calculate the diff between the current and next state of the object.
   * @returns A promise that resolves when the bulk change is logged.
   * @throws An error if the data stream is not initialized, or if an error occurs while logging the change.
   */
  async logBulk(changes: ObjectChange[], opts: LogChangeHistoryOptions) {
    this.logger.debug(
      `ChangeHistoryClient.logBulk(action: ${opts.action}, userId: ${opts.userId}, chages: ${changes.length})`
    );

    const correlationId =
      opts.correlationId ?? changes.length > 1 ? crypto.randomBytes(16).toString('hex') : undefined;
    const { module, dataset, client, kibanaVersion } = this;
    if (!client) {
      const err = new Error(`Data stream not initialized: [${this.dataStreamName}]`);
      this.logger.error(err);
      throw err;
    }
    const operations = [] as Array<ClientBulkOperation | ChangeHistoryDocument>;
    for (const change of changes) {
      // Create document
      const { id, type } = change;
      const hash = crypto.createHash('sha256').update(JSON.stringify(change.next)).digest('hex');
      const document = this.createDocument(opts.overrides);
      document.user = { ...document.user, id: opts.userId };
      document.event = { ...document.event, module, dataset, action: opts.action };
      if (correlationId && !document.event.group) document.event.group = { id: correlationId };
      document.object = { id, type, hash, snapshot: change.next };
      document.kibana = { ...document.kibana, space_id: opts.spaceId, version: kibanaVersion };
      // Do we have "before" state?
      // Perform diff using diffDocCalculation(), defaulted to standard if not passed in.
      if (change.current) {
        const diffCalc = opts.diffDocCalculation ?? standardDiffDocCalculation;
        const { fieldChanges, oldvalues } = diffCalc({
          a: change.current,
          b: change.next,
          excludeFields: opts.excludeFields,
        });
        document.object = { changes: fieldChanges, oldvalues, ...document.object };
      }
      // Queue operations
      operations.push({ create: { _id: document.event.id } });
      operations.push(document);
    }

    try {
      await client.bulk({ refresh: true, operations });
    } catch (err) {
      this.logger.error(new Error('Error saving change history', { cause: err }));
      throw err;
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
      { '@timestamp': { order: 'desc' } },
      { 'event.id': { order: 'desc' } },
    ];
    const history = await client.search<Record<string, ChangeHistoryDocument>>({
      query: { bool: { filter } },
      sort: opts?.sort ?? defaultSort,
      size: opts?.size ?? MAX_RESULT_SIZE,
      from: opts?.from,
    });
    return {
      startDate: client.startDate,
      total: Number((history.hits.total as SearchTotalHits)?.value) || 0,
      items: history.hits.hits.map((h) => h._source).filter((i) => !!i),
    };
  }

  private createDocument(overrides?: Partial<ChangeHistoryDocument>): ChangeHistoryDocument {
    const { event, kibana, metadata } = overrides ?? {};
    return {
      '@timestamp': new Date().toISOString(),
      event: {
        id: event?.id || crypto.randomBytes(15).toString('base64url'),
        type: event?.type ?? 'change',
        outcome: event?.outcome ?? 'success',
        reason: event?.reason,
      },
      kibana: {
        space_id: kibana?.space_id,
        version: kibana?.version,
      },
      metadata,
    } as ChangeHistoryDocument;
  }
}
