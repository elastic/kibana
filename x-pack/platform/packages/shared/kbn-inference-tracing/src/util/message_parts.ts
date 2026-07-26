/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GenAIMessagePart,
  GenAITextPart,
  GenAIToolCallPart,
  GenAIToolCallResponsePart,
} from '../types';

export function isTextPart(part: GenAIMessagePart): part is GenAITextPart {
  return part.type === 'text';
}

export function isToolCallPart(part: GenAIMessagePart): part is GenAIToolCallPart {
  return part.type === 'tool_call';
}

export function isToolCallResponsePart(part: GenAIMessagePart): part is GenAIToolCallResponsePart {
  return part.type === 'tool_call_response';
}
