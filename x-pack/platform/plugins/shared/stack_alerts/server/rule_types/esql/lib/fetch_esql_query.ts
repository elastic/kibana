/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAggregationResults } from '@kbn/triggers-actions-ui-plugin/common';
import type { PublicRuleResultService } from '@kbn/alerting-plugin/server/types';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import type { EsqlTable } from '../../../../common';
import { getEsqlQueryHits } from '../../../../common';
import type { OnlyEsqlQueryRuleParams } from '../types';

export interface FetchEsqlQueryOpts {
  ruleId: string;
  alertLimit: number | undefined;
  params: OnlyEsqlQueryRuleParams;
  spacePrefix: string;
  services: {
    logger: Logger;
    scopedClusterClient: IScopedClusterClient;
    share: SharePluginStart;
    ruleResultService?: PublicRuleResultService;
  };
  dateStart: string;
  dateEnd: string;
}

export async function fetchEsqlQuery({
  ruleId,
  alertLimit,
  params,
  services,
  spacePrefix,
  dateStart,
  dateEnd,
}: FetchEsqlQueryOpts) {
  const { logger, scopedClusterClient, ruleResultService } = services;
  const esClient = scopedClusterClient.asCurrentUser;
  const query = getEsqlQuery(params, alertLimit);

  logger.debug(() => `ES|QL query rule (${ruleId}) query: ${JSON.stringify(query)}`);

  let response: EsqlTable;
  try {
    response = await esClient.transport.request<EsqlTable>({
      method: 'POST',
      path: '/_query',
      body: query,
    });
  } catch (e) {
    if (e.message?.includes('verification_exception')) {
      throw createTaskRunError(e, TaskErrorSource.USER);
    }
    throw e;
  }

  const isGroupAgg = true;
  const { results, duplicateAlertIds } = await getEsqlQueryHits(response, params.query, isGroupAgg);

  if (ruleResultService && duplicateAlertIds && duplicateAlertIds.size > 0) {
    const warning = `The query returned multiple rows with the same alert ID. There are duplicate results for alert IDs: ${Array.from(
      duplicateAlertIds
    ).join('; ')}`;
    ruleResultService.addLastRunWarning(warning);
    ruleResultService.setLastRunOutcomeMessage(warning);
  }

  return {
    link: '',
    parsedResults: parseAggregationResults({
      ...results,
      resultLimit: alertLimit,
      generateSourceFieldsFromHits: true,
    }),
    index: null,
  };
}

export const getEsqlQuery = (params: OnlyEsqlQueryRuleParams, alertLimit: number | undefined) => {
  const query = {
    query: alertLimit ? `${params.query} | limit ${alertLimit}` : params.query,
  };
  return query;
};
