/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import { parseJsonAttr } from '@kbn/inference-tracing';
import type {
  GenAISemConvAttributes,
  GenAIInputMessage,
  GenAIOutputMessage,
} from '@kbn/inference-tracing';

/** Validates exported agent payloads independently of the placeholder score. */
export const assertAgentTrace = (
  attributes: GenAISemConvAttributes[],
  { question, conversationId }: { question: string; conversationId?: string }
): void => {
  const inputMessages = attributes.flatMap(
    (span) => parseJsonAttr<GenAIInputMessage[]>(span['gen_ai.input.messages']) ?? []
  );
  assert(
    inputMessages.some(
      ({ role, parts }) =>
        role === 'user' &&
        parts.some((part) => part.type === 'text' && part.content.includes(question))
    ),
    'Agent trace must include the actual user question'
  );
  assert(
    conversationId && attributes.some((span) => span['gen_ai.conversation.id'] === conversationId),
    'Agent trace must include the investigation conversation ID'
  );
  const responses = attributes.flatMap(
    (span) => parseJsonAttr<GenAIOutputMessage[]>(span['gen_ai.output.messages']) ?? []
  );
  assert(
    responses.some(({ parts }) => parts.length > 0),
    'Agent trace must include responses'
  );
  for (const field of [
    'gen_ai.system_instructions',
    'gen_ai.tool.call.arguments',
    'gen_ai.tool.call.result',
  ] as const) {
    assert(
      attributes.some((span) => {
        const value = span[field]?.trim();
        return value && !['[]', '{}', 'null'].includes(value);
      }),
      `Agent trace must include nonempty ${field}`
    );
  }
};
