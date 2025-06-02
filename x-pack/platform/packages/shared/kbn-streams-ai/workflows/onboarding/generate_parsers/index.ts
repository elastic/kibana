/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncateList } from '@kbn/inference-common';
import { uniq } from 'lodash';
import { inspect } from 'util';
import { callProcessingPrompt } from '../../../shared/processing/call_processing_prompt';
import { OnboardingTaskContext, OnboardingTaskState } from '../types';
import { extractAndGroupPatterns } from './extract_and_group_patterns';
import { schema } from './processing_schema';
import {
  GenerateParsersPrompt,
  DescribeFormatDissectPrompt,
  DescribeFormatGrokPrompt,
} from './prompts';
import { extractTemplate } from '../../../shared/processing/templatize';
import { wrapStr } from '../../../shared/util/wrap_str';

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

  const structure = await context.esClient.textStructure
    .findMessageStructure({
      messages,
      explain: true,
    })
    .catch((error) => {
      context.logger.error(error);
      return {
        grok_pattern: undefined,
        java_timestamp_formats: undefined,
      };
    });

  const groupedPatterns = extractAndGroupPatterns({
    samples: samples.map((hit) => ({
      message: String((hit._source as Record<string, any> | undefined)?.message),
    })),
    field: 'message',
  });

  const maxMessages = 30;

  const maxMessagesPerGroup = Math.max(3, Math.ceil(maxMessages / groupedPatterns.length));

  const templateExtraction = await extractTemplate(messages).catch((error) => {
    throw new Error(`Template extraction for ${state.stream.definition.name} timed out`, {
      cause: error,
    });
  });

  const { grok, display } = templateExtraction.root.formatted;

  context.logger.info(JSON.stringify(templateExtraction.root.formatted));

  const values = wrapStr(
    Object.entries(templateExtraction.root.values)
      .map(([field, vals]) => {
        return `- ${field}: ${wrapStr(
          truncateList(
            uniq(vals)
              .slice(0, 6)
              .map((val) => JSON.stringify(val)),
            5
          ).join(', '),
          ''
        )}`;
      })
      .join('\n'),
    ''
  );

  const templateContainsVariableWhitespace =
    grok.includes('\\s+') ||
    grok.includes('%{DATA}') ||
    grok.includes('%{SYSLOGBASE}') ||
    grok.includes('%{SYSLOGTIMESTAMP}') ||
    grok.includes('%{TIMESTAMP_ISO8601}') ||
    grok.includes('%{QUOTEDSTRING}') ||
    grok.includes('%{DATE') ||
    grok.includes('%{HTTPDATE}');

  const template = wrapStr(grok, '`');

  const grokPattern = wrapStr(structure.grok_pattern, '`');

  const timestampFormats = wrapStr(
    structure.java_timestamp_formats?.map((format) => `\t- ${wrapStr(format, '`')}`).join('\n'),
    '',
    '\tnone'
  );

  const patterns = groupedPatterns
    .map((pattern) => {
      const msgList = pattern.exampleValues
        .slice(0, 3)
        .map((value) => `  - \`${value}\``)
        .join('\n');
      return `- \`${pattern.truncatedPattern}\`
${msgList}`;
    })
    .join('\n');

  const formatDescription = await context.inferenceClient.prompt({
    prompt: templateContainsVariableWhitespace
      ? DescribeFormatGrokPrompt
      : DescribeFormatDissectPrompt,
    input: {
      stream: {
        name: state.stream.definition.name,
        description: wrapStr(state.stream.definition.description || undefined, ''),
      },
      suggested_template: {
        grok,
        display,
        values,
      },
      find_structure: {
        grok_pattern: grokPattern,
        timestamp_formats: timestampFormats,
      },
      patterns,
    },
  });

  context.logger.info(formatDescription.content);

  const initial = await context.services.processing
    .simulate(state.stream.definition.name, {
      samples: state.dataset.samples,
      processor: {
        id: 'initial',
        grok: {
          field: 'message',
          patterns: [grok],
        },
      },
    })
    .catch((error) => {
      return {
        result: {
          failure_rate: 1,
          errors: [error],
        },
      };
    });

  context.logger.info(inspect(initial.result, { depth: null }));

  return state;

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
