/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StructuredTool } from '@langchain/core/tools';
import type { InferenceChatModel } from '@kbn/inference-langchain';

export interface SubAgentParams {
  name: string;
  description: string;
  prompt: string;
  tools?: StructuredTool[];
  sampleCount?: number;
}

export interface SubAgent {
  name: string;
  description: string;
  prompt: string;
  tools?: StructuredTool[];
}

export interface AutomaticImportAgentParams {
  instructions?: string;
  model: InferenceChatModel;
  subagents: SubAgent[];
}
