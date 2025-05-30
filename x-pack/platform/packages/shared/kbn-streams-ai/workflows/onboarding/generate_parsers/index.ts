/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callProcessingPrompt } from '../../../shared/processing/call_processing_prompt';
import { OnboardingTaskContext, OnboardingTaskState } from '../types';
import { extractAndGroupPatterns } from './extract_and_group_patterns';
import { schema } from './processing_schema';
import { GenerateParsersPrompt, DescribeFormatPrompt } from './prompts';
import { extractTemplate } from '../../../shared/processing/templatize';

export async function generateParsers({
  context,
  state,
  state: {
    stream: { definition },
    dataset: { samples },
  },
}: {
  context: OnboardingTaskContext;
  state: OnboardingTaskState;
}): Promise<OnboardingTaskState> {
  const messages = samples.map((hit) => (hit._source as Record<string, any>).message);

  const groupedPatterns = extractAndGroupPatterns({
    samples: samples.map((hit) => ({
      message: String((hit._source as Record<string, any> | undefined)?.message),
    })),
    field: 'message',
  });

  const maxMessages = 30;
  const maxMessagesPerGroup = Math.max(3, Math.ceil(maxMessages / groupedPatterns.length));

  const templateExtraction = await extractTemplate(messages);

  let template: string = 'none';

  context.logger.info('template: ' + templateExtraction.root.formatted);

  if (templateExtraction.root.columns.length >= 1) {
    template = templateExtraction.root.formatted;
  }

  const sampleMessages = groupedPatterns
    .map(({ exampleValues }) => exampleValues.slice(0, maxMessagesPerGroup))
    .flat()
    .map((line) => '`' + line + '`')
    .join('\n');

  context.logger.info(template);

  const formatDescription = await context.inferenceClient.prompt({
    prompt: DescribeFormatPrompt,
    input: {
      messages: sampleMessages,
      suggested_template: template,
    },
  });

  return await callProcessingPrompt({
    context,
    state,
    prompt: GenerateParsersPrompt,
    input: {
      grouped_messages: JSON.stringify(
        groupedPatterns.map((pattern) => {
          return {
            ...pattern,
            exampleValues: pattern.exampleValues.slice(0, 3),
          };
        })
      ),
      existing_processors: JSON.stringify(definition.ingest.processing),
      processor_schema: JSON.stringify(schema),
      format_description: formatDescription.content,
      suggested_template: template,
    },
  });
}
