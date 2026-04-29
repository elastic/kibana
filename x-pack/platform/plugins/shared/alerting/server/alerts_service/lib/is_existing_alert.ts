/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID } from '@kbn/rule-data-utils';

export interface IsExistingAlertParams {
  indices: string[];
  alertId: string;
  ruleId: string;
}

interface IsExistingAlertParamsWithDeps extends IsExistingAlertParams {
  logger: Logger;
  esClient: ElasticsearchClient;
}

export async function isExistingAlert({
  indices,
  alertId,
  ruleId,
  logger,
  esClient,
}: IsExistingAlertParamsWithDeps): Promise<boolean> {
  try {
    const response = await esClient.search({
      index: indices,
      allow_no_indices: true,
      size: 0,
      query: {
        bool: {
          must: [{ term: { [ALERT_RULE_UUID]: ruleId } }],
          filter: [{ term: { [ALERT_INSTANCE_ID]: alertId } }],
        },
      },
    });
    const total =
      response.hits.total == null
        ? 0
        : typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total.value;

    return total > 0;
  } catch (error) {
    logger.error(
      `Error checking for existing alert with alertId: ${alertId} and ruleId: ${ruleId} - ${error.message}`
    );
    return false;
  }
}
