/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { ALERTING_ERROR_CODES, type RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import pLimit from 'p-limit';
import { compileMatchCountBreachQuery } from '../../../significant_events/rules/match_count_query_compiler';
import { withAllProjectsRouting } from '../../../significant_events/rules/project_routing';
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
const RULE_EXISTS_CONCURRENCY = 10;

export interface RulesAdapterV2Params {
  rulesClient: Pick<
    RulesClientApi,
    'createRule' | 'updateRule' | 'bulkDeleteRules' | 'findRules' | 'getTags' | 'ruleExists'
  >;
  isServerless: boolean;
}

/**
 * Internal getTags size for ownership-tag enumeration. The HTTP tags route stays
 * capped at 20 for typeahead; server-side consumers may request up to 10000.
 */
const OWNED_STREAM_TAGS_SIZE = 10000;

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
  private readonly rulesClient: RulesAdapterV2Params['rulesClient'];
  private readonly isServerless: boolean;

  constructor({ rulesClient, isServerless }: RulesAdapterV2Params) {
    this.rulesClient = rulesClient;
    this.isServerless = isServerless;
  }

  async createRule(id: string, definition: SignificantEventsRuleDefinition): Promise<void> {
    await this.rulesClient
      .createRule({
        data: toV2CreateBody({ definition, isServerless: this.isServerless }),
        options: { id },
      })
      .catch((error) => {
        if (isBoom(error) && error.output.statusCode === 409) {
          return this.updateRule(id, definition);
        }
        throw error;
      });
  }

  async updateRule(id: string, definition: SignificantEventsRuleDefinition): Promise<void> {
    await this.rulesClient
      .updateRule({ id, data: toV2UpdateBody({ definition, isServerless: this.isServerless }) })
      .catch((error) => {
        if (isBoom(error) && error.output.statusCode === 404) {
          return this.createRuleWithoutFallback(id, definition);
        }
        throw error;
      });
  }

  async bulkDeleteRules(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { errors } = await this.rulesClient.bulkDeleteRules({ ids });
    const fatal = errors.filter((e) => e.error.code !== ALERTING_ERROR_CODES.RULE_NOT_FOUND);
    if (fatal.length > 0) {
      const detail = fatal.map((e) => `${e.id}: ${e.error.message}`).join('; ');
      throw new Error(`V2 bulk delete failed for ${fatal.length} rule(s): ${detail}`);
    }
  }

  async findExistingRuleIds(ids: string[]): Promise<string[]> {
    const limit = pLimit(RULE_EXISTS_CONCURRENCY);
    const results = await Promise.all(
      ids.map((id) =>
        limit(async () => ({ id, exists: await this.rulesClient.ruleExists({ id }) }))
      )
    );

    return results.filter(({ exists }) => exists).map(({ id }) => id);
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
    // Prefix-search returns matching tag buckets (not rule documents). Non-ownership
    // tags are still filtered client-side in case the include pattern is broadened.
    const tags = await this.rulesClient.getTags({
      search: STREAMS_RULE_STREAM_TAG_PREFIX,
      kind: 'signal',
      size: OWNED_STREAM_TAGS_SIZE,
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
      .createRule({
        data: toV2CreateBody({ definition, isServerless: this.isServerless }),
        options: { id },
      })
      .catch((error) => {
        if (isBoom(error) && error.output.statusCode === 409) {
          return;
        }
        throw error;
      });
  }
}

interface ToV2BodyParams {
  definition: SignificantEventsRuleDefinition;
  isServerless: boolean;
}

function toV2BreachQuery({
  esqlQuery,
  timestampField,
  isServerless,
}: {
  esqlQuery: string;
  timestampField: string;
  isServerless: boolean;
}): string {
  const compiled = compileMatchCountBreachQuery(esqlQuery, timestampField);
  return isServerless ? withAllProjectsRouting(compiled) : compiled;
}

function toV2CommonBody({ definition, isServerless }: ToV2BodyParams) {
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
      breach: {
        query: toV2BreachQuery({
          esqlQuery: definition.esqlQuery,
          timestampField: definition.timestampField,
          isServerless,
        }),
      },
    },
  };
}

function toV2CreateBody({ definition, isServerless }: ToV2BodyParams) {
  return {
    kind: 'signal' as const,
    ...toV2CommonBody({ definition, isServerless }),
  };
}

const toV2UpdateBody = toV2CommonBody;
