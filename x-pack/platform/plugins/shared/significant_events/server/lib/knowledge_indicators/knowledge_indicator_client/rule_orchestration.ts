/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BULK_ITEMS, MAX_NAME_LENGTH } from '@kbn/alerting-v2-schemas';
import type { QueryLink } from '@kbn/significant-events-schema';
import pLimit from 'p-limit';
import {
  type IRulesManagementClient,
  type SignificantEventsRuleDefinition,
} from './rules/rules_management_client';
import { TIMESTAMP } from '../fields';
import { METRIC_SERIES_RULE_NAME_SUFFIX } from '../../significant_events/rules/metric_series_contract';
import { getMetricSeriesRuleSchedule } from '../../significant_events/rules/schedule';

const RULE_INSTALL_CONCURRENCY = 10;

export class InstallQueriesError extends Error {
  constructor(
    public readonly cause: Error,
    public readonly createdIds: string[]
  ) {
    super(cause.message);
    this.name = 'InstallQueriesError';
  }
}

/**
 * KI titles are uncapped but Alerting v2 rejects a `metadata.name` over
 * {@link MAX_NAME_LENGTH}, so a long title would fail rule creation. Trim the
 * title, never the suffix: the suffix is how these rules are recognised as
 * metric-series rules.
 */
function toRuleName(title: string): string {
  const maxTitleLength = MAX_NAME_LENGTH - METRIC_SERIES_RULE_NAME_SUFFIX.length;
  return `${title.slice(0, maxTitleLength)}${METRIC_SERIES_RULE_NAME_SUFFIX}`;
}

export function toRuleDefinition(queryLink: QueryLink): SignificantEventsRuleDefinition {
  const { query } = queryLink;
  const { every } = getMetricSeriesRuleSchedule();
  return {
    name: toRuleName(query.title),
    streamName: queryLink.stream_name,
    timestampField: TIMESTAMP,
    esqlQuery: query.esql.query,
    schedule: {
      interval: every,
    },
  };
}

// Splits into chunks of up to maxItems, rebalancing the last two to avoid a singleton tail (which gets no jitter from bulkSchedule).
function partitionForBulk<T>(items: T[], maxItems: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += maxItems) {
    chunks.push(items.slice(index, index + maxItems));
  }

  if (chunks.length < 2 || chunks[chunks.length - 1]?.length !== 1) {
    return chunks;
  }

  const tailStart = (chunks.length - 2) * maxItems;
  const tail = items.slice(tailStart);
  const midpoint = Math.ceil(tail.length / 2);
  chunks.splice(chunks.length - 2, 2, tail.slice(0, midpoint), tail.slice(midpoint));
  return chunks;
}

export async function installQueries(
  client: IRulesManagementClient,
  queriesToCreate: QueryLink[],
  queriesToUpdate: QueryLink[]
): Promise<{ createdIds: string[] }> {
  const createdIds: string[] = [];

  if (queriesToCreate.length > 0) {
    const rules = queriesToCreate.map((queryLink) => ({
      id: queryLink.rule_id,
      definition: toRuleDefinition(queryLink),
    }));
    try {
      for (const chunk of partitionForBulk(rules, MAX_BULK_ITEMS)) {
        const { createdIds: chunkIds } = await client.bulkCreateRules(chunk);
        createdIds.push(...chunkIds);
      }
    } catch (error) {
      throw new InstallQueriesError(error instanceof Error ? error : new Error(String(error)), createdIds);
    }
  }

  if (queriesToUpdate.length > 0) {
    const limiter = pLimit(RULE_INSTALL_CONCURRENCY);
    await Promise.all(
      queriesToUpdate.map((queryLink) =>
        limiter(() => client.updateRule(queryLink.rule_id, toRuleDefinition(queryLink)))
      )
    );
  }

  return { createdIds };
}

export async function uninstallQueries(
  client: IRulesManagementClient,
  queries: QueryLink[]
): Promise<void> {
  if (queries.length === 0) {
    return;
  }

  const ruleIds = queries.map((q) => q.rule_id);
  if (ruleIds.length === 0) {
    return;
  }

  for (const chunk of partitionForBulk(ruleIds, MAX_BULK_ITEMS)) {
    await client.bulkDeleteRules(chunk);
  }
}
