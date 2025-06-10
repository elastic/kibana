/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  type ToolIdentifier,
  type AgentIdentifier,
  toSerializedToolIdentifier,
  toSerializedAgentIdentifier,
} from '@kbn/onechat-common';
import type { RunContext } from '@kbn/onechat-server';

export const createEmptyRunContext = ({
  runId = uuidv4(),
}: { runId?: string } = {}): RunContext => {
  return {
    runId,
    stack: [],
  };
};

export const forkContextForToolRun = ({
  toolId,
  parentContext,
}: {
  toolId: ToolIdentifier;
  parentContext: RunContext;
}): RunContext => {
  return {
    ...parentContext,
    stack: [...parentContext.stack, { type: 'tool', toolId: toSerializedToolIdentifier(toolId) }],
  };
};

export const forkContextForAgentRun = ({
  agentId,
  parentContext,
}: {
  agentId: AgentIdentifier;
  parentContext: RunContext;
}): RunContext => {
  return {
    ...parentContext,
    stack: [
      ...parentContext.stack,
      { type: 'agent', agentId: toSerializedAgentIdentifier(agentId) },
    ],
  };
};
