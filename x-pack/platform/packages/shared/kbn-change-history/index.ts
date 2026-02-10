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
  ObjectData,
} from './src/types';
import { standardDiffDocCalculation } from './src/utils';

export * from './src/types';

type ChangeHistoryDataStreamClient = DataStreamClient<
  typeof changeHistoryMappings,
  ChangeHistoryDocument
> & { startDate: Date };

// WARNING
// const ALERTING_RULE_CHANGE_HISTORY_EXCLUSIONS = {
//   executionStatus: false,
//   monitoring: false,
//   lastRun: false,
//   nextRun: false,
// };

export interface IChangeTrackingClient {
  initialize(elasticsearchClient: ElasticsearchClient): void;
  logChange(objectData: ObjectData, opts: LogChangeHistoryOptions): void;
  logBulkChange(objects: ObjectData[], opts: LogChangeHistoryOptions): void;
  getHistory(objectType: string, objectId: string): Promise<GetHistoryResult>;
}

export class ChangeTrackingClient implements IChangeTrackingClient {
  private client?: ChangeHistoryDataStreamClient;
  private logger: Logger;
  private module: string;
  private dataset: string;

  constructor(module: string, dataset: string, logger: Logger) {
    this.module = module;
    this.dataset = dataset;
    this.logger = logger;
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
    // TODO: "Generic" functionality should allow certain things:
    // - Override ILM policy (defaults to none = keep forever)
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
      // TODO: Dont throw all the way up to the plugin.start().
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
   * @param objectData - The object that was affected.
   * @param opts - The options for the change.
   * @param opts.action - The action that occurred.
   * @param opts.userId - The ID of the user who performed the action.
   * @param opts.spaceId - The ID of the space in which the action occurred.
   * @param opts.kibanaVersion - The version of Kibana.
   * @param opts.overrides - Optional overrides for the change history document.
   * @param opts.excludeFilter - Optional filter to exclude certain fields from the change history document.
   * @param opts.diffDocCalculation - Optional function to calculate the diff between the current and next state of the object.
   * @returns A promise that resolves when the change is logged.
   * @throws An error if the data stream is not initialized, or if an error occurs while logging the change.
   */
  async logChange(objectData: ObjectData, opts: LogChangeHistoryOptions) {
    return this.logBulkChange([objectData], opts);
  }

  /**
   * Log a bulk change for one or more objects.
   * @param objects - The objects that were affected.
   * @param opts - The options for the bulk change.
   * @param opts.action - The action that occurred.
   * @param opts.userId - The ID of the user who performed the action.
   * @param opts.spaceId - The ID of the space in which the action occurred.
   * @param opts.kibanaVersion - The version of Kibana.
   * @param opts.overrides - Optional overrides for the change history document.
   * @param opts.excludeFilter - Optional filter to exclude certain fields from the change history document.
   * @param opts.diffDocCalculation - Optional function to calculate the diff between the current and next state of the object.
   * @returns A promise that resolves when the bulk change is logged.
   * @throws An error if the data stream is not initialized, or if an error occurs while logging the change.
   */
  async logBulkChange(objects: ObjectData[], opts: LogChangeHistoryOptions) {
    this.logger.warn(
      `ChangeTrackingService.logBulkChange(action: ${opts.action}, userId: ${opts.userId}, rules: ${objects.length})`
    );

    const transactionId = crypto.randomUUID();
    const { module, dataset, client } = this;
    if (!client) {
      const err = new Error(`Data stream not initialized for ${module}-${dataset}`);
      this.logger.error(err);
      throw err;
    }
    const operations = [] as Array<ClientBulkOperation | ChangeHistoryDocument>;
    for (const objectData of objects) {
      // Create document
      const { id, type } = objectData;
      const hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(objectData.next))
        .digest('hex');
      const document = this.createDocument(opts.overrides);
      document.user = { ...document.user, id: opts.userId };
      document.event = { ...document.event, module, action: opts.action };
      if (!document.event.group && objects.length > 1) document.event.group = { id: transactionId };
      document.object = { id, type, hash, snapshot: objectData.next };
      document.kibana = { ...document.kibana, space_id: opts.spaceId, version: opts.kibanaVersion };
      // Do we have "before" state?
      // Perform diff using diffDocCalculation(), defaulted to standard if not passed in.
      if (objectData.current) {
        const diffCalc = opts.diffDocCalculation ?? standardDiffDocCalculation;
        const { changes, oldvalues } = diffCalc({
          a: objectData.current,
          b: objectData.next,
          excludeFilter: opts.excludeFilter,
        });
        document.object = { changes, oldvalues, ...document.object };
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
