/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { inject, injectable } from 'inversify';
import type { ChangeHistoryClient, ChangeHistoryDocument } from '@kbn/change-history';
import type {
  ListRuleChangeHistoryResponse,
  RuleChangeHistoryDetail,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import { RULE_CHANGES_HISTORY_OBJECT_TYPE } from './constants';
import { toDetail, toListItem } from './map_rule_change';
import { ChangeHistoryClientToken } from './tokens';

export interface ListRuleChangesArgs {
  ruleId: string;
  page: number;
  perPage: number;
}

export interface GetRuleChangeArgs {
  eventId: string;
}

export interface RuleChangesHistoryClientContract {
  listRuleChanges(args: ListRuleChangesArgs): Promise<ListRuleChangeHistoryResponse>;
  getRuleChange(args: GetRuleChangeArgs): Promise<RuleChangeHistoryDetail>;
}

@injectable()
export class RuleChangesHistoryClient implements RuleChangesHistoryClientContract {
  constructor(
    @inject(ChangeHistoryClientToken) private readonly changeHistory: ChangeHistoryClient,
    @inject(RequestSpaceIdToken) private readonly spaceId: string
  ) {}

  public async listRuleChanges({
    ruleId,
    page,
    perPage,
  }: ListRuleChangesArgs): Promise<ListRuleChangeHistoryResponse> {
    this.assertInitialized();

    // Over-fetch by one so each page row can be diffed against its immediate
    // predecessor without a second round trip. The extra entry is not returned.
    const result = await this.changeHistory.getHistory(
      this.spaceId,
      RULE_CHANGES_HISTORY_OBJECT_TYPE,
      ruleId,
      {
        from: (page - 1) * perPage,
        size: perPage + 1,
      }
    );

    const fetchedItems = result.items;
    const items = [];

    for (let i = 0; i < Math.min(perPage, fetchedItems.length); ++i) {
      items.push(
        toListItem(fetchedItems[i], fetchedItems[i + 1], {
          // Newest entry overall lives at page 1, index 0.
          isCurrent: page === 1 && i === 0,
        })
      );
    }

    return {
      items,
      total: result.total,
    };
  }

  public async getRuleChange({ eventId }: GetRuleChangeArgs): Promise<RuleChangeHistoryDetail> {
    this.assertInitialized();

    // `eventId` is a UUID and already unique across objects and types, so the
    // rule id is read from the document rather than supplied by the caller.
    const document = await this.changeHistory.getEvent(this.spaceId, eventId);

    // Other object types may share the module and dataset; they are not rule changes.
    if (!document || document.object.type !== RULE_CHANGES_HISTORY_OBJECT_TYPE) {
      throw Boom.notFound(`Rule change with event id "${eventId}" not found`, {
        code: ALERTING_ERROR_CODES.RULE_CHANGE_NOT_FOUND,
        details: { event_id: eventId },
      });
    }

    const ruleId = document.object.id;
    const [previous, newest] = await Promise.all([
      this.fetchPrevious(ruleId, document),
      this.fetchNewest(ruleId),
    ]);

    return toDetail(document, previous, {
      isCurrent: newest?.event.id === eventId,
    });
  }

  private async fetchPrevious(
    ruleId: string,
    document: ChangeHistoryDocument
  ): Promise<ChangeHistoryDocument | undefined> {
    const sequence = document.object.sequence;
    const additionalFilters =
      sequence !== undefined
        ? [{ range: { 'object.sequence': { lt: sequence } } }]
        : [{ range: { '@timestamp': { lt: document['@timestamp'] } } }];

    const { items } = await this.changeHistory.getHistory(
      this.spaceId,
      RULE_CHANGES_HISTORY_OBJECT_TYPE,
      ruleId,
      {
        additionalFilters,
        size: 1,
      }
    );

    return items[0];
  }

  private async fetchNewest(ruleId: string): Promise<ChangeHistoryDocument | undefined> {
    const { items } = await this.changeHistory.getHistory(
      this.spaceId,
      RULE_CHANGES_HISTORY_OBJECT_TYPE,
      ruleId,
      { from: 0, size: 1 }
    );
    return items[0];
  }

  private assertInitialized(): void {
    if (!this.changeHistory.isInitialized()) {
      throw Boom.serverUnavailable('Rule change history is unavailable', {
        code: ALERTING_ERROR_CODES.RULE_CHANGE_HISTORY_UNAVAILABLE,
      });
    }
  }
}
