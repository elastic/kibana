/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { ToolCall, truncateList } from '@kbn/inference-common';
import { RunQueryOutput, createQueryCallback } from './create_query_callback';

type ValidateQueriesToolCall = ToolCall<
  string,
  { queries: string[]; ignoreMissingIndex?: boolean }
>;

export interface ValidateQueriesToolCallResponse {
  validations: RunQueryOutput[];
}

export function createValidateQueriesToolCallback({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): (toolCall: ValidateQueriesToolCall) => Promise<{ validations: RunQueryOutput[] }> {
  const queryCallback = createQueryCallback({ esClient });

  return async (toolCall: ValidateQueriesToolCall) => {
    return {
      validations: await Promise.all(
        toolCall.function.arguments.queries.map(async (query) => {
          const response = await queryCallback(query + `| LIMIT 0`);

          return toolCall.function.arguments.ignoreMissingIndex
            ? handleResponseWithIgnoreMissing(response)
            : handleResponse(response);
        })
      ),
    };
  };
}

function handleResponse(response: RunQueryOutput) {
  if ('error' in response) {
    return {
      query: response.query,
      validation: {
        valid: false,
        ...response,
      },
    };
  }

  const cols = truncateList(response.columns?.map((c) => c.name) ?? [], 10);
  return {
    query: response.query,
    validation: {
      valid: true,
      ...(cols.length ? { columns: cols } : {}),
    },
  };
}

function handleResponseWithIgnoreMissing(response: RunQueryOutput) {
  if ('error' in response && response.errorMessages?.length) {
    return {
      query: response.query,
      validation: {
        valid: false,
        errorMessages: response.errorMessages,
      },
    };
  }
  return {
    query: response.query,
    validation: {
      valid: true,
    },
  };
}
