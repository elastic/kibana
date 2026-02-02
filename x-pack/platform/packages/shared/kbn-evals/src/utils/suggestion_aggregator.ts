/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ImprovementSuggestion,
  ImprovementSuggestionAnalysisResult,
  ImprovementSuggestionCategory,
  ImprovementSuggestionEvidence,
  ImprovementSuggestionSummary,
  ImprovementSuggestionImpact,
  ImprovementSuggestionConfidence,
} from '../types';

/**
 * Configuration for the suggestion aggregator.
 */
export interface SuggestionAggregatorConfig {
  /**
   * Similarity threshold (0-1) for considering two suggestions as duplicates.
   * Higher values require more similar titles to be considered duplicates.
   * @default 0.8
   */
  similarityThreshold?: number;

  /**
   * Maximum number of suggestions to return after aggregation.
   * @default 10
   */
  maxSuggestions?: number;

  /**
   * Weight for impact score in ranking (0-1).
   * @default 0.4
   */
  impactWeight?: number;

  /**
   * Weight for confidence score in ranking (0-1).
   * @default 0.25
   */
  confidenceWeight?: number;

  /**
   * Weight for evidence count in ranking (0-1).
   * @default 0.2
   */
  evidenceWeight?: number;

  /**
   * Weight for recurrence (same suggestion appearing in multiple experiments) in ranking (0-1).
   * @default 0.15
   */
  recurrenceWeight?: number;

  /**
   * Whether to boost suggestions that appear across multiple experiments.
   * @default true
   */
  boostRecurring?: boolean;

  /**
   * Minimum number of experiments a suggestion must appear in to receive a recurrence boost.
   * @default 2
   */
  minRecurrenceForBoost?: number;
}

/**
 * Metadata about a merged suggestion's sources.
 */
export interface AggregatedSuggestionSource {
  /** The original suggestion ID */
  originalId: string;
  /** The experiment/run ID where this suggestion came from */
  runId: string;
  /** The dataset name */
  datasetName: string;
  /** Original priority score */
  originalPriorityScore?: number;
}

/**
 * An aggregated suggestion with additional metadata about its sources.
 */
export interface AggregatedSuggestion extends ImprovementSuggestion {
  /** Sources that contributed to this aggregated suggestion */
  sources: AggregatedSuggestionSource[];
  /** Number of experiments this suggestion appeared in */
  recurrenceCount: number;
  /** Computed aggregate score used for final ranking */
  aggregateScore: number;
}

/**
 * Result of suggestion aggregation.
 */
export interface SuggestionAggregationResult {
  /** Aggregated and ranked suggestions */
  suggestions: AggregatedSuggestion[];
  /** Summary statistics */
  summary: ImprovementSuggestionSummary;
  /** Aggregation metadata */
  metadata: {
    /** Total suggestions before deduplication */
    totalInputSuggestions: number;
    /** Number of suggestions after deduplication */
    uniqueSuggestions: number;
    /** Number of duplicates merged */
    duplicatesMerged: number;
    /** Number of experiments analyzed */
    experimentsAnalyzed: number;
    /** Run IDs that were aggregated */
    runIds: string[];
    /** Dataset names that were aggregated */
    datasetNames: string[];
    /** Timestamp of aggregation */
    aggregatedAt: string;
  };
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: Required<SuggestionAggregatorConfig> = {
  similarityThreshold: 0.8,
  maxSuggestions: 10,
  impactWeight: 0.4,
  confidenceWeight: 0.25,
  evidenceWeight: 0.2,
  recurrenceWeight: 0.15,
  boostRecurring: true,
  minRecurrenceForBoost: 2,
};

/**
 * Numeric scores for impact levels.
 */
const IMPACT_SCORES: Record<ImprovementSuggestionImpact, number> = {
  high: 1.0,
  medium: 0.6,
  low: 0.3,
};

/**
 * Numeric scores for confidence levels.
 */
const CONFIDENCE_SCORES: Record<ImprovementSuggestionConfidence, number> = {
  high: 1.0,
  medium: 0.7,
  low: 0.4,
};

/**
 * Calculates the Jaccard similarity between two strings based on word tokens.
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score between 0 and 1
 */
function calculateJaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string): Set<string> =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((token) => token.length > 2)
    );

  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 && tokensB.size === 0) {
    return 1;
  }

  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }

  const intersection = new Set([...tokensA].filter((token) => tokensB.has(token)));
  const union = new Set([...tokensA, ...tokensB]);

  return intersection.size / union.size;
}

