/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Classifies what kind of knowledge the memory node holds.
 * - semantic: durable facts about the user/project/preferences
 * - episodic: events and decisions from specific rounds
 * - procedural: behavior rules and preferences observed over time
 */
export type MemoryType = 'semantic' | 'episodic' | 'procedural';

/**
 * Lifecycle status of a memory node.
 * Nodes progress through stages based on reinforcement signals and consolidation.
 *
 * candidate    -> provisional  (reinforcement_score >= 0.3)
 * provisional  -> established  (reinforcement_score >= 0.6)
 * established  -> consolidated (stability >= 0.8 AND age > 7 days AND reinforcement_score >= 0.7)
 * any          -> suspect      (negative signals: misleading, incorrect, outdated)
 * suspect      -> provisional  (new positive signals) OR deprecated (no recovery)
 * deprecated   -> [soft-deleted after 30 days]
 */
export type MemoryStatus =
  | 'candidate'
  | 'provisional'
  | 'established'
  | 'consolidated'
  | 'suspect'
  | 'deprecated';

/**
 * Typed edge between memory nodes in the knowledge graph.
 * Symmetric edges (related_to, same_project) are maintained bidirectionally.
 */
export type MemoryEdgeType =
  | 'related_to'
  | 'applies_to'
  | 'derived_from'
  | 'contradicts'
  | 'same_project'
  | 'preference_cluster'
  | 'refines';

/**
 * A reference back to the conversation/round that produced or referenced this memory.
 */
export interface MemorySourceRef {
  /** ID of the conversation that produced this memory */
  conversation_id: string;
  /** ID of the round within the conversation */
  round_id: string;
  /** Optional: specific message IDs within the round */
  message_ids?: string[];
}

/**
 * A directed edge from one memory node to another in the knowledge graph.
 * Weight represents confidence/relevance of the relationship (0.0 – 1.0).
 */
export interface MemoryLink {
  /** ID of the target memory node */
  target_id: string;
  /** Semantic relationship type */
  type: MemoryEdgeType;
  /** Strength of the relationship (0.0 – 1.0) */
  weight: number;
}

/**
 * Retrieval stage indicating when memories are being retrieved.
 * Each stage has different token budgets and type-specific scoring weights.
 */
export type RetrievalStage = 'round_start' | 'tool_checkpoint' | 'final_answer' | 'memory_expand';

/**
 * A memory node represents a unit of extracted, structured knowledge.
 * Memory is distinct from conversation history: it is abstracted, scored, and self-correcting.
 */
export interface MemoryNode {
  /** Unique identifier for this memory node */
  id: string;

  /** What kind of knowledge this memory holds */
  type: MemoryType;

  /**
   * Fine-grained classification within the type.
   * Examples for semantic: 'user_preference', 'project_fact', 'tool_preference'
   * Examples for episodic: 'decision', 'error_observed', 'task_completed'
   * Examples for procedural: 'workflow_step', 'validation_rule', 'coding_standard'
   */
  subtype?: string;

  /**
   * Concise one-line summary of the memory (used for injection into context).
   * Must be under ~100 tokens.
   */
  summary: string;

  /**
   * Full content of the memory (used when the agent calls remember() with full=true).
   * May be up to ~500 tokens.
   */
  full: string;

  /**
   * How confident we are that this memory is accurate (0.0 – 1.0).
   * Derived from extraction confidence and reinforcement signals.
   */
  confidence: number;

  /**
   * How important/prominent this memory is relative to others (0.0 – 1.0).
   * High-salience memories are prioritized for retrieval.
   */
  salience: number;

  /**
   * Timestamp of the last time this memory was retrieved or used (ISO 8601 string).
   * Used for recency scoring.
   */
  recency: string;

  /**
   * How useful this memory has proven to be across its retrieval history (0.0 – 1.0).
   * Increases when the agent successfully uses a memory, decays when unused.
   */
  utility: number;

