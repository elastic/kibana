/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIMessage, BaseMessage } from '@langchain/core/messages';

export const containsToolCalls = (
  message: BaseMessage
): message is AIMessage & { tool_calls: Array<{ name: string }> } => {
  return (
    'tool_calls' in message && Array.isArray(message.tool_calls) && message.tool_calls?.length > 0
  );
};