/**
 * Calculates the Levenshtein distance between two strings.
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[m][n];
}

/**
 * Calculates normalized Levenshtein similarity.
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score between 0 and 1
 */
function calculateLevenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

/**
 * Calculates combined similarity using both Jaccard and Levenshtein methods.
 * @param a - First string
 * @param b - Second string
 * @returns Combined similarity score between 0 and 1
 */
function calculateCombinedSimilarity(a: string, b: string): number {
  const jaccardSim = calculateJaccardSimilarity(a, b);
  const levenshteinSim = calculateLevenshteinSimilarity(a, b);
  // Weight Jaccard higher for semantic similarity
  return jaccardSim * 0.6 + levenshteinSim * 0.4;
}

/**
 * Merges evidence arrays, deduplicating by evaluator name.
 * @param evidenceArrays - Arrays of evidence to merge
 * @returns Merged evidence array
 */
function mergeEvidence(
  evidenceArrays: ImprovementSuggestionEvidence[][]
): ImprovementSuggestionEvidence[] {
  const evidenceMap = new Map<string, ImprovementSuggestionEvidence>();

  for (const evidenceArray of evidenceArrays) {
    for (const evidence of evidenceArray) {
      const existing = evidenceMap.get(evidence.evaluatorName);
      if (existing) {
        // Merge example indices
        const mergedIndices = [
          ...new Set([...existing.exampleIndices, ...evidence.exampleIndices]),
        ].sort((a, b) => a - b);
        evidenceMap.set(evidence.evaluatorName, {
          ...existing,
          exampleIndices: mergedIndices,
          // Average scores if both have them
          score:
            existing.score !== undefined && evidence.score !== undefined
              ? (existing.score + evidence.score) / 2
              : existing.score ?? evidence.score,
          explanation: existing.explanation || evidence.explanation,
        });
      } else {
        evidenceMap.set(evidence.evaluatorName, { ...evidence });
      }
    }
  }

  return Array.from(evidenceMap.values());
}

/**
 * Merges action items, deduplicating similar items.
 * @param actionItemArrays - Arrays of action items to merge
 * @param similarityThreshold - Threshold for considering items duplicates
 * @returns Merged action items array
 */
function mergeActionItems(
  actionItemArrays: (string[] | undefined)[],
  similarityThreshold: number
): string[] {
  const allItems: string[] = [];

  for (const items of actionItemArrays) {
    if (items) {
      for (const item of items) {
        // Check if similar item already exists
        const isDuplicate = allItems.some(
          (existing) => calculateCombinedSimilarity(existing, item) >= similarityThreshold
        );
        if (!isDuplicate) {
          allItems.push(item);
        }
      }
    }
  }

  return allItems;
}

/**
 * Merges tags, deduplicating.
 * @param tagArrays - Arrays of tags to merge
 * @returns Merged and deduplicated tags array
 */
function mergeTags(tagArrays: (string[] | undefined)[]): string[] {
  const tagSet = new Set<string>();
  for (const tags of tagArrays) {
    if (tags) {
      tags.forEach((tag) => tagSet.add(tag.toLowerCase()));
    }
  }
  return Array.from(tagSet);
}

/**
 * Selects the highest impact level from an array.
 * @param impacts - Array of impact levels
 * @returns Highest impact level
 */
function selectHighestImpact(impacts: ImprovementSuggestionImpact[]): ImprovementSuggestionImpact {
  if (impacts.includes('high')) return 'high';
  if (impacts.includes('medium')) return 'medium';
  return 'low';
}

/**
 * Selects the highest confidence level from an array.
 * @param confidences - Array of confidence levels
 * @returns Highest confidence level
 */
function selectHighestConfidence(
  confidences: ImprovementSuggestionConfidence[]
): ImprovementSuggestionConfidence {
  if (confidences.includes('high')) return 'high';
  if (confidences.includes('medium')) return 'medium';
  return 'low';
}

