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
export type EvidenceSelectMode = 'first' | 'last' | 'all';
export type EvidenceParseMode = 'string' | 'json' | 'genai_messages';
export type EvidenceItemKey = 'user_query' | 'agent_response' | 'tool_calls';

export interface EvidenceFilterTerm {
  field: string;
  value: string;
}

export interface EvidenceItemSpec {
  source: EvidenceSource;
  filter: EvidenceFilterTerm[];
  fields: Record<string, string>;
  select: EvidenceSelectMode;
  parse: EvidenceParseMode;
}

export interface EvidenceMapping {
  user_query: EvidenceItemSpec;
  agent_response: EvidenceItemSpec;
  tool_calls: EvidenceItemSpec;
}

export interface EvidenceItemOverrides {
  source?: EvidenceSource;
  filter?: EvidenceFilterTerm[];
  fields?: Record<string, string>;
  select?: EvidenceSelectMode;
  parse?: EvidenceParseMode;
}

export interface EvidenceMappingOverrides {
  user_query?: EvidenceItemOverrides;
  agent_response?: EvidenceItemOverrides;
  tool_calls?: EvidenceItemOverrides;
}

export interface EvidenceMappingRequest {
  profile: string;
  overrides?: EvidenceMappingOverrides;
}

export interface EvidenceMappingProfileDefinition {
  mapping?: EvidenceMapping;
  extends?: string;
  overrides?: EvidenceMappingOverrides;
}
