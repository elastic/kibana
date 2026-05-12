/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared types for @kbn/evals-extensions
 *
 * NOTE: This package depends on @kbn/evals but @kbn/evals does NOT depend on this package.
 * Keep types that need to be shared with core @kbn/evals in @kbn/evals itself.
 *
 * Types here are specific to extension features and will be populated as features are added.
 */

/**
 * Placeholder type to ensure package builds
 * Will be replaced/extended as features are added in subsequent PRs
 */
export interface ExtensionPlaceholder {
  version: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Confidence interval
// ---------------------------------------------------------------------------

/** Bootstrap confidence interval for a numeric metric. */
export interface ConfidenceInterval {
  lower: number;
  upper: number;
  mean: number;
  /** Confidence level, e.g. 0.95 for a 95% CI. */
  level: number;
}

// ---------------------------------------------------------------------------
// A/B testing — pairwise evaluation
// ---------------------------------------------------------------------------

/** Per-evaluator comparison result for a pairwise A/B experiment. */
export interface PairwiseEvaluatorResult {
  evaluator: string;
  scoreA: number;
  scoreB: number;
  /** Mean(A) − Mean(B). Positive means A is better. */
  delta: number;
  direction: 'A_better' | 'B_better' | 'tie';
}

/** Single LLM-as-judge comparison result for one example in a pairwise experiment. */
export interface PairwiseJudgeResult {
  exampleIndex: number;
  winner: 'A' | 'B' | 'tie';
  explanation: string;
  /** Judge confidence in [0, 1]. Used as the vote weight in winner determination. */
  confidence: number;
}

/** Statistical significance result from a permutation test on two score arrays. */
export interface SignificanceResult {
  significant: boolean;
  /** Two-sided p-value from the permutation test. Absent when data is insufficient. */
  pValue?: number;
  confidenceInterval: ConfidenceInterval;
  recommendation: string;
}

/** Complete result of a pairwise A/B experiment analysis. */
export interface PairwiseExperimentResult {
  skillAId: string;
  skillBId: string;
  datasetId: string;
  perEvaluator: PairwiseEvaluatorResult[];
  pairwiseJudgeResults?: PairwiseJudgeResult[];
  aggregateWinner: 'A' | 'B' | 'tie';
  significance: SignificanceResult;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Dataset management
// ---------------------------------------------------------------------------

/** A named subset of a dataset with its example count. */
export interface DatasetSplit {
  name: string;
  exampleCount: number;
}

/** An immutable record of a mutation applied to a dataset at a point in time. */
export interface DatasetVersion {
  datasetId: string;
  /** ISO-8601 timestamp of when this mutation was recorded. */
  timestamp: string;
  mutationType: 'create' | 'add' | 'remove' | 'update';
  exampleIds: string[];
  /** Optional human-readable tag (e.g. "v1.0", "golden-set"). */
  tag?: string;
  metadata?: Record<string, unknown>;
}

/** Summary statistics for a versioned dataset. */
export interface DatasetStats {
  totalExamples: number;
  splits: DatasetSplit[];
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  /** Map of tag name → ISO-8601 timestamp when that tag was applied. */
  tags: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Composite scoring
// ---------------------------------------------------------------------------

/** Configuration for computing a weighted composite score across dimensions. */
export interface CompositeScoreConfig {
  /**
   * Map of dimension name → evaluator names that contribute to it.
   * The dimension score is the unweighted mean of its evaluators' scores.
   */
  dimensions: Record<string, string[]>;
  /** Map of dimension name → weight. Weights are renormalized if dimensions are missing. */
  weights: Record<string, number>;
}

/** Result of computing a composite score from evaluator results. */
export interface CompositeScoreResult {
  /** Weighted composite score in [0, 1]. */
  compositeScore: number;
  /** Letter grade derived from the composite score. */
  compositeGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  /** Per-dimension scores. */
  dimensionScores: Record<string, number>;
}

// ---------------------------------------------------------------------------
// CI gates
// ---------------------------------------------------------------------------

/** A single gate failure describing what was expected vs. actual. */
export interface GateFailure {
  /** Gate type identifier. */
  gate: 'composite-threshold' | 'required-pass' | 'per-evaluator-min';
  /** Evaluator name, present for evaluator-scoped gates. */
  evaluator?: string;
  expected: number;
  actual: number;
  message: string;
}

/** Configuration for CI quality gates. */
export interface CiGateConfig {
  /** Minimum allowed composite score. */
  compositeThreshold?: number;
  /** Evaluators that must produce a non-zero (passing) score. */
  requiredPass?: string[];
  /** Per-evaluator minimum score thresholds. */
  perEvaluator?: Record<string, { min?: number }>;
}

/** Result of evaluating CI gates against a set of scores. */
export interface CiGateResult {
  passed: boolean;
  failedGates: GateFailure[];
}

// ---------------------------------------------------------------------------
// Adapter output types — used by CODE evaluators
// ---------------------------------------------------------------------------

/**
 * A single tool call record captured in adapter output.
 */
export interface ToolCallRecord {
  /** Name of the tool that was called. */
  toolName: string;
  /** Arguments passed to the tool. */
  args: Record<string, unknown>;
}

/**
 * Structured output produced by an adapter after running a skill.
 * CODE evaluators receive this as their `output` parameter.
 */
export interface AdapterOutput {
  /** Ordered list of tool calls made during the run. */
  toolCalls: ToolCallRecord[];
  /** Final text response from the agent, if any. */
  response?: string;
  /** Any additional metadata captured by the adapter. */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Trial / repetition metrics
// ---------------------------------------------------------------------------

/**
 * pass@k and pass^k metrics computed over repeated trials.
 *
 * - `passAtK[i]`: probability that at least one of (i+1) trials passes (optimistic).
 * - `passToTheK[i]`: probability that all (i+1) trials pass (pessimistic).
 */
export interface TrialMetrics {
  passAtK: number[];
  passToTheK: number[];
  /** Number of repetitions used to compute these metrics. */
  repetitions: number;
}
