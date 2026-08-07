/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  eventType,
}: Pick<LogRuleChangesParams, 'eventType'>): LogChangeHistoryOptions['data'] | undefined {
  if (!eventType) {
    return undefined;
  }

  return { event: { type: eventType } } as LogChangeHistoryOptions['data'];
}

export interface RuleChangesHistoryServiceContract {
  logRuleChanges(params: LogRuleChangesParams): Promise<void>;
}

@injectable()
export class RuleChangesHistoryService implements RuleChangesHistoryServiceContract {
  private readonly logger: KibanaLogger;
  private readonly scope: RuleChangesHistoryScope;

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
      const data = buildLogChangeHistoryData({ eventType });

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
}