/**
 * Creates a suggestion aggregator instance for deduplicating and ranking
 * improvement suggestions across multiple experiments.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const aggregator = createSuggestionAggregator();
 * const result = aggregator.aggregate([analysisResult1, analysisResult2]);
 *
 * // With custom configuration
 * const aggregator = createSuggestionAggregator({
 *   similarityThreshold: 0.9,
 *   maxSuggestions: 15,
 *   boostRecurring: true,
 * });
 *
 * // Aggregate and get ranked suggestions
 * const result = aggregator.aggregate(results);
 * console.log(result.suggestions); // Ranked, deduplicated suggestions
 * console.log(result.metadata.duplicatesMerged); // Number of duplicates found
 * ```
 *
 * @param config - Configuration options for the aggregator
 * @returns A suggestion aggregator instance
 */
export function createSuggestionAggregator(config: SuggestionAggregatorConfig = {}) {
  const resolvedConfig: Required<SuggestionAggregatorConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  /**
   * Calculates the aggregate score for ranking a suggestion.
   */
  function calculateAggregateScore(
    suggestion: ImprovementSuggestion,
    recurrenceCount: number
  ): number {
    const impactScore = IMPACT_SCORES[suggestion.impact];
    const confidenceScore = CONFIDENCE_SCORES[suggestion.confidence];
    const evidenceScore = Math.min(suggestion.evidence.length / 5, 1); // Normalize to 0-1
    const recurrenceScore =
      resolvedConfig.boostRecurring && recurrenceCount >= resolvedConfig.minRecurrenceForBoost
        ? Math.min(recurrenceCount / 5, 1) // Normalize recurrence to 0-1
        : 0;

    return (
      impactScore * resolvedConfig.impactWeight +
      confidenceScore * resolvedConfig.confidenceWeight +
      evidenceScore * resolvedConfig.evidenceWeight +
      recurrenceScore * resolvedConfig.recurrenceWeight
    );
  }

  /**
   * Finds the best matching suggestion in a cluster for a given suggestion.
   * @param suggestion - The suggestion to match
   * @param clusters - Map of existing suggestion clusters
   * @returns The cluster key if a match is found, undefined otherwise
   */
  function findMatchingCluster(
    suggestion: ImprovementSuggestion,
    clusters: Map<string, AggregatedSuggestion>
  ): string | undefined {
    for (const [key, clusteredSuggestion] of clusters) {
      // First check category match
      if (suggestion.category !== clusteredSuggestion.category) {
        continue;
      }

      // Then check title similarity
      const similarity = calculateCombinedSimilarity(suggestion.title, clusteredSuggestion.title);
      if (similarity >= resolvedConfig.similarityThreshold) {
        return key;
      }

      // Also check description similarity if titles are somewhat similar
      if (similarity >= resolvedConfig.similarityThreshold * 0.7) {
        const descSimilarity = calculateCombinedSimilarity(
          suggestion.description,
          clusteredSuggestion.description
        );
        if (descSimilarity >= resolvedConfig.similarityThreshold) {
          return key;
        }
      }
    }

    return undefined;
  }

  /**
   * Merges a suggestion into an existing aggregated suggestion.
   */
  function mergeSuggestionIntoCluster(
    existing: AggregatedSuggestion,
    newSuggestion: ImprovementSuggestion,
    source: AggregatedSuggestionSource
  ): AggregatedSuggestion {
    // Merge evidence
    const mergedEvidence = mergeEvidence([existing.evidence, newSuggestion.evidence]);

    // Merge action items
    const mergedActionItems = mergeActionItems(
      [existing.actionItems, newSuggestion.actionItems],
      resolvedConfig.similarityThreshold
    );

    // Merge tags
    const mergedTags = mergeTags([existing.tags, newSuggestion.tags]);

    // Select highest impact and confidence
    const impact = selectHighestImpact([existing.impact, newSuggestion.impact]);
    const confidence = selectHighestConfidence([existing.confidence, newSuggestion.confidence]);

    // Update recurrence count
    const newRecurrenceCount = existing.sources.some((s) => s.runId === source.runId)
      ? existing.recurrenceCount
      : existing.recurrenceCount + 1;

    // Calculate new aggregate score
    const aggregateScore = calculateAggregateScore(
      { ...existing, impact, confidence, evidence: mergedEvidence },
      newRecurrenceCount
    );

    return {
      ...existing,
      impact,
      confidence,
      evidence: mergedEvidence,
      actionItems: mergedActionItems.length > 0 ? mergedActionItems : undefined,
      tags: mergedTags.length > 0 ? mergedTags : undefined,
      // Keep the more detailed description
      description:
        newSuggestion.description.length > existing.description.length
          ? newSuggestion.description
          : existing.description,
      sources: [...existing.sources, source],
      recurrenceCount: newRecurrenceCount,
      aggregateScore,
      // Update priority score to reflect merged state
      priorityScore: Math.min((existing.priorityScore || 0) + 0.05, 1),
    };
  }

  /**
   * Creates an aggregated suggestion from a single suggestion.
   */
  function createAggregatedSuggestion(
    suggestion: ImprovementSuggestion,
    source: AggregatedSuggestionSource
  ): AggregatedSuggestion {
    const aggregateScore = calculateAggregateScore(suggestion, 1);

    return {
      ...suggestion,
      sources: [source],
      recurrenceCount: 1,
      aggregateScore,
    };
  }

  /**
   * Creates a summary from aggregated suggestions.
   */
  function createSummary(suggestions: AggregatedSuggestion[]): ImprovementSuggestionSummary {
    const byImpact: Record<ImprovementSuggestionImpact, number> = { high: 0, medium: 0, low: 0 };
    const byCategory: Record<ImprovementSuggestionCategory, number> = {
      prompt: 0,
      tool_selection: 0,
      response_quality: 0,
      context_retrieval: 0,
      reasoning: 0,
      accuracy: 0,
      efficiency: 0,
      other: 0,
    };

    suggestions.forEach((suggestion) => {
      byImpact[suggestion.impact]++;
      byCategory[suggestion.category]++;
    });

    const topPriority = [...suggestions]
      .sort((a, b) => b.aggregateScore - a.aggregateScore)
      .slice(0, 5);

    return {
      totalSuggestions: suggestions.length,
      byImpact,
      byCategory,
      topPriority,
    };
  }

  /**
   * Generates a unique cluster key for a suggestion.
   */
  function generateClusterKey(suggestion: ImprovementSuggestion): string {
    return `${suggestion.category}-${suggestion.title.toLowerCase().replace(/\s+/g, '-')}`;
  }

  /**
   * Aggregates suggestions from multiple analysis results.
   *
   * @param results - Array of analysis results to aggregate
   * @returns Aggregated result with deduplicated and ranked suggestions
   */
  function aggregate(results: ImprovementSuggestionAnalysisResult[]): SuggestionAggregationResult {
    if (results.length === 0) {
      return {
        suggestions: [],
        summary: {
          totalSuggestions: 0,
          byImpact: { high: 0, medium: 0, low: 0 },
          byCategory: {
            prompt: 0,
            tool_selection: 0,
            response_quality: 0,
            context_retrieval: 0,
            reasoning: 0,
            accuracy: 0,
            efficiency: 0,
            other: 0,
          },
          topPriority: [],
        },
        metadata: {
          totalInputSuggestions: 0,
          uniqueSuggestions: 0,
          duplicatesMerged: 0,
          experimentsAnalyzed: 0,
          runIds: [],
          datasetNames: [],
          aggregatedAt: new Date().toISOString(),
        },
      };
    }

    const clusters = new Map<string, AggregatedSuggestion>();
    let totalInputSuggestions = 0;
    const runIds: string[] = [];
    const datasetNames = new Set<string>();

    // Process each result
    for (const result of results) {
      runIds.push(result.metadata.runId);
      datasetNames.add(result.metadata.datasetName);

      for (const suggestion of result.suggestions) {
        totalInputSuggestions++;

        const source: AggregatedSuggestionSource = {
          originalId: suggestion.id,
          runId: result.metadata.runId,
          datasetName: result.metadata.datasetName,
          originalPriorityScore: suggestion.priorityScore,
        };

        // Find matching cluster
        const matchingKey = findMatchingCluster(suggestion, clusters);

        if (matchingKey) {
          // Merge into existing cluster
          const existing = clusters.get(matchingKey)!;
          clusters.set(matchingKey, mergeSuggestionIntoCluster(existing, suggestion, source));
        } else {
          // Create new cluster
          const key = generateClusterKey(suggestion);
          clusters.set(key, createAggregatedSuggestion(suggestion, source));
        }
      }
    }

    // Convert clusters to array and sort by aggregate score
    let aggregatedSuggestions = Array.from(clusters.values()).sort(
      (a, b) => b.aggregateScore - a.aggregateScore
    );

    // Apply max suggestions limit
    aggregatedSuggestions = aggregatedSuggestions.slice(0, resolvedConfig.maxSuggestions);

    const duplicatesMerged = totalInputSuggestions - clusters.size;
    const summary = createSummary(aggregatedSuggestions);

    return {
      suggestions: aggregatedSuggestions,
      summary,
      metadata: {
        totalInputSuggestions,
        uniqueSuggestions: clusters.size,
        duplicatesMerged,
        experimentsAnalyzed: results.length,
        runIds,
        datasetNames: Array.from(datasetNames),
        aggregatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Aggregates suggestions from raw suggestion arrays with metadata.
   *
   * @param suggestionsWithMeta - Array of objects containing suggestions and their metadata
   * @returns Aggregated result with deduplicated and ranked suggestions
   */
  function aggregateRaw(
    suggestionsWithMeta: Array<{
      suggestions: ImprovementSuggestion[];
      runId: string;
      datasetName: string;
    }>
  ): SuggestionAggregationResult {
    // Convert to analysis result format
    const results: ImprovementSuggestionAnalysisResult[] = suggestionsWithMeta.map((item) => ({
      suggestions: item.suggestions,
      summary: createSummary(
        item.suggestions.map((s) => ({
          ...s,
          sources: [],
          recurrenceCount: 1,
          aggregateScore: 0,
        }))
      ),
      metadata: {
        runId: item.runId,
        datasetName: item.datasetName,
        analyzedAt: new Date().toISOString(),
      },
    }));

    return aggregate(results);
  }

  /**
   * Checks if two suggestions are considered duplicates.
   *
   * @param a - First suggestion
   * @param b - Second suggestion
   * @returns True if the suggestions are considered duplicates
   */
  function areDuplicates(a: ImprovementSuggestion, b: ImprovementSuggestion): boolean {
    if (a.category !== b.category) {
      return false;
    }

    const titleSimilarity = calculateCombinedSimilarity(a.title, b.title);
    if (titleSimilarity >= resolvedConfig.similarityThreshold) {
      return true;
    }

    // Check description if titles are somewhat similar
    if (titleSimilarity >= resolvedConfig.similarityThreshold * 0.7) {
      const descSimilarity = calculateCombinedSimilarity(a.description, b.description);
      return descSimilarity >= resolvedConfig.similarityThreshold;
    }

    return false;
  }

  /**
   * Calculates similarity between two suggestions.
   *
   * @param a - First suggestion
   * @param b - Second suggestion
   * @returns Similarity score between 0 and 1
   */
  function calculateSimilarity(a: ImprovementSuggestion, b: ImprovementSuggestion): number {
    const titleSimilarity = calculateCombinedSimilarity(a.title, b.title);
    const descSimilarity = calculateCombinedSimilarity(a.description, b.description);
    const categoryMatch = a.category === b.category ? 1 : 0;

    return titleSimilarity * 0.5 + descSimilarity * 0.3 + categoryMatch * 0.2;
  }

  /**
   * Ranks suggestions by their aggregate score.
   *
   * @param suggestions - Suggestions to rank
   * @returns Ranked suggestions (highest score first)
   */
  function rank(suggestions: ImprovementSuggestion[]): ImprovementSuggestion[] {
    return suggestions
      .map((s, index) => ({
        suggestion: s,
        score: calculateAggregateScore(s, 1),
        originalIndex: index,
      }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.suggestion);
  }

  return {
    aggregate,
    aggregateRaw,
    areDuplicates,
    calculateSimilarity,
    rank,
    createSummary: (suggestions: AggregatedSuggestion[]) => createSummary(suggestions),
  };
}

/**
 * Type for the suggestion aggregator instance.
 */
export type SuggestionAggregator = ReturnType<typeof createSuggestionAggregator>;

// Export utility functions for direct use
export { calculateJaccardSimilarity, calculateLevenshteinSimilarity, calculateCombinedSimilarity };