  /**
   * How stable this memory is over time (0.0 – 1.0).
   * Computed as: (age_days / 30) * (1 - decay_rate) * normalized_reinforcement
   */
  stability: number;

  /** Number of times this memory has been retrieved or accessed */
  access_count: number;

  /**
   * Cumulative reinforcement score driving status promotion (0.0 – 1.0+).
   * Positive signals increase it; negative signals decrease it.
   */
  reinforcement_score: number;

  /** Current lifecycle status */
  status: MemoryStatus;

  /** Conversation rounds that produced or referenced this memory */
  source_refs: MemorySourceRef[];

  /** Graph edges connecting this node to related memory nodes */
  links: MemoryLink[];

  /** When this memory was first created (ISO 8601 string) */
  created_at: string;

  /** When this memory was last modified (ISO 8601 string) */
  updated_at: string;

  /** Space ID for multi-tenancy isolation */
  space: string;

  /** User ID for per-user memory isolation */
  user_id?: string;

  /** Username for per-user memory isolation */
  user_name: string;

  // ---- Optional fields ----

  /** When this memory was last retrieved by the agent (ISO 8601 string) */
  last_used_at?: string;

  /** When a reinforcement signal was last applied (ISO 8601 string) */
  last_reinforced_at?: string;

  /** IDs of memory nodes that contradict this memory */
  conflict_refs?: string[];

  /**
   * Per-stage retrieval statistics for calibrating scoring.
   * Keys are RetrievalStage values.
   */
  retrieval_stats_by_stage?: Partial<Record<RetrievalStage, MemoryRetrievalStats>>;
}

/**
 * Statistics about how often a memory has been retrieved at each stage.
 */
export interface MemoryRetrievalStats {
  /** Number of times retrieved at this stage */
  count: number;
  /** Number of times actually used by the agent after retrieval */
  used_count: number;
}

/**
 * Request to create a new memory node.
 * id, created_at, updated_at are auto-generated by the service.
 */
export interface MemoryCreateRequest {
  type: MemoryType;
  subtype?: string;
  summary: string;
  full: string;
  confidence: number;
  salience?: number;
  utility?: number;
  stability?: number;
  status?: MemoryStatus;
  source_refs?: MemorySourceRef[];
  links?: MemoryLink[];
  space: string;
  user_id?: string;
  user_name: string;
}

/**
 * Request to update an existing memory node.
 * All fields except id are optional.
 */
export interface MemoryUpdateRequest {
  id: string;
  summary?: string;
  full?: string;
  confidence?: number;
  salience?: number;
  recency?: string;
  utility?: number;
  stability?: number;
  access_count?: number;
  reinforcement_score?: number;
  status?: MemoryStatus;
  source_refs?: MemorySourceRef[];
  links?: MemoryLink[];
  last_used_at?: string;
  last_reinforced_at?: string;
  conflict_refs?: string[];
  retrieval_stats_by_stage?: Partial<Record<RetrievalStage, MemoryRetrievalStats>>;
}

/**
 * Options for listing memory nodes.
 */
export interface MemoryListOptions {
  /** Filter by memory type */
  type?: MemoryType;
  /** Filter by memory status or statuses */
  status?: MemoryStatus | MemoryStatus[];
  /** Filter by space */
  space?: string;
  /** Filter by user */
  user_id?: string;
  user_name?: string;
  /** Maximum number of results (defaults to 100) */
  size?: number;
  /** Pagination offset */
  from?: number;
}

/**
 * Options for hybrid search over memory nodes.
 */
export interface MemorySearchOptions {
  /** Filter by memory type */
  type?: MemoryType;
  /** Only return memories with these statuses (defaults to provisional|established|consolidated) */
  status?: MemoryStatus[];
  /** Filter by space */
  space?: string;
  /** Filter by user */
  user_id?: string;
  user_name?: string;
  /** Maximum number of results (defaults to 10) */
  size?: number;
  /** Retrieval stage for stage-specific scoring */
  stage?: RetrievalStage;
}
