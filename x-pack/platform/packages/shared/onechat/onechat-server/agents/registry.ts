/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentType, AgentDescriptor } from '@kbn/onechat-common/agents';
import type { RunAgentParams, RunAgentReturn } from './runner';
import { ConversationalAgentParams, ConversationalAgentResponse, AgentProvider } from './provider';

export interface ExecutableAgentBase<TType extends AgentType, TParams, TResult>
  extends AgentDescriptor {
  type: TType;
  execute: ExecutableAgentHandlerFn<TParams, TResult>;
}

export type ExecutableAgentHandlerParams<TParams = Record<string, unknown>> = Omit<
  RunAgentParams<TParams>,
  'agentId' | 'request'
>;

export type ExecutableAgentHandlerFn<TParams, TResponse> = (
  params: ExecutableAgentHandlerParams<TParams>
) => Promise<RunAgentReturn<TResponse>>;

export type ExecutableConversationalAgent = ExecutableAgentBase<
  AgentType.conversational,
  ConversationalAgentParams,
  ConversationalAgentResponse
>;

export type ExecutableAgent = ExecutableConversationalAgent;

export type AgentRegistry = AgentProvider<ExecutableAgent>;
