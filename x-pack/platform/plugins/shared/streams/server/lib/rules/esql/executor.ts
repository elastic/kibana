/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorOptions,
} from '@kbn/alerting-plugin/server';
import { Alert } from '@kbn/alerts-as-data-utils';
import { PersistenceServices } from '@kbn/rule-registry-plugin/server';
import { isEmpty } from 'lodash';
import moment from 'moment';
import objectHash from 'object-hash';
import { MAX_ALERTS_PER_EXECUTION } from './common';
import { buildEsqlSearchRequest } from './lib/build_esql_search_request';
import { executeEsqlRequest } from './lib/execute_esql_request';
import { EsqlRuleInstanceState, EsqlRuleParams } from './types';

export async function getRuleExecutor(
  options: RuleExecutorOptions<
    EsqlRuleParams,
    EsqlRuleInstanceState,
    AlertInstanceState,
    AlertInstanceContext,
    'default',
    Alert
  > & {
    services: PersistenceServices;
  }
) {
  const { services, params, logger, state, startedAt, spaceId, rule } = options;
  const { scopedClusterClient, alertWithPersistence } = services;

  const previousOriginalDocumentIds = state.previousOriginalDocumentIds ?? [];

  const now = moment(startedAt);

  const esqlRequest = buildEsqlSearchRequest({
    query: params.query,
    timestampField: params.timestampField,
    from: now.clone().subtract(2, 'minutes').toISOString(),
    to: now.clone().toISOString(),
    previousOriginalDocumentIds,
  });

  const results = await executeEsqlRequest({
    esClient: scopedClusterClient.asCurrentUser,
    esqlRequest,
    logger,
  });

  const alertDocIdToDocumentIdMap = new Map<string, string>();
  const alerts = results.map((result) => {
    const alertDocId = objectHash([result._id, rule.id, spaceId]);
    alertDocIdToDocumentIdMap.set(alertDocId, result._id);

    return {
      _id: alertDocId,
      _source: {
        original_source: {
          _id: result._id,
          ...result._source,
        },
      },
    };
  });

  const { createdAlerts, errors } = await alertWithPersistence(
    alerts,
    true,
    MAX_ALERTS_PER_EXECUTION
  );

  if (!isEmpty(errors)) {
    logger.debug(() => `Alerts bulk process finished with errors: ${JSON.stringify(errors)}`);
  }

  const originalDocumentIds = createdAlerts.map(
    (alert) => alertDocIdToDocumentIdMap.get(alert._id)!
  );

  return {
    state: {
      previousOriginalDocumentIds: originalDocumentIds,
    },
  };
}
