/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { ChangeHistoryClient, FLAGS } from '@kbn/change-history';
import type { LogChangeHistoryOptions, ObjectChange } from '@kbn/change-history';
import {
  RULE_CHANGE_HISTORY_DATASET,
  RULE_CHANGE_HISTORY_MODULE,
  RULE_CHANGE_HISTORY_OBJECT_TYPE,
} from './constants';
import type { LogRuleChangesParams, RuleChangeHistoryScope } from './types';

function buildLogChangeHistoryData({
  metadata,
  eventType,
}: Pick<LogRuleChangesParams, 'metadata' | 'eventType'>):
  | LogChangeHistoryOptions['data']
  | undefined {
  if (!metadata && !eventType) {
    return undefined;
  }

  return {
    ...(eventType ? { event: { type: eventType } } : {}),
    ...(metadata ? { metadata } : {}),
  } as LogChangeHistoryOptions['data'];
}

export interface RuleChangeHistoryServiceContract {
  getScope(): RuleChangeHistoryScope;
  isEnabled(): boolean;
  isInitialized(): boolean;
  initialize(elasticsearchClient: ElasticsearchClient): void;
  logRuleChanges(params: LogRuleChangesParams): Promise<void>;
}

export class RuleChangeHistoryService implements RuleChangeHistoryServiceContract {
  private readonly client: ChangeHistoryClient;
  private readonly logger: Logger;
  private readonly scope: RuleChangeHistoryScope;
  private initAttempted = false;

  constructor({ logger, kibanaVersion }: { logger: Logger; kibanaVersion: string }) {
    this.scope = {
      module: RULE_CHANGE_HISTORY_MODULE,
      dataset: RULE_CHANGE_HISTORY_DATASET,
      objectType: RULE_CHANGE_HISTORY_OBJECT_TYPE,
    };
    this.logger = logger.get('rule_change_history');
    this.client = new ChangeHistoryClient({
      module: this.scope.module,
      dataset: this.scope.dataset,
      logger: this.logger,
      kibanaVersion,
    });
  }

  public getScope(): RuleChangeHistoryScope {
    return this.scope;
  }

  public isEnabled(): boolean {
    return FLAGS.FEATURE_ENABLED;
  }

  public isInitialized(): boolean {
    return this.client.isInitialized();
  }

  public async logRuleChanges({
    spaceId,
    author,
    entries,
    action,
    timestamp = new Date(),
    metadata,
    eventType,
    correlationId,
  }: LogRuleChangesParams): Promise<void> {
    if (!this.isEnabled() || entries.length === 0) {
      return;
    }

    const changes: ObjectChange[] = entries.map(({ id, snapshot, sequence }) => ({
      objectType: this.scope.objectType,
      objectId: id,
      timestamp: new Date(timestamp).toISOString(),
      sequence,
      snapshot,
    }));

    try {
      const data = buildLogChangeHistoryData({ metadata, eventType });

      await this.client.logBulk(changes, {
        action,
        spaceId,
        username: author.username ?? '',
        userProfileId: author.uid ?? undefined,
        ...(correlationId ? { correlationId } : {}),
        ...(data ? { data } : {}),
      });
    } catch (error) {
      this.logger.warn(`Unable to log rule change history for action "${action}": ${error}`);
    }
  }

  public initialize(elasticsearchClient: ElasticsearchClient): void {
    if (!this.isEnabled() || this.initAttempted) {
      return;
    }
    this.initAttempted = true;

    void this.client
      .initialize(elasticsearchClient)
      .then(() => {
        this.logger.info(
          `Rule change history initialized for [${this.scope.module}, ${this.scope.dataset}]`
        );
      })
      .catch((cause) => {
        const error = new Error(
          `Unable to initialize rule change history for [${this.scope.module}, ${this.scope.dataset}]`,
          { cause }
        );
        this.logger.error(error);
      });
  }
}
