/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * GitHub issue representation with fields commonly returned from the GitHub Search API.
 */
export interface GitHubIssue {
  /** Unique issue ID (global to GitHub) */
  id: number;
  /** Issue number within the repository */
  number: number;
  /** Issue title */
  title: string;
  /** Issue body/description */
  body?: string;
  /** HTML URL to the issue */
  html_url: string;
  /** Issue state: open or closed */
  state: 'open' | 'closed';
  /** Labels assigned to the issue */
  labels: Array<{
    id: number;
    name: string;
    color?: string;
    description?: string;
  }>;
  /** User who created the issue */
  user: {
    id: number;
    login: string;
    avatar_url?: string;
  };
  /** Assignees */
  assignees?: Array<{
    id: number;
    login: string;
  }>;
  /** Number of comments on the issue */
  comments: number;
  /** Reactions summary */
  reactions?: {
    total_count: number;
    '+1': number;
    '-1': number;
    laugh: number;
    hooray: number;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
  };
  /** Created timestamp */
  created_at: string;
  /** Updated timestamp */
  updated_at: string;
  /** Closed timestamp */
  closed_at?: string;
  /** Repository information */
  repository_url?: string;
  /** Search score from GitHub API */
  score?: number;
  /** Pull request reference (if this issue is a PR) */
  pull_request?: {
    url: string;
    html_url: string;
  };
}

/**
 * Configuration for the issue aggregator.
 */
export interface IssueAggregatorConfig {
  /**
   * Maximum number of issues to return after aggregation.
   * @default 50
   */
  maxIssues?: number;

  /**
   * Weight for reaction count in ranking (0-1).
   * Reactions indicate community interest and issue importance.
   * @default 0.25
   */
  reactionsWeight?: number;

  /**
   * Weight for comment count in ranking (0-1).
   * More comments often indicate active discussion and engagement.
   * @default 0.20
   */
  commentsWeight?: number;

  /**
   * Weight for recency in ranking (0-1).
   * More recent issues may be more relevant.
   * @default 0.20
   */
  recencyWeight?: number;

  /**
   * Weight for GitHub search score in ranking (0-1).
   * GitHub's relevance score from the search API.
   * @default 0.20
   */
  searchScoreWeight?: number;

  /**
   * Weight for label relevance in ranking (0-1).
   * Issues with priority/bug labels may be more important.
   * @default 0.15
   */
  labelWeight?: number;

  /**
   * Priority labels that boost an issue's ranking.
   * @default ['bug', 'critical', 'urgent', 'high-priority', 'p0', 'p1']
   */
  priorityLabels?: string[];

  /**
   * Recency decay factor in days.
   * Issues older than this many days receive reduced recency scores.
   * @default 30
   */
  recencyDecayDays?: number;

  /**
   * Whether to prefer open issues over closed ones.
   * @default true
   */
  preferOpen?: boolean;

  /**
   * Weight modifier for open issues (multiplied with final score).
   * @default 1.2
   */
  openIssueBoost?: number;
}

/**
 * Aggregated issue with deduplication metadata and computed ranking score.
 */
export interface AggregatedIssue extends GitHubIssue {
  /** Number of times this issue appeared in search results */
  occurrenceCount: number;
  /** Source queries/searches that returned this issue */
  sources: IssueSource[];
  /** Computed aggregate score used for ranking */
  aggregateScore: number;
  /** Breakdown of score components */
  scoreBreakdown: {
    reactionsScore: number;
    commentsScore: number;
    recencyScore: number;
    searchScore: number;
    labelScore: number;
  };
}

/**
 * Source information for where an issue was found.
 */
export interface IssueSource {
  /** The search query that returned this issue */
  query?: string;
  /** Repository owner/name */
  repository?: string;
  /** Original search score from this source */
  searchScore?: number;
  /** Timestamp when this result was retrieved */
  retrievedAt: string;
}

/**
 * Result of issue aggregation.
 */
