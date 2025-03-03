/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSchema, FunctionCallingMode, OutputAPI } from '@kbn/inference-common';

const summarizeDocumentSchema = {
  type: 'object',
  properties: {
    useful: {
      type: 'boolean',
      description: `Whether the provided document has any useful information related to the user's query.`,
    },
    summary: {
      type: 'string',
      description: `The condensed version of the document that can be used to answer the question. Can be empty.`,
    },
  },
  required: ['useful'],
} as const satisfies ToolSchema;

interface SummarizeDocumentResponse {
  summary: string;
}

export const summarizeDocument = async ({
  searchTerm,
  documentContent,
  connectorId,
  outputAPI,
  functionCalling,
}: {
  searchTerm: string;
  documentContent: string;
  outputAPI: OutputAPI;
  connectorId: string;
  functionCalling?: FunctionCallingMode;
}): Promise<SummarizeDocumentResponse> => {
  const result = await outputAPI({
    id: 'summarize_document',
    connectorId,
    functionCalling,
    system: `You are an helpful Elastic assistant, and your current task is to help answer the user's question.

      Given a question and a document, please provide a condensed version of the document that can be used to answer the question.
      - Limit the length of the output to 500 words.
      - Try to include all relevant information that could be used to answer the question. If this
        can't be done within the 500 words limit, then only include the most relevant information related to the question.
      - If you think the document isn't relevant at all to answer the question, just return an empty text`,
    input: `
      ## User question

      ${searchTerm}

      ## Document

      ${documentContent}
      `,
    schema: summarizeDocumentSchema,
  });
  return {
    summary: result.output.summary ?? '',
  };
};
