/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse, ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import { withSpan } from '@kbn/apm-utils';
import type { EsqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import { esqlResultToPlainObjects } from '../utils/esql_result_to_plain_objects';

type SearchRequest = ESSearchRequest & {
  index: string | string[];
  track_total_hits: number | boolean;
  size: number | boolean;
};

type EsqlQueryParameters = EsqlQueryRequest & { parseOutput?: boolean };
type EsqlOutputParameters = Omit<EsqlQueryRequest, 'format' | 'columnar'> & {
  parseOutput?: true;
  format?: 'json';
  columnar?: false;
};

type EsqlParameters = EsqlOutputParameters | EsqlQueryParameters;

export type InferEsqlResponseOf<
  TOutput = unknown,
  TParameters extends EsqlParameters = EsqlParameters
> = TParameters extends EsqlOutputParameters ? TOutput[] : ESQLSearchResponse;

/**
 * An Elasticsearch Client with a fully typed `search` method and built-in
 * APM instrumentation.
 */
export interface ObservabilityElasticsearchClient {
  search<TDocument = unknown, TSearchRequest extends SearchRequest = SearchRequest>(
    operationName: string,
    parameters: TSearchRequest
  ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>>;
  esql<TOutput = unknown, TQueryParams extends EsqlOutputParameters = EsqlOutputParameters>(
    operationName: string,
    parameters: TQueryParams
  ): Promise<InferEsqlResponseOf<TOutput, TQueryParams>>;
  esql<TOutput = unknown, TQueryParams extends EsqlQueryParameters = EsqlQueryParameters>(
    operationName: string,
    parameters: TQueryParams
  ): Promise<InferEsqlResponseOf<TOutput, TQueryParams>>;
  client: ElasticsearchClient;
}

export function createObservabilityEsClient({
  client,
  logger,
  plugin,
}: {
  client: ElasticsearchClient;
  logger: Logger;
  plugin: string;
}): ObservabilityElasticsearchClient {
  return {
    client,
    esql<TOutput = unknown, TSearchRequest extends EsqlParameters = EsqlParameters>(
      operationName: string,
      { parseOutput = true, format = 'json', columnar = false, ...parameters }: TSearchRequest
    ) {
      logger.trace(() => `Request (${operationName}):\n${JSON.stringify(parameters, null, 2)}`);
      return withSpan({ name: operationName, labels: { plugin } }, () => {
        return client.esql.query(
          { ...parameters, format, columnar },
          {
            querystring: {
              drop_null_columns: true,
            },
          }
        );
      })
        .then((response) => {
          logger.trace(() => `Response (${operationName}):\n${JSON.stringify(response, null, 2)}`);

          const esqlResponse = response as unknown as ESQLSearchResponse;

          const shouldParseOutput = parseOutput && !columnar && format === 'json';
          return shouldParseOutput ? esqlResultToPlainObjects<TOutput>(esqlResponse) : esqlResponse;
        })
        .catch((error) => {
          throw error;
        });
    },
    search<TDocument = unknown, TSearchRequest extends SearchRequest = SearchRequest>(
      operationName: string,
      parameters: SearchRequest
    ) {
      logger.trace(() => `Request (${operationName}):\n${JSON.stringify(parameters, null, 2)}`);
      // wraps the search operation in a named APM span for better analysis
      // (otherwise it would just be a _search span)
      return withSpan(
        {
          name: operationName,
          labels: {
            plugin,
          },
        },
        () => {
          return client.search<TDocument>(parameters) as unknown as Promise<
            InferSearchResponseOf<TDocument, TSearchRequest>
          >;
        }
      ).then((response) => {
        logger.trace(() => `Response (${operationName}):\n${JSON.stringify(response, null, 2)}`);
        return response;
      });
    },
  };
}