export interface IssueAggregationResult {
  /** Aggregated and ranked issues */
  issues: AggregatedIssue[];
  /** Summary statistics */
  summary: {
    /** Total issues before deduplication */
    totalInputIssues: number;
    /** Number of unique issues after deduplication */
    uniqueIssues: number;
    /** Number of duplicates removed */
    duplicatesRemoved: number;
    /** Breakdown by state */
    byState: {
      open: number;
      closed: number;
    };
    /** Top labels across all issues */
    topLabels: Array<{ name: string; count: number }>;
  };
  /** Aggregation metadata */
  metadata: {
    /** Sources that were aggregated */
    sources: string[];
    /** Timestamp of aggregation */
    aggregatedAt: string;
    /** Configuration used */
    config: Required<IssueAggregatorConfig>;
  };
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: Required<IssueAggregatorConfig> = {
  maxIssues: 50,
  reactionsWeight: 0.25,
  commentsWeight: 0.2,
  recencyWeight: 0.2,
  searchScoreWeight: 0.2,
  labelWeight: 0.15,
  priorityLabels: ['bug', 'critical', 'urgent', 'high-priority', 'p0', 'p1', 'security'],
  recencyDecayDays: 30,
  preferOpen: true,
  openIssueBoost: 1.2,
};

/**
 * Generates a unique key for an issue based on repository and issue number.
 * This handles issues from the same repo appearing in multiple searches.
 */
function generateIssueKey(issue: GitHubIssue): string {
  // Extract owner/repo from repository_url or html_url
  const repoMatch =
    issue.repository_url?.match(/repos\/([^/]+\/[^/]+)/) ||
    issue.html_url?.match(/github\.com\/([^/]+\/[^/]+)/);

  const repo = repoMatch ? repoMatch[1] : 'unknown';
  return `${repo}#${issue.number}`;
}

/**
 * Normalizes a value to a 0-1 scale using logarithmic scaling.
 * This prevents issues with very high counts from dominating.
 */
function normalizeLogarithmic(value: number, maxExpected: number = 100): number {
  if (value <= 0) return 0;
  return Math.min(Math.log10(value + 1) / Math.log10(maxExpected + 1), 1);
}

/**
 * Calculates recency score based on issue update time.
 * Returns a value between 0-1, with 1 being most recent.
 */
function calculateRecencyScore(updatedAt: string, decayDays: number): number {
  const now = new Date();
  const updated = new Date(updatedAt);
  const daysSinceUpdate = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceUpdate <= 0) return 1;
  if (daysSinceUpdate >= decayDays * 3) return 0.1; // Minimum score for very old issues

  // Exponential decay
  return Math.max(0.1, Math.exp(-daysSinceUpdate / decayDays));
}

/**
 * Calculates label relevance score based on priority labels.
 */
function calculateLabelScore(labels: GitHubIssue['labels'], priorityLabels: string[]): number {
  if (!labels || labels.length === 0) return 0;

  const normalizedPriorityLabels = priorityLabels.map((l) => l.toLowerCase());
  let score = 0;

  for (const label of labels) {
    const normalizedName = label.name.toLowerCase();
    if (normalizedPriorityLabels.some((pl) => normalizedName.includes(pl))) {
      score += 0.5;
    }
    // Bonus for having any labels (shows issue is triaged)
    score += 0.1;
  }

  return Math.min(score, 1);
}

/**
 * Calculates total reactions score.
 */
function calculateReactionsScore(reactions?: GitHubIssue['reactions']): number {
  if (!reactions) return 0;

  // Weight positive reactions higher
  const weightedCount =
    reactions['+1'] * 1.5 +
    reactions.heart * 1.5 +
    reactions.rocket * 1.2 +
    reactions.hooray * 1.0 +
    reactions.eyes * 0.8 +
    reactions.laugh * 0.5 +
    reactions.confused * 0.3 +
    reactions['-1'] * 0.1;

  return normalizeLogarithmic(weightedCount, 50);
}

/**
 * Creates an issue aggregator for deduplicating and ranking GitHub issues.
 *
 * @example
 * ```typescript
 * const aggregator = createIssueAggregator();
 * const result = aggregator.aggregate(issues);
 *
 * // With custom configuration
 * const aggregator = createIssueAggregator({
 *   maxIssues: 20,
 *   reactionsWeight: 0.3,
 *   preferOpen: true,
 * });
 * ```
 *
 * @param config - Configuration options
 * @returns Issue aggregator instance
 */
