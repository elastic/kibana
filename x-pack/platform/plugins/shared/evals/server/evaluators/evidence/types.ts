/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ToolCallEvidence {
  tool_call_id?: string;
  tool_id?: string;
  arguments?: unknown;
  result?: unknown;
}

export interface EvidenceRound {
  input: { message: string };
  steps: ToolCallEvidence[];
  response: { message: string };
}

export type EvidenceSource = 'traces' | 'logs';
export type EvidenceMessageSelectMode = 'first' | 'last';
export type EvidenceMessageParseMode = 'string' | 'genai_messages' | 'anthropic_message';
export type EvidenceItemKey = 'user_query' | 'agent_response' | 'tool_calls';
export type EvidenceProfile =
  | 'otel-genai-events'
  | 'elastic-inference'
  | 'otel-genai-attributes'
  | 'claude-code'
  | 'agent-builder-tool';

export interface EvidenceFilterTerm {
  field: string;
  value: string;
}

export interface EvidenceMessageItemSpec {
  source: EvidenceSource;
  filter: EvidenceFilterTerm[];
  contentField: string;
  select: EvidenceMessageSelectMode;
  parse: EvidenceMessageParseMode;
}

export interface EvidenceToolCallsItemSpec {
  source: EvidenceSource;
  filter: EvidenceFilterTerm[];
  parse?: 'prefixed_json';
  fields: {
    tool_call_id: string;
    tool_id: string;
    arguments: string;
    result: string;
  };
}

export interface EvidenceMapping {
  user_query: EvidenceMessageItemSpec;
  agent_response: EvidenceMessageItemSpec;
  tool_calls: EvidenceToolCallsItemSpec;
}
