/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  extractTextContent,
  extractToolCalls,
  extractToolCallsWithReasoning,
  extractToolReturn,
  createUserMessage,
  createAIMessage,
  createToolResultMessage,
  createToolCallMessage,
  generateFakeToolCallId,
  type ToolCall,
  type ToolCallWithReasoning,
} from '@kbn/agent-builder-esql-utils/langchain/messages';
