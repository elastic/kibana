/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger as KibanaLogger } from '@kbn/logging';
import { inject, injectable } from 'inversify';
import { Logger } from '@kbn/core-di';
import type {
  ChangeHistoryClient,
  LogChangeHistoryOptions,
  ObjectChange,
} from '@kbn/change-history';
import {
  RULE_CHANGES_HISTORY_DATASET,
  RULE_CHANGES_HISTORY_MODULE,
  RULE_CHANGES_HISTORY_OBJECT_TYPE,
} from './constants';
import { RuleChangesHistoryClientToken } from './tokens';
import type { LogRuleChangesParams, RuleChangesHistoryScope } from './types';

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

export interface RuleChangesHistoryServiceContract {
  initialize(elasticsearchClient: ElasticsearchClient): void;
  logRuleChanges(params: LogRuleChangesParams): Promise<void>;
}

@injectable()
export class RuleChangesHistoryService implements RuleChangesHistoryServiceContract {
  private readonly logger: KibanaLogger;
  private readonly scope: RuleChangesHistoryScope;
  private initAttempted = false;

  constructor(
    @inject(Logger) logger: KibanaLogger,
    @inject(RuleChangesHistoryClientToken) private readonly client: ChangeHistoryClient
  ) {
    this.scope = {
      module: RULE_CHANGES_HISTORY_MODULE,
      dataset: RULE_CHANGES_HISTORY_DATASET,
      objectType: RULE_CHANGES_HISTORY_OBJECT_TYPE,
    };
    this.logger = logger.get('rule_changes_history');
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
    if (entries.length === 0) {
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
      this.logger.warn(`Unable to log rule changes history for action "${action}": ${error}`);
    }
  }

  public initialize(elasticsearchClient: ElasticsearchClient): void {
    if (this.initAttempted) {
      return;
    }
    this.initAttempted = true;

    void this.client
      .initialize(elasticsearchClient)
      .then(() => {
        this.logger.info(
          `Rule changes history initialized for [${this.scope.module}, ${this.scope.dataset}]`
        );
      })
      .catch((cause) => {
        const error = new Error(
          `Unable to initialize rule changes history for [${this.scope.module}, ${this.scope.dataset}]`,
          { cause }
        );
        this.logger.error(error);
      });
  }
}
