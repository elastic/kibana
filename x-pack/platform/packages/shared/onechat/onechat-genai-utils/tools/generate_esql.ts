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
import { formatFieldAsXml } from './utils/formatting';
import { resolveResource } from './steps/resolve_resource';

export interface GenerateEsqlResponse {
  answer: string;
  queries: string[];
}

export const generateEsql = async ({
  nlQuery,
  index,
  context,
  model,
  esClient,
}: {
  nlQuery: string;
  context?: string;
  index?: string;
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

  const { fields, type: targetType } = await resolveResource({
    resourceName: selectedTarget,
    esClient,
  });

  const esqlEvents$ = naturalLanguageToEsql({
    // @ts-expect-error using a scoped inference client
    connectorId: undefined,
    client: model.inferenceClient,
    logger: { debug: () => undefined },
    input: ` You are an expert ES|QL generator.
Your task is to write a single, valid ES|QL query based on the provided information.

<user_query>
${nlQuery}
</user_query>

<context>
${context ?? 'No additional context provided.'}
</context>

<target_resource name="${selectedTarget}" type="${targetType}" >
  <fields>
${fields.map((field) => `    ${formatFieldAsXml(field)}`).join('\n')}
  </fields>
</target_resource>

Based on all the information above, generate the ES|QL query.
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
