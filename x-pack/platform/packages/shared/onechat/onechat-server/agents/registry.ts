/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDescriptor } from '@kbn/onechat-common/agents';
import type { RunAgentParams, RunAgentReturn } from './runner';
import type { AgentProvider } from './provider';

export type ExecutableAgentHandlerParams = Omit<RunAgentParams, 'agentId' | 'request'>;

export type ExecutableAgentHandlerFn = (
  params: ExecutableAgentHandlerParams
) => Promise<RunAgentReturn>;

export interface ExecutableAgent extends AgentDescriptor {
  execute: ExecutableAgentHandlerFn;
}

export type AgentRegistry = AgentProvider<ExecutableAgent>;
