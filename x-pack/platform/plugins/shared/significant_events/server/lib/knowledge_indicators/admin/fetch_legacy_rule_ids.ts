/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../data_stream';
import { QUERY_RULE_BACKED, QUERY_RULE_ID } from '../fields';
import { REVISION_SIZE_LIMIT } from '../knowledge_indicator_client/revision_reader';
import { esqlToObjects } from '../../significant_events/latest_source_query';
import { runEsqlQuery } from '../../significant_events/run_esql_query';

/**
 * Every rule id ever recorded on a rule-backed query revision, across all
 * spaces and including legacy `stream.name` documents. This is the one KI read
 * that is deliberately not space-scoped: the cluster-wide `_reset` route uses it
 * to delete Significant Events v1 rules before wiping the data stream.
 */
export async function fetchLegacyRuleIds(
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<string[]> {
  const query = esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM]).where`${esql.col(
    QUERY_RULE_BACKED
  )} == true AND ${esql.col(QUERY_RULE_ID)} IS NOT NULL`
    .pipe`STATS __count = COUNT(*) BY ruleId = ${esql.col(QUERY_RULE_ID)}`
    .keep('ruleId')
    .limit(REVISION_SIZE_LIMIT);

  const response = await runEsqlQuery(esClient, query.print('basic'));
  if (!response) {
    return [];
  }

  const rows = esqlToObjects<{ ruleId?: unknown }>(response);
  if (rows.length >= REVISION_SIZE_LIMIT) {
    logger.warn(
      `Cluster-wide rule id enumeration hit REVISION_SIZE_LIMIT (${REVISION_SIZE_LIMIT}); some legacy rules may not be deleted by this reset.`
    );
  }

  return rows.map((row) => row.ruleId).filter((id): id is string => typeof id === 'string');
}
