/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import pLimit from 'p-limit';
import {
  type IRulesManagementClient,
  type SignificantEventsRuleDefinition,
} from './rules/rules_management_client';
import { TIMESTAMP } from '../fields';
import { scheduleIntervalForQuery } from '../../significant_events/rules/schedule';

const RULE_INSTALL_CONCURRENCY = 10;

export function toRuleDefinition(queryLink: QueryLink): SignificantEventsRuleDefinition {
  const { query } = queryLink;
  return {
    name: query.title,
    streamName: queryLink.stream_name,
    timestampField: TIMESTAMP,
    esqlQuery: query.esql.query,
    schedule: {
      interval: scheduleIntervalForQuery(query),
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
