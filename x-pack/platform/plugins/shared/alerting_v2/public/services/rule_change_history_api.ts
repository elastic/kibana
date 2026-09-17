/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';
import { buildPath } from '@kbn/core-http-browser';
import type {
  ListRuleChangeHistoryResponse,
  RuleChangeHistoryDetail,
  RuleChangeHistoryListItem,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_RULE_CHANGE_HISTORY_API_PATH } from '../constants';

/** Re-exported from the shared schemas package for adapter/consumer convenience. */
export type { ListRuleChangeHistoryResponse, RuleChangeHistoryDetail, RuleChangeHistoryListItem };

/**
 * Encodes the `id` path parameter safely. Wraps `buildPath` so a single call
 * site owns the list template.
 */
const buildRuleChangeHistoryPath = (id: string): string =>
  buildPath(ALERTING_V2_RULE_CHANGE_HISTORY_API_PATH, { id });

/**
 * Encodes the `id` and `eventId` path parameters safely for the detail route.
 */
const buildRuleChangeHistoryEventPath = (id: string, eventId: string): string =>
  buildPath(`${ALERTING_V2_RULE_CHANGE_HISTORY_API_PATH}/{eventId}`, { id, eventId });

export interface ListRuleChangesParams {
  /** The rule identifier. */
  id: string;
  /** Page number (1-based). */
  page?: number;
  /** Number of results per page. */
  perPage?: number;
  signal?: AbortSignal;
}

export interface GetRuleChangeEventParams {
  /** The rule identifier. */
  id: string;
  /** The change-history event identifier (`event.id`). */
  eventId: string;
  signal?: AbortSignal;
}

/**
 * HTTP client for the Alerting V2 rule change-history read API. Backs the
 * `@kbn/change-history-ui` adapter; response DTOs are structurally compatible
 * with the package's `ChangeHistoryListItem` / `ChangeHistoryDetail`.
 */
@injectable()
export class RuleChangeHistoryApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async listRuleChanges({
    id,
    page,
    perPage,
    signal,
  }: ListRuleChangesParams): Promise<ListRuleChangeHistoryResponse> {
    return this.http.get<ListRuleChangeHistoryResponse>(buildRuleChangeHistoryPath(id), {
      query: { page, per_page: perPage },
      signal,
    });
  }

  public async getRuleChangeEvent({
    id,
    eventId,
    signal,
  }: GetRuleChangeEventParams): Promise<RuleChangeHistoryDetail> {
    return this.http.get<RuleChangeHistoryDetail>(buildRuleChangeHistoryEventPath(id, eventId), {
      signal,
    });
  }
}
