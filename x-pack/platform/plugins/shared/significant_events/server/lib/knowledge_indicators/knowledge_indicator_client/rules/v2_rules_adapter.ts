/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { ALERTING_V2_ERROR_CODES, type RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { stripMetadata, deriveQueryType } from '@kbn/streams-schema';
import { QUERY_TYPE_STATS } from '@kbn/significant-events-schema';
import { MAX_ALERTS_PER_EXECUTION } from '../../../significant_events/rules/constants';
import { getRuleLookbackInterval } from '../../../significant_events/rules/schedule';
import {
  toStreamTag,
  type IRulesManagementClient,
  type SignificantEventsRuleDefinition,
} from './rules_management_client';

const FIND_PAGE_SIZE = 500;

/**
 * Wraps alerting_v2 `RulesClientApi` to implement IRulesManagementClient.
 *
 * create/update handle their own 409/404 fallbacks internally so QueryClient does not
 * need to know Alerting v2's retry semantics.
 *
 * Space context: the caller must obtain the client with the intended space
 * (SigEvents uses default space), matching the former HTTP client behavior.
 */
export class RulesAdapterV2 implements IRulesManagementClient {
  constructor(private readonly rulesClient: RulesClientApi) {}

  async createRule(id: string, definition: SignificantEventsRuleDefinition): Promise<void> {
    await this.rulesClient
      .createRule({ data: toV2CreateBody(definition), options: { id } })
      .catch((error) => {
        if (isBoom(error) && error.output.statusCode === 409) {
          return this.updateRule(id, definition);
        }
        throw error;
      });
  }

  async updateRule(id: string, definition: SignificantEventsRuleDefinition): Promise<void> {
    await this.rulesClient.updateRule({ id, data: toV2UpdateBody(definition) }).catch((error) => {
      if (isBoom(error) && error.output.statusCode === 404) {
        return this.createRuleWithoutFallback(id, definition);
      }
      throw error;
    });
  }

  async bulkDeleteRules(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { errors } = await this.rulesClient.bulkDeleteRules({ ids });
    const fatal = errors.filter((e) => e.error.code !== ALERTING_V2_ERROR_CODES.RULE_NOT_FOUND);
    if (fatal.length > 0) {
      const detail = fatal.map((e) => `${e.id}: ${e.error.message}`).join('; ');
      throw new Error(`V2 bulk delete failed for ${fatal.length} rule(s): ${detail}`);
    }
  }

  async findOwnedRuleIds(streamName: string): Promise<string[]> {
    const ids: string[] = [];
    let page = 1;
    while (true) {
      const result = await this.rulesClient.findRules({
        filter: `metadata.tags: "${toStreamTag(streamName)}"`,
        perPage: FIND_PAGE_SIZE,
        page,
      });
      for (const rule of result.items) {
        ids.push(rule.id);
      }
      if (result.items.length === 0 || ids.length >= result.total) break;
      page++;
    }
    return ids;
  }

  /**
   * Create variant used by `updateRule`'s 404 branch. A 409 here means a concurrent
   * writer (re)created the rule between our `updateRule` 404 and this create — that's
   * fine, the rule exists now. Swallowing keeps this terminal and prevents the
   * create→409→update→404→create cycle the method name promises to avoid.
   */
  private async createRuleWithoutFallback(
    id: string,
    definition: SignificantEventsRuleDefinition
  ): Promise<void> {
    await this.rulesClient
      .createRule({ data: toV2CreateBody(definition), options: { id } })
      .catch((error) => {
        if (isBoom(error) && error.output.statusCode === 409) {
          return;
        }
        throw error;
      });
  }
}

/**
 * v2 grouping fields for SigEvents MATCH queries.
 *
 * Each MATCH row corresponds to one source document; using `_id` makes the group hash
 * stable across overlapping evaluation windows (`lookback` is 2x `every`, so adjacent
 * runs see the same documents). Without explicit grouping, the per-row hash includes the
 * execution UUID and produces a fresh group on every run, which can emit duplicate signals
 * for one source document.
 *
 * The query passed to v2 retains `METADATA _id` (only `_source` is stripped) so that
 * `_id` is present as a column for v2's `buildGroupHash` to read.
 */
const V2_MATCH_GROUPING_FIELDS = ['_id'] as const;

const V2_QUERY_METADATA_TO_STRIP = ['_source'];

function assertMatchQuery(esqlQuery: string): void {
  if (deriveQueryType(esqlQuery) === QUERY_TYPE_STATS) {
    throw new Error(
      'STATS queries cannot be installed as v2 signal rules until rule-on-rule provisioning (#265778).'
    );
  }
}

function toV2BreachQuery(esqlQuery: string): string {
  assertMatchQuery(esqlQuery);
  const stripped = stripMetadata(esqlQuery, V2_QUERY_METADATA_TO_STRIP);
  return `${stripped.trimEnd()} | LIMIT ${MAX_ALERTS_PER_EXECUTION}`;
}

function toV2CommonBody(definition: SignificantEventsRuleDefinition) {
  return {
    metadata: {
      name: definition.name,
      tags: [toStreamTag(definition.streamName)],
    },
    time_field: definition.timestampField,
    schedule: {
      every: definition.schedule.interval,
      lookback: getRuleLookbackInterval(definition.schedule.interval),
    },
    grouping: { fields: [...V2_MATCH_GROUPING_FIELDS] },
    query: {
      format: 'standalone' as const,
      breach: { query: toV2BreachQuery(definition.esqlQuery) },
    },
  };
}

function toV2CreateBody(definition: SignificantEventsRuleDefinition) {
  return {
    kind: 'signal' as const,
    ...toV2CommonBody(definition),
  };
}

const toV2UpdateBody = toV2CommonBody;
