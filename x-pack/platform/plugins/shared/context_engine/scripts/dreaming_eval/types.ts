/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** One tool call an agent made in a round, with what came back. */
export interface EvalStep {
  /** What the agent thought before it called the tool. */
  thought?: string;
  tool: string;
  arguments: string;
  result: string;
}

/** One round of a conversation: what the user sent, the tools the agent used, and its answer. */
export interface EvalRound {
  /** ISO 8601 time the user sent the message. */
  startedAt: string;
  user: string;
  steps: EvalStep[];
  answer: string;
}

export interface EvalConversation {
  id: string;
  title: string;
  rounds: EvalRound[];
}

/** What a target says the AI index should know after dreaming. */
export interface EvalTarget {
  id: string;
  dataset: string;
  /** The sample the target is learned from; defaults to `id`, as a benchmark question is one. */
  sample?: string;
  /** The benchmark's question type, or a category of your own. */
  category: string;
  question: string;
  answer: string;
  /** The knowledge itself, as a statement. Optional: without it the question and answer are judged. */
  knowledge?: string;
  /** When the question is asked, for questions about time. */
  askedAt?: string;
  /** Ids of the conversations that hold the answer, when the benchmark says. */
  evidence?: string[];
}

/** The conversations and targets the extract stage writes for one dataset. */
export interface ExtractedDataset {
  dataset: string;
  /** Ids of the samples (questions) the conversations and targets are for. */
  samples: string[];
  /** The conversations of each sample, by id, for running samples one at a time. */
  sampleConversations: Record<string, string[]>;
  agent: { id: string; name: string };
  conversations: EvalConversation[];
  targets: EvalTarget[];
}

/** What the import stage wrote for one dataset, so later stages know where and since when. */
export interface ImportManifest {
  dataset: string;
  index: string;
  agentId: string;
  traceIds: string[];
  rounds: number;
  spans: number;
  earliest: string;
  latest: string;
  importedAt: string;
}

/** A KI as dumped from an AI index after a run: its whole document, so it can be restored. */
export interface DumpedKi {
  id: string;
  type: string;
  title?: string;
  description?: string;
  content?: string;
  attributes?: Record<string, unknown>;
  references?: Array<{ uri: string; relation?: string; description?: string }>;
  updated_at?: string;
  [field: string]: unknown;
}

/** One workflow execution the run stage started. */
export interface WorkflowRunSummary {
  workflowId: string;
  executionId: string;
  status: string;
  durationMs: number;
  output?: Record<string, unknown>;
  error?: string;
}

/** What the run stage writes for one AI index, or for one of its samples. */
export interface KiDump {
  runId: string;
  aiIndexId: string;
  /** Set when samples run one at a time: the sample this dump holds the KIs of. */
  sample?: string;
  dest: string;
  dumpedAt: string;
  workflowRuns: WorkflowRunSummary[];
  counts: Record<string, number>;
  kis: DumpedKi[];
}
