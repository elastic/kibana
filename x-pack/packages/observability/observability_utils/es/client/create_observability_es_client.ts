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

type EsqlQueryColumnarRequest = EsqlQueryRequest & { columnar: true };
type EsqlQueryRowBasedRequest = EsqlQueryRequest & { columnar?: false };
export type InferESQLResponseOf<
  TDocument = unknown,
  TSearchRequest extends EsqlQueryRequest = EsqlQueryRequest
> = TSearchRequest['columnar'] extends true ? ESQLSearchResponse : TDocument[];

/**
 * An Elasticsearch Client with a fully typed `search` method and built-in
 * APM instrumentation.
 */
export interface ObservabilityElasticsearchClient {
  search<TDocument = unknown, TSearchRequest extends SearchRequest = SearchRequest>(
    operationName: string,
    parameters: TSearchRequest
  ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>>;
  esql<TDocument = unknown, TSearchRequest extends EsqlQueryRequest = EsqlQueryColumnarRequest>(
    operationName: string,
    parameters: TSearchRequest
  ): Promise<InferESQLResponseOf<TDocument, TSearchRequest>>;
  esql<TDocument = unknown, TSearchRequest extends EsqlQueryRequest = EsqlQueryRowBasedRequest>(
    operationName: string,
    parameters: TSearchRequest
  ): Promise<InferESQLResponseOf<TDocument, TSearchRequest>>;
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
    esql<TDocument = unknown, TSearchRequest extends EsqlQueryRequest = EsqlQueryRequest>(
      operationName: string,
      parameters: EsqlQueryRequest
    ) {
      logger.trace(() => `Request (${operationName}):\n${JSON.stringify(parameters, null, 2)}`);
      return withSpan({ name: operationName, labels: { plugin } }, () => {
        return client.esql.query(
          { ...parameters },
          {
            querystring: {
              drop_null_columns: true,
            },
          }
        );
      })
        .then((response) => {
          const esqlResponse = response as unknown as ESQLSearchResponse;
          logger.trace(() => `Response (${operationName}):\n${JSON.stringify(response, null, 2)}`);

          return (
            parameters.columnar ? esqlResponse : esqlResultToPlainObjects(esqlResponse)
          ) as InferESQLResponseOf<TDocument, TSearchRequest>;
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
