/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message, ToolOptions } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';

const DO_NOT_CALL_THIS_TOOL = {
  doNotCallThisTool: {
    description: 'Do not call this tool, it is strictly forbidden',
    schema: {
      type: 'object' as const,
      properties: {},
    },
  },
};

export const ensureToolsWhenHistoryHasToolUse = ({
  tools,
  messages,
}: {
  tools?: ToolOptions['tools'];
  messages: Message[];
}): ToolOptions['tools'] | undefined => {
  const hasExistingTools = Object.keys(tools ?? {}).length > 0;
  if (hasExistingTools) {
    return tools;
  }

  const hasToolUse = messages.some(
    (message) =>
      message.role === MessageRole.Tool ||
      (message.role === MessageRole.Assistant && Boolean(message.toolCalls?.length))
  );

  if (!hasToolUse) {
    return tools;
  }

  return DO_NOT_CALL_THIS_TOOL;
};
