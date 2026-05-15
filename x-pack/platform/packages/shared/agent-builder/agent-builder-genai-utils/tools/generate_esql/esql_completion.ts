/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { BaseMessageLike } from '@langchain/core/messages';
import { withActiveInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { correctCommonEsqlMistakes } from '@kbn/inference-plugin/common';
import { EsqlDocumentBase } from '@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base';
import type { EsqlPrompts } from '@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base/load_data';
import {
  resolveResourceForEsqlWithSamplingStats,
  formatResourceWithSampledValues,
  type ResolvedResourceWithSampling,
} from '../utils/resources';

const COMPLETION_FROM_PLACEHOLDER = 'FROM _completion_dummy_';

const CompletionGenerationSchema = z
  .object({
    replacesNext: z
      .boolean()
      .describe(
        'true if the generated code is a modified version of the pipe directly after the marked comment and should replace it; false if the generated code is a new pipe to insert without removing any existing pipe.'
      ),
    code: z
      .string()
      .describe(
        'Only the ES|QL pipe(s) that should replace the marked comment. Do not include the full query. Do not wrap in markdown fences.'
      ),
  })
  .describe('ES|QL completion fragment to insert into the editor.');

const RequestDocsSchema = z
  .object({
    commands: z
      .array(z.string())
      .optional()
      .describe('ES|QL source and processing commands to get documentation for.'),
    functions: z.array(z.string()).optional().describe('ES|QL functions to get documentation for.'),
  })
  .describe('Tool to use to request ES|QL documentation');

const formatFetchedDocs = (fetchedDocs: Record<string, string>): string => {
  const entries = Object.values(fetchedDocs);
  if (!entries.length) return '';
  return entries.join('\n\n');
};

const buildRequestDocsMessages = ({
  nlInstruction,
  currentQuery,
  prompts,
}: {
  nlInstruction: string;
  currentQuery: string;
  prompts: EsqlPrompts;
}): BaseMessageLike[] => [
  [
    'system',
    `You are an Elasticsearch assistant that helps with writing ES|QL queries.

Your current task is to look at a partial ES|QL query in the editor and at a single instruction (a comment) the user wants to turn into pipe(s). Pick the ES|QL commands and functions you will need to write that fragment, so a later step can fetch documentation for only those keywords.

<syntax-overview>
${prompts.syntax}
</syntax-overview>`,
  ],
  [
    'user',
    `<current_query>
${currentQuery}
</current_query>

<instruction>
${nlInstruction}
</instruction>

Request documentation for the commands and functions you will need to generate the pipe(s) for this instruction.`,
  ],
];

const buildCompletionMessages = ({
  nlInstruction,
  currentQuery,
  fetchedDocs,
  resource,
}: {
  nlInstruction: string;
  currentQuery: string;
  fetchedDocs: Record<string, string>;
  resource: ResolvedResourceWithSampling | undefined;
}): BaseMessageLike[] => {
  const docsBlock = formatFetchedDocs(fetchedDocs);
  const resourceBlock = resource ? formatResourceWithSampledValues({ resource }) : '';

  return [
    [
      'system',
      `You are an ES|QL expert completing a partial query in the editor. The user has written a natural-language comment describing a step they want; your job is to output the ES|QL pipe(s) that should replace that comment.

The target comment is marked with >>> and <<< delimiters in the query. Other comment lines (without those delimiters) are regular documentation — ignore them as instructions.

Output ONLY the pipe fragment. Do not output the full query. Do not include markdown fences.

If the instruction asks to modify or extend the existing pipe immediately after the comment (e.g. "also add ...", "change ...", "add a column"), output the complete modified version of that pipe and set replacesNext=true.
Otherwise output only new pipe(s) and set replacesNext=false.

${
  docsBlock
    ? `## Relevant ES|QL documentation

${docsBlock}`
    : ''
}`,
    ],
    [
      'user',
      `<current_query>
${currentQuery}
</current_query>

${resourceBlock ? `${resourceBlock}\n` : ''}<instruction>
${nlInstruction}
</instruction>

Generate the ES|QL pipe(s) that should replace the marked comment.`,
    ],
  ];
};

/**
 * Runs `correctCommonEsqlMistakes` on a pipe fragment by wrapping it with a synthetic
 * FROM so it parses as a full query, then strips the wrapper from the corrected output.
 * Falls back to the original fragment if anything goes wrong.
 */
const correctCompletionFragment = (rawFragment: string): string => {
  const fragment = rawFragment.trim();
  if (!fragment) return fragment;

  const fragmentWithLeadingPipe = fragment.startsWith('|') ? fragment : `| ${fragment}`;
  const wrapped = `${COMPLETION_FROM_PLACEHOLDER}\n${fragmentWithLeadingPipe}`;

  try {
    const { output } = correctCommonEsqlMistakes(wrapped);
    const idx = output.indexOf('|');
    if (idx === -1) return fragment;
    const corrected = output.slice(idx).trim();
    return fragment.startsWith('|') ? corrected : corrected.replace(/^\|\s*/, '');
  } catch {
    return fragment;
  }
};

export interface GenerateEsqlCompletionResponse {
  /** Pipe fragment (one or more lines) to insert or replace. */
  content: string;
  /** When true, the editor should treat the line after the comment as replaced by `content`. */
  replacesNext: boolean;
}

export interface GenerateEsqlCompletionParams {
  model: ScopedModel;
  esClient: ElasticsearchClient;
  logger?: Logger;
  nlInstruction: string;
  currentQuery: string;
  signal?: AbortSignal;
}

/**
 * ES|QL completion used by the editor's comment-to-ES|QL action.
 *
 * Mirrors the pieces of {@link generateEsql} that matter for fragment generation:
 *  - keyword-targeted documentation (request_documentation step)
 *  - sampled field stats from the buffer's FROM target, when resolvable
 *  - `correctCommonEsqlMistakes` post-processing
 *  - structured output (no markdown-fence parsing)
 *
 * Skips the parts of {@link generateEsql} that don't apply to a fragment:
 *  - index discovery via indexExplorer (we already have the buffer's FROM)
 *  - validate/execute/retry loop (the output is a fragment, not a runnable query)
 */
export const generateEsqlCompletion = async ({
  model,
  esClient,
  logger,
  nlInstruction,
  currentQuery,
  signal,
}: GenerateEsqlCompletionParams): Promise<GenerateEsqlCompletionResponse> => {
  return withActiveInferenceSpan(
    'GenerateEsqlCompletion',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      },
    },
    async () => {
      const docBase = await EsqlDocumentBase.load();

      const resourceName = getIndexPatternFromESQLQuery(currentQuery) || undefined;
      const resourcePromise = resourceName
        ? resolveResourceForEsqlWithSamplingStats({
            resourceName,
            esClient,
            samplingSize: 50,
          }).catch((e) => {
            logger?.debug(
              `[generateEsqlCompletion] failed to resolve resource '${resourceName}': ${e?.message}`
            );
            return undefined;
          })
        : Promise.resolve(undefined);

      const requestDocModel = model.chatModel.withStructuredOutput(RequestDocsSchema, {
        name: 'request_documentation',
      });

      const [{ commands = [], functions = [] }, resource] = await Promise.all([
        requestDocModel.invoke(
          buildRequestDocsMessages({
            nlInstruction,
            currentQuery,
            prompts: docBase.getPrompts(),
          }),
          { signal }
        ),
        resourcePromise,
      ]);

      const fetchedDocs = docBase.getDocumentation([...commands, ...functions]);

      const generateModel = model.chatModel.withStructuredOutput(CompletionGenerationSchema, {
        name: 'generate_esql_completion',
      });

      const { replacesNext, code } = await generateModel.invoke(
        buildCompletionMessages({ nlInstruction, currentQuery, fetchedDocs, resource }),
        { signal }
      );

      const corrected = correctCompletionFragment(code);
      return { content: corrected, replacesNext };
    }
  );
};
