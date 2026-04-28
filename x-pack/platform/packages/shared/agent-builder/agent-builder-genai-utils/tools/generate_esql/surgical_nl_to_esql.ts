/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withActiveInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { extractTextContent } from '../../langchain/messages';
import { getBundledEsqlSyntaxExamplesSnippets } from './shared/bundled_esql_prompts';

const buildSurgicalSystemMessage = (syntax: string, examples: string): string => {
  if (!syntax && !examples) {
    return '';
  }
  return `You help complete ES|QL in the Kibana editor. The next user message is the full task. Follow it exactly: REPLACES_NEXT line, then a fenced \`\`\`esql\`\`\` block with only pipe line(s) (fragment), not a full query.

## Documentation

The following sections use the same bundled ES|QL prompt material as the full \`generateEsql\` tool (excerpts may be truncated for length).

${
  syntax
    ? `<syntax-overview>
${syntax}
</syntax-overview>`
    : ''
}

${
  examples
    ? `<esql-examples>
${examples}
</esql-examples>`
    : ''
}`;
};

const buildSurgicalUserMessage = ({
  nlInstruction,
  currentQuery,
}: {
  nlInstruction: string;
  currentQuery: string;
}): string => {
  return `You are an ES|QL expert completing a partial query in the editor.
The target comment line is marked with >>> and <<< delimiters in the query below.
That comment is a natural-language instruction describing what ES|QL code should replace it.
Other comment lines (without >>> <<<) are regular documentation comments — ignore them as instructions.

User instruction (from the marked comment):
${nlInstruction}

Your task: output ONLY the ES|QL pipe(s) that should replace the marked comment.
Do not output the full query.
Fence the replacement code with the esql tag. Do not explain it.

If the instruction asks to modify or extend an existing pipe command (e.g. "also add ...", "change ...", "add a column"),
output the complete modified version of that pipe. Otherwise output only new pipe(s).

Before the code block, output exactly one of these lines:
  REPLACES_NEXT: true
  REPLACES_NEXT: false
Output "true" when your generated code is a modified version of the pipe immediately after the marked comment
(i.e. it should replace that pipe, not be added alongside it).
Output "false" when your generated code is new and should be inserted without removing any existing pipe.

<CurrentQuery>
${currentQuery}
</CurrentQuery>`;
};

const extractSurgicalResponse = (content: string): { esql: string; replacesNext: boolean } => {
  const codeMatch = content.match(/```esql\s*([\s\S]*?)```/);
  const esql = codeMatch ? codeMatch[1].trim() : content.trim();
  const flagMatch = content.match(/REPLACES_NEXT:\s*(true|false)/i);
  const replacesNext = flagMatch ? flagMatch[1].toLowerCase() === 'true' : false;
  return { esql, replacesNext };
};

/**
 * {@link buildNlToEsqlAdditionalContext} is appended to `nlQuery` when using {@link generateEsql}
 * from the ES|QL editor (non-surgical) so the model sees the current buffer.
 */
export const buildNlToEsqlAdditionalContext = (currentQuery: string): string => {
  if (currentQuery) {
    return [
      'The user is in the ES|QL editor. Below is their current query.',
      'If the request is about changing, extending, or fixing that query, treat it as the starting point.',
      'If the request is for a new or unrelated query, you may produce a full replacement.',
      '',
      '<current_query>',
      currentQuery,
      '</current_query>',
    ].join('\n');
  }
  return '';
};

export interface GenerateSurgicalEsqlResponse {
  /** Pipe fragment (one or more lines) to insert or replace. */
  content: string;
  /** When true, the editor should treat the line after the comment as replaced by `content`. */
  replacesNext: boolean;
}

/**
 * Surgical ES|QL completion: pipe fragment + REPLACES_NEXT, without the full `generateEsql` graph
 * (no full-query validation loop). Uses the same bundled syntax/examples material as
 * \`generateEsql\` (see \`createGenerateEsqlPrompt\`), without the graph's keyword-doc / validate loop.
 */
export const generateSurgicalEsql = async ({
  model,
  nlInstruction,
  currentQuery,
}: {
  model: ScopedModel;
  nlInstruction: string;
  currentQuery: string;
}): Promise<GenerateSurgicalEsqlResponse> => {
  return withActiveInferenceSpan(
    'GenerateSurgicalEsql',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      },
    },
    async () => {
      let syntax = '';
      let examples = '';
      try {
        const snippets = await getBundledEsqlSyntaxExamplesSnippets();
        syntax = snippets.syntax;
        examples = snippets.examples;
      } catch {
        // proceed without bundled docs
      }
      const systemMessage = buildSurgicalSystemMessage(syntax, examples);
      const userMessage = buildSurgicalUserMessage({ nlInstruction, currentQuery });

      const messages: Array<['system' | 'user', string]> = systemMessage
        ? [
            ['system', systemMessage],
            ['user', userMessage],
          ]
        : [['user', userMessage]];

      const response = await model.chatModel.invoke(messages);

      const rawContent = extractTextContent(response);
      const { esql, replacesNext } = extractSurgicalResponse(rawContent);
      return { content: esql, replacesNext };
    }
  );
};
