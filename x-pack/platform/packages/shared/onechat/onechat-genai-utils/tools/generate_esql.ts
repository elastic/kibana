/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, toArray, firstValueFrom } from 'rxjs';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { isChatCompletionMessageEvent, isChatCompletionEvent } from '@kbn/inference-common';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import type { ScopedModel } from '@kbn/onechat-server';
import { indexExplorer } from './index_explorer';
import { extractEsqlQueries } from './utils/esql';
import { getResourceMappings } from './steps/get_resource_mappings';

export interface GenerateEsqlResponse {
  answer: string;
  queries: string[];
}

export const generateEsql = async ({
  nlQuery,
  context,
  index,
  model,
  esClient,
}: {
  nlQuery: string;
  context?: string;
  index?: string; // TODO rename to target
  model: ScopedModel;
  esClient: ElasticsearchClient;
}): Promise<GenerateEsqlResponse> => {
  let selectedTarget = index;

  if (!selectedTarget) {
    const {
      resources: [selectedResource],
    } = await indexExplorer({
      nlQuery,
      esClient,
      limit: 1,
      model,
    });
    selectedTarget = selectedResource.name;
  }

  const targetMapping = await getResourceMappings({
    resourceName: selectedTarget,
    esClient,
  });
  const mappings = targetMapping.mappings;

  const esqlEvents$ = naturalLanguageToEsql({
    // @ts-expect-error using a scoped inference client
    connectorId: undefined,
    client: model.inferenceClient,
    logger: { debug: () => undefined },
    input: `
        Your task is to generate an ES|QL query given a natural language query from the user.

        - Natural language query: "${nlQuery}",
        - Additional context: "${context ?? 'N/A'}
        - Index to use: "${selectedTarget}"
        - Mapping of this index:
        \`\`\`json
        ${JSON.stringify(mappings, undefined, 2)}
        \`\`\`

        Given those info, please generate an ES|QL query to address the user request.
        `,
  });

  const messages = await firstValueFrom(
    esqlEvents$.pipe(filter(isChatCompletionEvent), filter(isChatCompletionMessageEvent), toArray())
  );

  const fullContent = messages.map((message) => message.content).join('\n');
  const esqlQueries = extractEsqlQueries(fullContent);

  return {
    answer: fullContent,
    queries: esqlQueries,
  };
};
