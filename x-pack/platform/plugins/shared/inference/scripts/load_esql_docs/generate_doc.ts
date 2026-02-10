/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ScriptInferenceClient } from '../util/kibana_client';
import type { ExtractionOutput } from './extract_doc_entries';
import { createDocumentationPagePrompt, rewriteFunctionPagePrompt } from './prompts';
import { bindOutput } from './utils/output_executor';

export interface FileToWrite {
  name: string;
  content: string;
}

interface PageGeneration {
  outputFileName: string;
  sourceFile: string;
  instructions: string;
}

export const generateDoc = async ({
  extraction,
  inferenceClient,
}: {
  extraction: ExtractionOutput;
  inferenceClient: ScriptInferenceClient;
  log: ToolingLog;
}) => {
  const filesToWrite: FileToWrite[] = [];

  // Reduce concurrency to avoid hitting rate limits (429 errors)
  // Lower concurrency = fewer simultaneous requests = less chance of rate limits
  const limiter = pLimit(3);

  // Configure retry logic to handle 429 (Too Many Requests) errors
  // 429 errors are retryable and will be handled with exponential backoff
  const callOutput = bindOutput({
    connectorId: inferenceClient.getConnectorId(),
    output: inferenceClient.output,
    maxRetries: 5, // Retry up to 5 times for rate limit errors
    retryConfiguration: {
      retryOn: 'auto', // Will retry 429 errors (not in STATUS_NO_RETRY list)
      initialDelay: 2000, // Start with 2 second delay
      backoffMultiplier: 2, // Double the delay on each retry
    },
  });

  const documentation = documentationForFunctionRewrite(extraction);

  await Promise.all(
    [...extraction.commands, ...extraction.functions].map(async (func) => {
      return limiter(async () => {
        const rewrittenContent = await callOutput(
          rewriteFunctionPagePrompt({
            content: func.markdownContent,
            documentation,
            command: func.command,
          })
        );
        filesToWrite.push({
          name: fileNameForFunc(func.name),
          content: rewrittenContent,
        });
      });
    })
  );

  const pageContentByName = (pageName: string) => {
    return extraction.pages.find((page) => page.name === pageName)?.content;
  };

  const pages: PageGeneration[] = [
    {
      sourceFile: 'syntax',
      outputFileName: 'esql-syntax.txt',
      instructions: `
           Generate a description of Elastic ES|QL syntax. Make sure to reuse as much as possible the provided content of file and be as complete as possible.
           For timespan literals, generate at least five examples of full ES|QL queries, using a mix commands and functions, using different intervals and units.
           **Make sure you use timespan literals, such as \`1 day\` or \`24h\` or \`7 weeks\` in these examples**.
           Combine ISO timestamps with time span literals and NOW().
           Make sure the example queries are using different combinations of syntax, commands and functions for each, and use BUCKET at least twice
           When using DATE_TRUNC, make sure you DO NOT wrap the timespan in single or double quotes.
           Do not use the Cast operator. In your examples, make sure to only use commands and functions that exist in the provided documentation.
       `,
    },
    {
      sourceFile: 'overview',
      outputFileName: 'esql-overview.txt',
      instructions: `Generate a description of ES|QL as a language. Ignore links to other documents.
        From Limitations, include the known limitations, but ignore limitations that are specific to a command.
        Include a summary of what is mentioned in the CROSS_CLUSTER, Kibana and API sections.
        Explain how to use the REST API with an example and mention important information for Kibana usage and cross cluster querying.`,
    },
    {
      sourceFile: 'operators',
      outputFileName: 'esql-operators.txt',
      instructions: `
          Generate a document describing the operators.
          For each type of operator (binary, unary, logical, and the remaining), generate a section.
          For each operator, generate at least one full ES|QL query as an example of its usage.
          Keep it short, e.g. only a \`\`\`esql\\nFROM ...\\n| WHERE ... \`\`\`
          `,
    },
  ];

  await Promise.all(
    pages.map(async (page) => {
      return limiter(async () => {
        const content = pageContentByName(page.sourceFile);
        if (!content) return;
        const pageContent = await callOutput(
          createDocumentationPagePrompt({
            documentation,
            content,
            specificInstructions: page.instructions,
          })
        );
        filesToWrite.push({
          name: page.outputFileName,
          content: pageContent,
        });
      });
    })
  );

  return filesToWrite;
};

const fileNameForFunc = (funcName: string) =>
  `esql-${funcName.replaceAll(' ', '-').toLowerCase()}.txt`;

const documentationForFunctionRewrite = (extraction: ExtractionOutput) => {
  return JSON.stringify(
    {
      pages: extraction.pages.filter((page) => {
        return !['query-api', 'cross-clusters'].includes(page.name);
      }),
      commands: extraction.commands,
      functions: extraction.functions.filter((func) => {
        return [
          'BUCKET',
          'COUNT',
          'COUNT_DISTINCT',
          'CASE',
          'DATE_EXTRACT',
          'DATE_DIFF',
          'DATE_TRUNC',
        ].includes(func.name);
      }),
    },
    undefined,
    2
  );
};
