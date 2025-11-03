/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// import { ChatCompletionErrorCode } from '@kbn/inference-common/src/chat_complete/errors';
import {
  isToolNotFoundError,
  isToolValidationError,
  isContextLengthExceededError,
} from '@kbn/inference-common/src/chat_complete/errors';

const foo = (error: any) => {
  if (isToolNotFoundError(error)) {
    console.log('tool not found');
  } else if (isToolValidationError(error)) {
    console.log('tool validation error');
  } else if (isContextLengthExceededError(error)) {
    console.log('context length exceeded');
  }
};

// context length exceeded

// -- bedrock
// 400 - "Input is too long for requested model"

// -- EIS
// 413 - "request_entity_too_large"

// -- Gemini
// 400 - "exceeds the maximum number of tokens allowed"
// Error calling connector: Status code: 400. Message: API Error: INVALID_ARGUMENT: The input token count (1125602) exceeds the maximum number of tokens allowed (1048576)

// -- OpenAI
// 400 - "maximum context length"
// Error calling connector: Status code: 400. Message: API Error: Bad Request - This model's maximum context length is 1047576 tokens. However, your messages resulted in 1047821 tokens (1047777 in the messages, 44 in the functions). Please reduce the length of the messages or functions.

// -- Azure
// 400
// Error: Error calling connector: Status code: 400. Message: API Error: Bad Request - This endpoint's maximum context length is 128000 tokens. However, you requested about 1228825 tokens (1228825 of text input). Please reduce the length of either one, or use the "middle-out" transform to compress your prompt automatically

// invalid tool call
