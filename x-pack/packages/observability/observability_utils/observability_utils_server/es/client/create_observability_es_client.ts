/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EsqlQueryRequest,
  FieldCapsRequest,
  FieldCapsResponse,
  MsearchRequest,
  ScalarValue,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { withSpan } from '@kbn/apm-utils';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import { Required, ValuesType } from 'utility-types';
import { esqlResultToPlainObjects } from '../esql_result_to_plain_objects';

type SearchRequest = ESSearchRequest & {
  index: string | string[];
  track_total_hits: number | boolean;
  size: number | boolean;
};

interface EsqlOptions {
  asPlainObjects?: boolean;
}

type EsqlValue = ScalarValue | ScalarValue[];

type EsqlOutput = Record<string, EsqlValue>;

type InferEsqlResponseOf<
  TOutput extends EsqlOutput,
  TOptions extends EsqlOptions | undefined = { asPlainObjects: true }
> = TOptions extends { asPlainObjects: true }
  ? {
      hits: Array<{
        [key in keyof TOutput]: TOutput[key];
      }>;
    }
  : {
      columns: Array<{ name: keyof TOutput; type: string }>;
      values: Array<Array<ValuesType<TOutput>>>;
    };

export interface EsqlQueryResponse {
  columns: Array<{ name: string; type: string }>;
  values: EsqlValue[][];
}

/**
 * An Elasticsearch Client with a fully typed `search` method and built-in
 * APM instrumentation.
 */
export interface ObservabilityElasticsearchClient {
  search<TDocument = unknown, TSearchRequest extends SearchRequest = SearchRequest>(
    operationName: string,
    parameters: TSearchRequest
  ): Promise<InferSearchResponseOf<TDocument, TSearchRequest, { restTotalHitsAsInt: false }>>;
  msearch<TDocument = unknown>(
    operationName: string,
    parameters: MsearchRequest
  ): Promise<{
    responses: Array<SearchResponse<TDocument>>;
  }>;
  fieldCaps(
    operationName: string,
    request: Required<FieldCapsRequest, 'index_filter' | 'fields' | 'index'>
  ): Promise<FieldCapsResponse>;
  esql<
    TOutput extends EsqlOutput = EsqlOutput,
    TEsqlOptions extends EsqlOptions | undefined = { asPlainObjects: true }
  >(
    operationName: string,
    parameters: EsqlQueryRequest,
    options?: TEsqlOptions
  ): Promise<InferEsqlResponseOf<TOutput, TEsqlOptions>>;
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
  // wraps the ES calls in a named APM span for better analysis
  // (otherwise it would just eg be a _search span)
  const callWithLogger = <T>(
    operationName: string,
    request: Record<string, any>,
    callback: () => Promise<T>
  ) => {
    logger.debug(() => `Request (${operationName}):\n${JSON.stringify(request)}`);
    return withSpan(
      {
        name: operationName,
        labels: {
          plugin,
        },
      },
      callback,
      logger
    ).then((response) => {
      logger.trace(() => `Response (${operationName}):\n${JSON.stringify(response, null, 2)}`);
      return response;
    });
  };

  return {
    client,
    fieldCaps(operationName, parameters) {
      return callWithLogger(operationName, parameters, () => {
        return client.fieldCaps({
          ...parameters,
        });
      });
    },
    esql<
      TOutput extends EsqlOutput = EsqlOutput,
      TEsqlOptions extends EsqlOptions | undefined = { asPlainObjects: true }
    >(
      operationName: string,
      parameters: EsqlQueryRequest,
      options?: EsqlOptions
    ): Promise<InferEsqlResponseOf<TOutput, TEsqlOptions>> {
      return callWithLogger(operationName, parameters, () => {
        return client.esql
          .query(
            { ...parameters },
            {
              querystring: {
                drop_null_columns: true,
              },
            }
          )
          .then((response) => {
            const esqlResponse = response as unknown as EsqlQueryResponse;

            const shouldParseOutput = options?.asPlainObjects !== false;
            const finalResponse = shouldParseOutput
              ? { hits: esqlResultToPlainObjects<EsqlOutput>(esqlResponse) }
              : esqlResponse;

            return finalResponse as InferEsqlResponseOf<TOutput, TEsqlOptions>;
          });
      });
    },
    search<TDocument = unknown, TSearchRequest extends SearchRequest = SearchRequest>(
      operationName: string,
      parameters: SearchRequest
    ) {
      return callWithLogger(operationName, parameters, () => {
        return client.search<TDocument>(parameters) as unknown as Promise<
          InferSearchResponseOf<TDocument, TSearchRequest, { restTotalHitsAsInt: false }>
        >;
      });
    },
    msearch<TDocument = unknown>(operationName: string, parameters: MsearchRequest) {
      return callWithLogger(operationName, parameters, () => {
        return client.msearch<TDocument>(parameters) as unknown as Promise<{
          responses: Array<SearchResponse<TDocument>>;
        }>;
      });
    },
  };
}
