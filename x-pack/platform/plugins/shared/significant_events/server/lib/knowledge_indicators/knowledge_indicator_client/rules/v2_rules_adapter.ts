/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { ALERTING_V2_ERROR_CODES, type RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { compileMatchCountBreachQuery } from '../../../significant_events/rules/match_count_query_compiler';
import {
  METRIC_SERIES_GROUPING_FIELDS,
  METRIC_SERIES_RULE_TAG,
} from '../../../significant_events/rules/metric_series_contract';
import { getMetricSeriesRuleSchedule } from '../../../significant_events/rules/schedule';
import {
  STREAMS_RULE_STREAM_TAG_PREFIX,
  streamNameFromTag,
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

  async findStreamNamesWithOwnedRules(): Promise<string[]> {
    // Filters rules, not tags: matched rules return all their tags, so drop non-ownership ones below.
    const tags = await this.rulesClient.getTags({
      search: STREAMS_RULE_STREAM_TAG_PREFIX,
      kind: 'signal',
    });
    const streamNames = new Set<string>();
    for (const tag of tags) {
      const streamName = streamNameFromTag(tag);
      if (streamName) {
        streamNames.add(streamName);
      }
    }
    return [...streamNames];
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

function toV2BreachQuery(esqlQuery: string, timestampField: string): string {
  return compileMatchCountBreachQuery(esqlQuery, timestampField);
}

function toV2CommonBody(definition: SignificantEventsRuleDefinition) {
  const { every, lookback } = getMetricSeriesRuleSchedule();
  return {
    metadata: {
      name: definition.name,
      tags: [toStreamTag(definition.streamName), METRIC_SERIES_RULE_TAG],
    },
    time_field: definition.timestampField,
    schedule: {
      every,
      lookback,
    },
    grouping: { fields: [...METRIC_SERIES_GROUPING_FIELDS] },
    query: {
      format: 'standalone' as const,
      breach: { query: toV2BreachQuery(definition.esqlQuery, definition.timestampField) },
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
