/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { EsqlDocumentBase } from '@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base';

/**
 * Single cached `EsqlDocumentBase` for all generate/surgical paths in this package.
 * Under the hood, doc data is also loaded once by `EsqlDocumentBase` / `loadData`.
 */
export const loadEsqlDocumentBaseOnce = once(() => EsqlDocumentBase.load());

const MAX_SYNTAX_SNIPPET_CHARS = 12_000;
const MAX_EXAMPLES_SNIPPET_CHARS = 8_000;

const truncateForPrompt = (text: string, maxChars: number): string => {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}

[... truncated for length ...]`;
};

export const getBundledEsqlSyntaxExamplesSnippets = async (): Promise<{
  syntax: string;
  examples: string;
}> => {
  const docBase = await loadEsqlDocumentBaseOnce();
  const { syntax, examples } = docBase.getPrompts();
  return {
    syntax: truncateForPrompt(syntax, MAX_SYNTAX_SNIPPET_CHARS),
    examples: truncateForPrompt(examples, MAX_EXAMPLES_SNIPPET_CHARS),
  };
};
