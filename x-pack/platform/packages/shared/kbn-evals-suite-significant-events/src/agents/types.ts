/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A single tool call record captured during an agent inference loop.
 */
export interface ToolCallRecord {
  tool_id: string;
  tool_call_id: string;
  params: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

/**
 * Per-evidence ES|QL execution record.
 * Keyed by normalized esql_query string (trimmed + collapsed whitespace).
 */
export interface EvidenceEsqlRecord {
  called: boolean;
  returned_rows: boolean;
  tool_call_id: string;
}

/**
 * Tool usage summary for the discovery investigator agent.
 */
export interface DiscoveryInvestigatorToolUsage {
  tool_call_records: ToolCallRecord[];
  total_calls: number;
  failures: number;
  execute_esql_per_evidence: Record<string, EvidenceEsqlRecord>;
}

/**
 * Tool usage summary for the discovery judge agent.
 */
export interface JudgeToolUsage {
  tool_call_records: ToolCallRecord[];
  total_calls: number;
  failures: number;
  execute_esql_per_evidence: Record<string, EvidenceEsqlRecord>;
}
