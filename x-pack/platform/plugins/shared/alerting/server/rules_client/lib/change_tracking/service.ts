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
import type {
  ObjectChange,
  GetHistoryResult,
  LogChangeHistoryOptions,
  GetChangeHistoryOptions,
} from '@kbn/change-history';
import { ChangeHistoryClient } from '@kbn/change-history';
import {
  ALERTING_RULE_DATASET,
  ALERTING_RULE_CHANGE_HISTORY_IGNORE_FIELDS,
  ALERTING_RULE_CHANGE_HISTORY_SENSITIVE_FIELDS,
} from './constants';
import type { IChangeTrackingService, RuleChange } from '.';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';

export class ChangeTrackingService implements IChangeTrackingService {
  private clients: Record<RuleTypeSolution, ChangeHistoryClient>;
  private logger: Logger;
  private kibanaVersion: string;
  private modules: RuleTypeSolution[];
  private dataset = ALERTING_RULE_DATASET;

  constructor(logger: Logger, kibanaVersion: string) {
    this.clients = {} as Record<RuleTypeSolution, ChangeHistoryClient>;
    this.logger = logger.get('change_tracking');
    this.kibanaVersion = kibanaVersion;
    this.modules = [];
  }

  register(module: RuleTypeSolution) {
    if (this.modules.includes(module)) {
      return;
    }
    this.modules.push(module);
    const { dataset, logger, kibanaVersion } = this;
    const client = new ChangeHistoryClient({ module, dataset, logger, kibanaVersion });
    this.clients[module] = client;
    this.logger.debug(`Change tracking registered for [${module}, ${this.dataset}]`);
  }

  isInitialized(module: RuleTypeSolution) {
    return !!this.clients[module]?.isInitialized();
  }

  initialize(elasticsearchClient: ElasticsearchClient) {
    this.logger.debug(`Initializing change tracking..`);
    void this.initializeAll(elasticsearchClient).catch((cause) => {
      const error = new Error(
        `Unexpected failure initializing change tracking for [${this.dataset}]`,
        { cause }
      );
      this.logger.error(error);
    });
  }

  async initializeAll(elasticsearchClient: ElasticsearchClient) {
    // Initialize each change history client (in sequence - better than in parallel)
    for (const [module, client] of Object.entries(this.clients)) {
      try {
        await client.initialize(elasticsearchClient);
        this.logger.info(`Change tracking initialized for [${module}, ${this.dataset}]`);
      } catch (cause) {
        const error = new Error(
          `Unable to initialize change tracking for [${module}, ${this.dataset}]`,
          { cause }
        );
        this.logger.error(error);
      }
    }
  }

  async log(change: RuleChange, opts: LogChangeHistoryOptions) {
    return this.logBulk([change], opts);
  }

  async logBulk(changes: RuleChange[], opts: LogChangeHistoryOptions) {
    // Group rule changes per solution
    const correlationId = crypto.randomBytes(16).toString('hex');
    const groups = changes.reduce((result, change) => {
      const { objectId, objectType, before, after, module } = change;
      let objects = result.get(module);
      if (!objects) {
        result.set(module, (objects = []));
      }
      objects.push({ objectType, objectId, before, after });
      return result;
    }, new Map<RuleTypeSolution, ObjectChange[]>());

    // One bulk call per solution (security, observability, stack, etc.)
    // since each is using different data streams.
    for (const module of groups.keys()) {
      const client = this.clients[module];
      const groupedChanges = groups.get(module);
      const count = groupedChanges?.length ?? 0;
      if (!client) {
        const error = new Error(
          `Unable to log changes. Change history client not initialized for [${module}, ${this.dataset}] correlationId=${correlationId}; dropped ${count} change(s)`
        );
        this.logger.warn(error);
        continue;
      }
      if (groupedChanges) {
        try {
          await client.logBulk(groupedChanges, {
            ...opts,
            correlationId,
            fieldsToIgnore: ALERTING_RULE_CHANGE_HISTORY_IGNORE_FIELDS,
            fieldsToHash: ALERTING_RULE_CHANGE_HISTORY_SENSITIVE_FIELDS,
          });
          this.logger.trace(
            `Logged ${groupedChanges.length} change/s to history stream for [${module}, ${this.dataset}] correlationId=${correlationId}`
          );
        } catch (err) {
          // Just catch the error.
          const error = new Error(
            `Error saving change history for [${module}, ${this.dataset}], missing ${count} change(s) with correlationId=${correlationId}: ${err}`,
            { cause: err }
          );
          this.logger.error(error);
        }
      }
    }
  }

  async getHistory(
    module: RuleTypeSolution,
    spaceId: string,
    ruleId: string,
    opts: GetChangeHistoryOptions
  ): Promise<GetHistoryResult> {
    const client = this.clients[module];
    if (!client) {
      const error = new Error(
        `Unable to get history. Change history client not initialized for [${module}, ${this.dataset}]`
      );
      this.logger.warn(error.message);
      throw error;
    }
    return client.getHistory(spaceId, RULE_SAVED_OBJECT_TYPE, ruleId, opts);
  }
}
