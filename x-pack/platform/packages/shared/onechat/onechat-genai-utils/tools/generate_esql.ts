/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { filter, toArray, firstValueFrom } from 'rxjs';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { isChatCompletionMessageEvent, isChatCompletionEvent } from '@kbn/inference-common';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import type { ScopedModel } from '@kbn/onechat-server';
import { indexExplorer } from './index_explorer';
import { getIndexMappings } from './steps/get_mappings';
import { extractEsqlQueries } from './utils/esql';

export interface GenerateEsqlResponse {
  answer: string;
  queries: string[];
}

export const generateEsql = async ({
  query,
  context,
  index,
  model,
  esClient,
}: {
  query: string;
  context?: string;
  index?: string;
  model: ScopedModel;
  esClient: ElasticsearchClient;
}): Promise<GenerateEsqlResponse> => {
  let selectedIndex: string | undefined;
  let mappings: MappingTypeMapping;

  if (index) {
    selectedIndex = index;
    const indexMappings = await getIndexMappings({
      indices: [index],
      esClient,
    });
    mappings = indexMappings[index].mappings;
  } else {
    const {
      indices: [firstIndex],
    } = await indexExplorer({
      query,
      esClient,
      limit: 1,
      model,
    });
    selectedIndex = firstIndex.indexName;
    mappings = firstIndex.mappings;
  }

  const esqlEvents$ = naturalLanguageToEsql({
    // @ts-expect-error using a scoped inference client
    connectorId: undefined,
    client: model.inferenceClient,
    logger: { debug: () => undefined },
    input: `
        Your task is to generate an ES|QL query.

        - User query: "${query}",
        - Additional context: "${context ?? 'N/A'}
        - Index to use: "${selectedIndex}"
        - Mapping of this index:
        \`\`\`json
        ${JSON.stringify(mappings, undefined, 2)}
        \`\`\`

        Given those info, please generate an ES|QL query to address the user request
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
