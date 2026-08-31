/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_NAME_LENGTH } from '@kbn/alerting-v2-schemas';
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

/**
 * KI titles are uncapped but Alerting v2 rejects a `metadata.name` over
 * {@link MAX_NAME_LENGTH}, so a long title would 400 on rule creation — and
 * {@link installQueries} runs as a `Promise.all`, taking the rest of the batch
 * with it. Trim the title, never the suffix: the suffix is how these rules are
 * recognised as metric-series rules.
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

export async function installQueries(
  client: IRulesManagementClient,
  queriesToCreate: QueryLink[],
  queriesToUpdate: QueryLink[]
) {
  const limiter = pLimit(RULE_INSTALL_CONCURRENCY);

  await Promise.all([
    ...queriesToCreate.map((queryLink) =>
      limiter(() => client.createRule(queryLink.rule_id, toRuleDefinition(queryLink)))
    ),
    ...queriesToUpdate.map((queryLink) =>
      limiter(() => client.updateRule(queryLink.rule_id, toRuleDefinition(queryLink)))
    ),
  ]);
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

  await client.bulkDeleteRules(ruleIds);
}
