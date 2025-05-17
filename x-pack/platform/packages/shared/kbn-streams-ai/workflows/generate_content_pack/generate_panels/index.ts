/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { BoundInferenceClient, MessageRole, callPromptUntil } from '@kbn/inference-common';
import { Streams } from '@kbn/streams-schema';
import { describeDataset, getSampleDocuments, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import { GeneratePanels } from './prompt';

interface SuggestedPanel {
  id: string;
  title: string;
  description: string;
  visualization: string;
  query: string;
}

export async function generatePanels({
  definition,
  inferenceClient,
  esClient,
  logger,
  start,
  end,
  signal,
}: {
  definition: Streams.ingest.all.Definition;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  start: number;
  end: number;
  signal: AbortSignal;
}): Promise<SuggestedPanel[]> {
  const messages = await callPromptUntil({
    inferenceClient,
    prompt: GeneratePanels,
    abortSignal: signal,
    strategy: 'next',
    toolCallbacks: {
      suggest_panels: async () => {
        return {};
      },
    },
    input: {
      stream: {
        name: definition.name,
        description: definition.description,
      },
      sample_documents: JSON.stringify(
        await getSampleDocuments({
          start,
          end,
          index: definition.name,
          esClient,
          _source: true,
          fields: [],
          size: 10,
        }).then(({ hits }) => hits.map((hit) => hit._source))
      ),
      dataset_analysis: await describeDataset({
        esClient,
        start,
        end,
        index: definition.name,
      }).then((analysis) => {
        return JSON.stringify(sortAndTruncateAnalyzedFields(analysis, { dropEmpty: true }));
      }),
    },
  });

  const lastToolCall = messages.findLast(
    (message): message is Extract<typeof message, { role: MessageRole.Assistant }> =>
      Boolean(message.role === MessageRole.Assistant && message.toolCalls?.length)
  );

  return lastToolCall?.toolCalls.flatMap((toolCall) => toolCall.function.arguments.panels) ?? [];
}
