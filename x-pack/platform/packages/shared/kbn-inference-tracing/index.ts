/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export { withChatCompleteSpan } from './src/with_chat_complete_span';
export { withExecuteToolSpan } from './src/with_execute_tool_span';
export { withActiveInferenceSpan } from './src/with_active_inference_span';
export { GenAISemanticConventions, ElasticGenAIAttributes } from './src/types';

export { LangfuseSpanProcessor } from './src/langfuse/langfuse_span_processor';
export { PhoenixSpanProcessor } from './src/phoenix/phoenix_span_processor';
