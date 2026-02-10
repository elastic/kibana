/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'node:crypto';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { RuleTypeSolution } from '@kbn/alerting-types';
import type { Logger } from '@kbn/logging';
import type { ObjectChange, GetHistoryResult, LogChangeHistoryOptions } from '@kbn/change-history';
import type { SavedObjectReference } from '@kbn/core/server';
import { ChangeHistoryClient } from '@kbn/change-history';
import type { RawRule } from '../../../types';
import { RULE_SAVED_OBJECT_TYPE } from '../../..';

const ALERTING_RULE_CHANGE_HISTORY_EXCLUSIONS = {
  executionStatus: false,
  monitoring: false,
  lastRun: false,
  nextRun: false,
};

const ALERTING_RULE_CHANGE_HISTORY_SENSITIVE_FIELDS = {
  params: { apiKey: true },
};

export interface RuleChange extends ObjectChange {
  module: RuleTypeSolution;
  current?: RawRule;
  next: RawRule;
  currentReferences?: [] | SavedObjectReference[];
  nextReferences?: [] | SavedObjectReference[];
}

export interface IChangeTrackingService {
  register(module: RuleTypeSolution): void;
  initialized(module: RuleTypeSolution): void;
  initialize(elasticsearchClient: ElasticsearchClient): void;
  log(change: RuleChange, opts: LogChangeHistoryOptions): void;
  logBulk(changes: RuleChange[], opts: LogChangeHistoryOptions): void;
  getHistory(module: RuleTypeSolution, ruleId: string): Promise<GetHistoryResult>;
}

export class ChangeTrackingService implements IChangeTrackingService {
  private clients: Record<RuleTypeSolution, ChangeHistoryClient>;
  private logger: Logger;
  private kibanaVersion: string;
  private modules: RuleTypeSolution[];
  private dataset = 'alerting-rules';

  constructor(logger: Logger, kibanaVersion: string) {
    this.clients = {} as Record<RuleTypeSolution, ChangeHistoryClient>;
    this.logger = logger;
    this.kibanaVersion = kibanaVersion;
    this.modules = [];
  }

  register(module: RuleTypeSolution) {
    if (!this.modules.includes(module)) {
      this.modules.push(module);
    }
  }

  initialized(module: RuleTypeSolution) {
    return !!this.clients[module]?.isInitialized();
  }

  async initialize(elasticsearchClient: ElasticsearchClient) {
    this.logger.warn(`ChangeTrackingService.initialize(esClient)`);
    const { dataset, logger, kibanaVersion } = this;
    for (const module of this.modules) {
      if (this.clients[module]) continue;

      // Initialize the change history client
      const client = new ChangeHistoryClient({ module, dataset, logger, kibanaVersion });
      client.initialize(elasticsearchClient);

      if (!client.isInitialized()) {
        // TODO: Dont throw all the way up to the plugin.start().
        const error = new Error('Change history client not initialized properly');
        this.logger.error(error);
      }

      // Step 4: Stash the client for later use
      this.clients[module] = client;
    }
  }

  async log(change: RuleChange, opts: LogChangeHistoryOptions) {
    return this.logBulk([change], opts);
  }

  async logBulk(changes: RuleChange[], opts: LogChangeHistoryOptions) {
    this.logger.warn(
      `ChangeTrackingService.logBulkChange(action: ${opts.action}, userId: ${opts.userId}, changes: ${changes.length})`
    );

    // Group rule changes per solution
    const correlationId = crypto.randomBytes(16).toString('hex');
    const groups = changes.reduce((result, change) => {
      const { id, type, current, next, module } = change;
      let objects = result.get(module);
      if (!objects) {
        result.set(module, (objects = []));
      }
      // TODO: Dont forget `references`, these are kept separate in the SOs
      objects.push({ id, type, current, next });
      return result;
    }, new Map<RuleTypeSolution, ObjectChange[]>());

    // One bulk call per solution (security, observability, stack, etc.)
    // since each is using different data streams.
    for (const module of groups.keys()) {
      const client = this.clients[module];
      const groupedChanges = groups.get(module);
      if (client && groupedChanges) {
        try {
          await client.logBulk(groupedChanges, {
            ...opts,
            correlationId,
            excludeFields: ALERTING_RULE_CHANGE_HISTORY_EXCLUSIONS,
            sensitiveFields: ALERTING_RULE_CHANGE_HISTORY_SENSITIVE_FIELDS,
          });
        } catch (err) {
          this.logger.error(new Error('Error saving change history', { cause: err }));
        }
      }
    }
  }

  async getHistory(module: RuleTypeSolution, ruleId: string): Promise<GetHistoryResult> {
    this.logger.warn(`ChangeTrackingService.getHistory(module: ${module}, ruleId: ${ruleId})`);
    const client = this.clients[module];
    if (!client) {
      const error = new Error('Change history client not initialized properly');
      this.logger.error(error);
      throw error;
    }
    return client.getHistory(RULE_SAVED_OBJECT_TYPE, ruleId);
  }
}
