/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClientChatOpenAI } from './language_models/chat_openai';
import { ActionsClientLlm } from './language_models/llm';
import { ActionsClientChatVertexAI } from './language_models/chat_vertex';
import { ActionsClientChatBedrockConverse } from './language_models/chat_bedrock_converse';
import {
  EMPTY_MODEL_RESPONSE_ERROR_CODE,
  EMPTY_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX,
  EmptyModelResponseError,
  isEmptyModelResponseError,
} from './language_models/empty_model_response_error';
import { InferenceClientLlm } from './language_models/inference_client_llm';
import { parseBedrockStream } from './utils/bedrock';
import { parseGeminiResponse } from './utils/gemini';
import {
  MAX_SANITIZED_ERROR_MESSAGE_LENGTH,
  sanitizeErrorMessage,
} from './utils/sanitize_error_message';
import { getDefaultArguments } from './language_models/constants';

export {
  EMPTY_MODEL_RESPONSE_ERROR_CODE,
  EMPTY_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX,
  EmptyModelResponseError,
  isEmptyModelResponseError,
  MAX_SANITIZED_ERROR_MESSAGE_LENGTH,
  parseBedrockStream,
  parseGeminiResponse,
  sanitizeErrorMessage,
  getDefaultArguments,
  ActionsClientChatOpenAI,
  ActionsClientChatVertexAI,
  ActionsClientLlm,
  ActionsClientChatBedrockConverse,
  InferenceClientLlm,
};
