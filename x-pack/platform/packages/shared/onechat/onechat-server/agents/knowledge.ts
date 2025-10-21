/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';

export interface AgentKnowledge {
  /** unique id for the knowledge */
  id: string;
  /** human-readable name */
  name: string;
  /** human-readable description */
  description: string;
  /** configuration or accessor function */
  configuration: KnowledgeConfiguration | KnowledgeConfigurationProvider;
}

export interface AgentKnowledgeResolverContext {
  request: KibanaRequest;
}

export interface KnowledgeConfiguration {
  /** additional instructions which will be appended to the default ones */
  instructions?: string | KnowledgePerStepInstructions;
  /** context which will be appended to the conversation for each round */
  context?: string;
}

export type KnowledgeConfigurationProvider = (
  context: AgentKnowledgeResolverContext
) => MaybePromise<KnowledgeConfiguration>;

export interface KnowledgePerStepInstructions {
  research?: string;
  answer?: string;
}
