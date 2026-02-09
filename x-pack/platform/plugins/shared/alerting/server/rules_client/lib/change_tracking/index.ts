/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'node:crypto';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { RuleTypeSolution, ChangeTrackingAction } from '@kbn/alerting-types';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { type DataStreamDefinition, DataStreamClient } from '@kbn/data-streams';
import type { Logger } from '@kbn/logging';
import type { ClientBulkOperation } from '@kbn/data-streams/src/types/es_api';
import { RULE_SAVED_OBJECT_TYPE } from '../../..';
import type {
  ChangeHistoryDocument,
  RuleData,
  ChangeTrackingContext,
  GetHistoryResult,
} from './types';
import { changeHistoryMappings } from './mappings';
import { diffDocs } from './utils';

export * from './types';

type RulesDataStreamClient = DataStreamClient<
  typeof changeHistoryMappings,
  ChangeHistoryDocument
> & { startDate: Date };

const ALERTING_RULE_CHANGE_HISTORY_EXCLUSIONS = {
  executionStatus: false,
  monitoring: false,
  lastRun: false,
  nextRun: false,
};

export interface IChangeTrackingService {
  register(module: RuleTypeSolution): void;
  initialized(module: RuleTypeSolution): void;
  initialize(elasticsearchClient: ElasticsearchClient): void;
  logChange(
    action: ChangeTrackingAction,
    userId: string,
    ruleData: RuleData,
    spaceId: string,
    kibanaVersion: string,
    overrides?: Partial<ChangeHistoryDocument>
  ): void;
  logBulkChange(
    action: ChangeTrackingAction,
    userId: string,
    rules: RuleData[],
    spaceId: string,
    kibanaVersion: string,
    overrides?: Partial<ChangeHistoryDocument>
  ): void;
  getHistory(module: RuleTypeSolution, ruleId: string): Promise<GetHistoryResult>;
}

export class ChangeTrackingService implements IChangeTrackingService {
  private dataStreams: Record<RuleTypeSolution, RulesDataStreamClient>;
  private logger: Logger;
  private modules: RuleTypeSolution[];
  private dataset = 'alerting-rules';

  constructor(context: ChangeTrackingContext) {
    this.dataStreams = {} as Record<RuleTypeSolution, RulesDataStreamClient>;
    this.logger = context.logger;
    this.modules = [];
  }

  register(module: RuleTypeSolution) {
    if (!this.modules.includes(module)) {
      this.modules.push(module);
    }
  }

  initialized(module: RuleTypeSolution) {
    return !!this.dataStreams[module]?.existsIndex();
  }

  async initialize(elasticsearchClient: ElasticsearchClient) {
    this.logger.warn(`ChangeTrackingService.initialize(esClient)`);
    const { dataset } = this;
    for (const module of this.modules) {
      if (this.dataStreams[module]) continue;
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
      })) as RulesDataStreamClient;

      if (!client) {
        // TODO: Dont throw all the way up to the plugin.start().
        throw new Error('Client not initialized properly');
      }

      // Step 3: Get date history started
      client.startDate = now;
      try {
        const {
          data_streams: [{ _meta: meta }],
        } = await elasticsearchClient.indices.getDataStream({
          name: dataStreamName,
        });
        if (meta) client.startDate = meta?.changeHistoryStartDate;
      } catch (err) {
        this.logger.error('Unable to get change history start date');
      }

      // Step 4: Stash the client for later use
      this.dataStreams[module] = client;
    }
  }

  async logChange(
    action: ChangeTrackingAction,
    userId: string,
    ruleData: RuleData,
    spaceId: string,
    kibanaVersion: string,
    overrides?: Partial<ChangeHistoryDocument>
  ) {
    this.logBulkChange(action, userId, [ruleData], spaceId, kibanaVersion, overrides);
  }

  async logBulkChange(
    action: ChangeTrackingAction,
    userId: string,
    rules: RuleData[],
    spaceId: string,
    kibanaVersion: string,
    overrides?: Partial<ChangeHistoryDocument>
  ) {
    this.logger.warn(
      `ChangeTrackingService.logBulkChange(action: ${action}, userId: ${userId}, rules: ${rules.length})`
    );

    // Group operations per solution
    const transactionId = crypto.randomUUID();
    const groups = rules.reduce((result, ruleData) => {
      const { module } = ruleData;
      let operations = result.get(module);
      if (!operations) {
        result.set(module, (operations = []));
      }
      const { id, type } = ruleData;
      const hash = crypto.createHash('sha256').update(JSON.stringify(ruleData.next)).digest('hex');
      const document = this.createDocument(overrides);
      document.user = { ...document.user, id: userId };
      document.event = { ...document.event, module, action };
      if (!document.event.group && rules.length > 1) document.event.group = { id: transactionId };
      document.object = { id, type, hash, snapshot: ruleData.next };
      document.kibana = { ...document.kibana, space_id: spaceId, version: kibanaVersion };
      if (ruleData.current) {
        const { changes, oldvalues } = diffDocs(
          ruleData.current,
          ruleData.next,
          ALERTING_RULE_CHANGE_HISTORY_EXCLUSIONS
        );
        document.object = { changes, oldvalues, ...document.object };
      }
      operations.push({ create: { _id: document.event.id } });
      operations.push(document);
      return result;
    }, new Map<RuleTypeSolution, Array<ClientBulkOperation | ChangeHistoryDocument>>());

    // One bulk call per solution (security, observability, stack, etc.)
    // since each is using different data streams.
    for (const module of groups.keys()) {
      const client = this.dataStreams[module];
      const operations = groups.get(module);
      if (client && operations) {
        try {
          await client.bulk({ refresh: true, operations });
        } catch (err) {
          this.logger.error(new Error('Error saving change history', { cause: err }));
        }
      }
    }
  }

  async getHistory(module: RuleTypeSolution, ruleId: string): Promise<GetHistoryResult> {
    this.logger.warn(`ChangeTrackingService.getHistory(module: ${module}, ruleId: ${ruleId})`);
    const client = this.dataStreams[module];
    const type = RULE_SAVED_OBJECT_TYPE;
    if (!client) {
      throw new Error(`Data stream not found for module: ${module}`);
    }
    const history = await client.search<Record<string, ChangeHistoryDocument>>({
      query: {
        bool: { filter: [{ term: { 'object.id': ruleId } }, { term: { 'object.type': type } }] },
      },
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
