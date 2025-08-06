/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolCall } from '@kbn/inference-common';
import { EsqlDocumentBase } from '@kbn/inference-plugin/server';

type GetDocumentationToolCall = ToolCall<string, { commands?: string[]; functions?: string[] }>;

export interface GetDocumentationToolCallResponse {
  [x: string]: string;
}

export function createGetDocumentationToolCallback({ docBase }: { docBase: EsqlDocumentBase }) {
  return async ({
    function: {
      arguments: { commands, functions },
    },
  }: GetDocumentationToolCall): Promise<GetDocumentationToolCallResponse> => {
    return docBase.getDocumentation([...(commands ?? []), ...(functions ?? [])], {
      generateMissingKeywordDoc: true,
    });
  };
}
