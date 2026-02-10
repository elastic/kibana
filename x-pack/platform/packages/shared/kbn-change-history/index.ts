/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
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
  ObjectChange,
} from './src/types';
import { standardDiffDocCalculation } from './src/utils';

export * from './src/types';

type ChangeHistoryDataStreamClient = DataStreamClient<
  typeof changeHistoryMappings,
  ChangeHistoryDocument
> & { startDate: Date };

export interface IChangeHistoryClient {
  isInitialized(): boolean;
  initialize(elasticsearchClient: ElasticsearchClient): void;
  log(change: ObjectChange, opts: LogChangeHistoryOptions): void;
  logBulk(changes: ObjectChange[], opts: LogChangeHistoryOptions): void;
  getHistory(objectType: string, objectId: string): Promise<GetHistoryResult>;
}

export class ChangeHistoryClient implements IChangeHistoryClient {
  private client?: ChangeHistoryDataStreamClient;
  private logger: Logger;
  private module: string;
  private dataset: string;
  private kibanaVersion: string;

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
    const { module, dataset } = this;
    const dataStreamName = `.kibana-change-history-${module}-${dataset}`;

    // Step 1: Create data stream definition
    // TODO: What about ILM policy (defaults to none = keep forever)
    const mappings = { ...changeHistoryMappings };
    const now = new Date();
    const dataStream: DataStreamDefinition<typeof mappings> = {
      name: dataStreamName,
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
      const err = new Error('Client not initialized properly');
      this.logger.error(err);
      throw err;
    }

    // Step 3: Get date history started
    try {
      const {
        data_streams: [{ _meta: meta }],
      } = await elasticsearchClient.indices.getDataStream({
        name: dataStreamName,
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
      const err = new Error(`Data stream not initialized for ${module}-${dataset}`);
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
      document.event = { ...document.event, module, action: opts.action };
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
   * @param additionalFilters - Additional DSL filters to apply to the history search.
   * @returns The history of the object.
   * @throws An error if the data stream is not initialized, or if an error occurs while getting the history.
   */
  async getHistory(
    objectType: string,
    objectId: string,
    additionalFilters?: QueryDslQueryContainer[]
  ): Promise<GetHistoryResult> {
    this.logger.warn(
      `ChangeTrackingService.getHistory(objectType: ${objectType}, objectId: ${objectId})`
    );
    const client = this.client;
    if (!client) {
      throw new Error(`Data stream not found for module: ${module}`);
    }
    const filter = [
      { term: { 'object.id': objectId } },
      { term: { 'object.type': objectType } },
      ...(additionalFilters ?? []),
    ];
    const history = await client.search<Record<string, ChangeHistoryDocument>>({
      query: { bool: { filter } },
      sort: [{ '@timestamp': { order: 'desc' } }],
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
        dataset: this.dataset,
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
