/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertsClientError,
  RuleExecutorOptions,
  RuleTypeState,
} from '@kbn/alerting-plugin/server';
import { Alert } from '@kbn/alerts-as-data-utils';
import moment from 'moment';
import { buildEsqlSearchRequest } from './lib/build_esql_search_request';
import { executeEsqlRequest } from './lib/execute_esql_request';
import { fetchSourceDocuments } from './lib/fetch_source_documents';
import { getIndexListFromEsqlQuery } from './lib/get_index_list_from_esql_query';
import { rowToDocument } from './lib/row_to_document';
import { EsqlAllowedActionGroups, EsqlRuleParams } from './types';

export const getRuleExecutor = () =>
  async function executor(
    options: RuleExecutorOptions<
      EsqlRuleParams,
      RuleTypeState,
      AlertInstanceState,
      AlertInstanceContext,
      EsqlAllowedActionGroups,
      Alert
    >
  ) {
    const { services, params, logger, startedAt, spaceId, getTimeRange } = options;
    const { scopedClusterClient, alertsClient } = services;

    if (!alertsClient) {
      throw new AlertsClientError();
    }

    const now = moment(startedAt);

    const esqlRequest = buildEsqlSearchRequest({
      query: params.query,
      from: now.clone().subtract(5, 'minutes').toISOString(),
      to: now.clone().toISOString(),
    });

    const response = await executeEsqlRequest({
      esClient: scopedClusterClient.asCurrentUser,
      requestBody: esqlRequest,
      requestQueryParams: { drop_null_columns: true },
    });

    const results = response.values.map((row) => rowToDocument(response.columns, row));
    const index = getIndexListFromEsqlQuery(params.query);
    const sourceDocuments = await fetchSourceDocuments({
      esClient: scopedClusterClient.asCurrentUser,
      index,
      results,
    });

    const syntheticHits: Array<estypes.SearchHit<unknown>> = results.map((document) => {
      const { _id, _version, _index, ...esqlResult } = document;

      const sourceDocument = _id ? sourceDocuments[_id] : undefined;

      // TODO security merges esqlResult with the source document
      return {
        _source: sourceDocument?._source,
        fields: sourceDocument?.fields,
        _id: _id ?? '',
        _index: _index || sourceDocument?._index || '',
        _version: sourceDocument?._version,
      };
    });

    console.dir(syntheticHits, { depth: 10 });

    // TODO: insert synthetics hits into alert

    return { state: {} };
  };
