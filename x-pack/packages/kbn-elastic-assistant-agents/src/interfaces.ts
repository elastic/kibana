/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AgentInterface {
  id: string;
  name: string;
  description: string;
  visibility?: FunctionVisibility;
  isSupported?: (params: AssistantToolParams) => boolean;
  sourceRegister?: string;
  execute: (params: AgentParams) => Promise<AgentResponse>;
}

export interface AgentParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  request: KibanaRequest<unknown, unknown, unknown>;
  // Additional parameters can be added as needed
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentResponse {}