export function createIssueAggregator(config: IssueAggregatorConfig = {}) {
  const resolvedConfig: Required<IssueAggregatorConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  /**
   * Calculates the aggregate score for ranking an issue.
   */
  function calculateAggregateScore(
    issue: GitHubIssue,
    occurrenceCount: number,
    sources: IssueSource[]
  ): { score: number; breakdown: AggregatedIssue['scoreBreakdown'] } {
    // Calculate individual component scores
    const reactionsScore = calculateReactionsScore(issue.reactions);
    const commentsScore = normalizeLogarithmic(issue.comments, 50);
    const recencyScore = calculateRecencyScore(issue.updated_at, resolvedConfig.recencyDecayDays);
    const labelScore = calculateLabelScore(issue.labels, resolvedConfig.priorityLabels);

    // Use the best search score from all sources, or default to 0.5
    const searchScore = Math.max(
      ...sources.map((s) => (s.searchScore ? normalizeLogarithmic(s.searchScore, 100) : 0.5)),
      issue.score ? normalizeLogarithmic(issue.score, 100) : 0.5
    );

    // Calculate weighted sum
    let score =
      reactionsScore * resolvedConfig.reactionsWeight +
      commentsScore * resolvedConfig.commentsWeight +
      recencyScore * resolvedConfig.recencyWeight +
      searchScore * resolvedConfig.searchScoreWeight +
      labelScore * resolvedConfig.labelWeight;

    // Boost for appearing in multiple searches
    if (occurrenceCount > 1) {
      score *= 1 + Math.log10(occurrenceCount) * 0.1;
    }

    // Boost for open issues if configured
    if (resolvedConfig.preferOpen && issue.state === 'open') {
      score *= resolvedConfig.openIssueBoost;
    }

    return {
      score: Math.min(score, 1),
      breakdown: {
        reactionsScore,
        commentsScore,
        recencyScore,
        searchScore,
        labelScore,
      },
    };
  }

  /**
   * Aggregates and deduplicates issues from multiple sources.
   *
   * @param issues - Array of issues to aggregate
   * @param sourceMeta - Optional metadata about the source (query, repository)
   * @returns Aggregation result with deduplicated, ranked issues
   */
  function aggregate(
    issues: GitHubIssue[],
    sourceMeta?: { query?: string; repository?: string }
  ): IssueAggregationResult {
    const issueMap = new Map<string, AggregatedIssue>();
    const labelCounts = new Map<string, number>();
    let openCount = 0;
    let closedCount = 0;

    const now = new Date().toISOString();

    for (const issue of issues) {
      const key = generateIssueKey(issue);
      const source: IssueSource = {
        query: sourceMeta?.query,
        repository: sourceMeta?.repository,
        searchScore: issue.score,
        retrievedAt: now,
      };

      // Track label frequencies
      for (const label of issue.labels || []) {
        labelCounts.set(label.name, (labelCounts.get(label.name) || 0) + 1);
      }

      // Track state counts
      if (issue.state === 'open') {
        openCount++;
      } else {
        closedCount++;
      }

      const existing = issueMap.get(key);
      if (existing) {
        // Merge duplicate - increment occurrence count and add source
        existing.occurrenceCount++;
        existing.sources.push(source);

        // Recalculate score with updated occurrence count
        const { score, breakdown } = calculateAggregateScore(
          existing,
          existing.occurrenceCount,
          existing.sources
        );
        existing.aggregateScore = score;
        existing.scoreBreakdown = breakdown;

        // Keep the more recent data
        if (new Date(issue.updated_at) > new Date(existing.updated_at)) {
          existing.comments = issue.comments;
          existing.reactions = issue.reactions;
          existing.updated_at = issue.updated_at;
          existing.state = issue.state;
        }
      } else {
        // New unique issue
        const sources = [source];
        const { score, breakdown } = calculateAggregateScore(issue, 1, sources);

        const aggregatedIssue: AggregatedIssue = {
          ...issue,
          occurrenceCount: 1,
          sources,
          aggregateScore: score,
          scoreBreakdown: breakdown,
        };

        issueMap.set(key, aggregatedIssue);
      }
    }

    // Sort by aggregate score and apply limit
    const rankedIssues = Array.from(issueMap.values())
      .sort((a, b) => b.aggregateScore - a.aggregateScore)
      .slice(0, resolvedConfig.maxIssues);

    // Get top labels
    const topLabels = Array.from(labelCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Collect unique sources
    const allSources = new Set<string>();
    for (const issue of rankedIssues) {
      for (const source of issue.sources) {
        if (source.query) allSources.add(source.query);
        if (source.repository) allSources.add(source.repository);
      }
    }

    return {
      issues: rankedIssues,
      summary: {
        totalInputIssues: issues.length,
        uniqueIssues: issueMap.size,
        duplicatesRemoved: issues.length - issueMap.size,
        byState: {
          open: openCount,
          closed: closedCount,
        },
        topLabels,
      },
      metadata: {
        sources: Array.from(allSources),
        aggregatedAt: now,
        config: resolvedConfig,
      },
    };
  }

  /**
   * Aggregates issues from multiple search results.
   *
   * @param searchResults - Array of search results with their metadata
   * @returns Aggregation result
   */
  function aggregateMultiple(
    searchResults: Array<{
      issues: GitHubIssue[];
      query?: string;
      repository?: string;
    }>
  ): IssueAggregationResult {
    // Flatten all issues while preserving source metadata
    const allIssues: Array<{ issue: GitHubIssue; meta: { query?: string; repository?: string } }> =
      [];

    for (const result of searchResults) {
      for (const issue of result.issues) {
        allIssues.push({
          issue,
          meta: { query: result.query, repository: result.repository },
        });
      }
    }

    const issueMap = new Map<string, AggregatedIssue>();
    const labelCounts = new Map<string, number>();
    let openCount = 0;
    let closedCount = 0;

    const now = new Date().toISOString();

    for (const { issue, meta } of allIssues) {
      const key = generateIssueKey(issue);
      const source: IssueSource = {
        query: meta.query,
        repository: meta.repository,
        searchScore: issue.score,
        retrievedAt: now,
      };

      // Track labels
      for (const label of issue.labels || []) {
        labelCounts.set(label.name, (labelCounts.get(label.name) || 0) + 1);
      }

      // Track states
      if (issue.state === 'open') {
        openCount++;
      } else {
        closedCount++;
      }

      const existing = issueMap.get(key);
      if (existing) {
        existing.occurrenceCount++;
        existing.sources.push(source);

        const { score, breakdown } = calculateAggregateScore(
          existing,
          existing.occurrenceCount,
          existing.sources
        );
        existing.aggregateScore = score;
        existing.scoreBreakdown = breakdown;

        if (new Date(issue.updated_at) > new Date(existing.updated_at)) {
          existing.comments = issue.comments;
          existing.reactions = issue.reactions;
          existing.updated_at = issue.updated_at;
          existing.state = issue.state;
        }
      } else {
        const sources = [source];
        const { score, breakdown } = calculateAggregateScore(issue, 1, sources);

        issueMap.set(key, {
          ...issue,
          occurrenceCount: 1,
          sources,
          aggregateScore: score,
          scoreBreakdown: breakdown,
        });
      }
    }

    const rankedIssues = Array.from(issueMap.values())
      .sort((a, b) => b.aggregateScore - a.aggregateScore)
      .slice(0, resolvedConfig.maxIssues);

    const topLabels = Array.from(labelCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const allSources = new Set<string>();
    for (const result of searchResults) {
      if (result.query) allSources.add(result.query);
      if (result.repository) allSources.add(result.repository);
    }

    return {
      issues: rankedIssues,
      summary: {
        totalInputIssues: allIssues.length,
        uniqueIssues: issueMap.size,
        duplicatesRemoved: allIssues.length - issueMap.size,
        byState: { open: openCount, closed: closedCount },
        topLabels,
      },
      metadata: {
        sources: Array.from(allSources),
        aggregatedAt: now,
        config: resolvedConfig,
      },
    };
  }

  /**
   * Checks if two issues are duplicates (same issue from same repo).
   *
   * @param a - First issue
   * @param b - Second issue
   * @returns True if issues are duplicates
   */
  function areDuplicates(a: GitHubIssue, b: GitHubIssue): boolean {
    return generateIssueKey(a) === generateIssueKey(b);
  }

  /**
   * Ranks issues by their computed aggregate score.
   *
   * @param issues - Issues to rank
   * @returns Ranked issues (highest score first)
   */
  function rank(issues: GitHubIssue[]): GitHubIssue[] {
    return issues
      .map((issue) => {
        const { score } = calculateAggregateScore(issue, 1, []);
        return { issue, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((item) => item.issue);
  }

  /**
   * Deduplicates issues without changing order.
   *
   * @param issues - Issues to deduplicate
   * @returns Deduplicated issues preserving original order
   */
  function deduplicate(issues: GitHubIssue[]): GitHubIssue[] {
    const seen = new Set<string>();
    return issues.filter((issue) => {
      const key = generateIssueKey(issue);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  return {
    aggregate,
    aggregateMultiple,
    areDuplicates,
    rank,
    deduplicate,
    generateIssueKey,
    calculateAggregateScore: (issue: GitHubIssue) => calculateAggregateScore(issue, 1, []).score,
  };
}

/**
 * Type for the issue aggregator instance.
 */
export type IssueAggregator = ReturnType<typeof createIssueAggregator>;
