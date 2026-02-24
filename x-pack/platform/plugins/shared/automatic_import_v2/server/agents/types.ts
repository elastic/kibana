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
  /** When set, used as the orchestrator system prompt instead of the default. Used for GEPA evaluation. */
  messageModifier?: string;
}

/** Prompt keys that can be overridden for evaluation (e.g. GEPA). */
export type PromptOverrideKey =
  | 'AUTOMATIC_IMPORT_AGENT_PROMPT'
  | 'LOG_ANALYZER_PROMPT'
  | 'INGEST_PIPELINE_GENERATOR_PROMPT'
  | 'TEXT_TO_ECS_PROMPT';

export type PromptOverrides = Partial<Record<PromptOverrideKey, string>>;
