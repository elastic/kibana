/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { OutputAPI } from '@kbn/inference-common';
import type { EvaluationScoreRepository } from './score_repository';
import { parseScoreDocuments } from './score_repository';
import {
  calculateEvaluatorStats,
  calculateOverallStats,
  getUniqueEvaluatorNames,
  type EvaluatorStats,
  type DatasetScoreWithStats,
} from './evaluation_stats';
import {
  createImprovementAnalyzer,
  type ImprovementAnalyzerConfig,
  type ImprovementAnalyzer,
} from './improvement_analyzer';
import type {
  RanExperiment,
  ImprovementSuggestionAnalysisResult,
  ImprovementSuggestionCategory,
} from '../types';

/**
 * Comparison result between two evaluation metrics
 */
export interface MetricComparison {
  dataset: string;
  evaluator: string;
  currentScore: number;
  referenceScore: number;
  difference: number;
  percentageChange: number;
  isImprovement: boolean;
  isRegression: boolean;
  /** Detailed stats for current run */
  currentStats?: EvaluatorStats;
  /** Detailed stats for reference run */
  referenceStats?: EvaluatorStats;
}

/**
 * Summary of comparison results
 */
export interface ComparisonSummary {
  totalComparisons: number;
  improvements: number;
  regressions: number;
  noChange: number;
  /** Average improvement percentage (for improved metrics only) */
  avgImprovementPercent?: number;
  /** Average regression percentage (for regressed metrics only) */
  avgRegressionPercent?: number;
}

/**
 * Run metadata
 */
export interface RunMetadata {
  runId: string;
  timestamp?: string;
  model?: string;
  datasetCount?: number;
  evaluatorCount?: number;
}

/**
 * Result of comparing two evaluation runs
 */
export interface CompareRunsResult {
  comparison: MetricComparison[];
  summary: ComparisonSummary;
  metadata: {
    currentRun: RunMetadata;
    referenceRun: RunMetadata;
  };
  /** Overall statistics for current run across all datasets */
  currentOverallStats?: Map<string, EvaluatorStats>;
  /** Overall statistics for reference run across all datasets */
  referenceOverallStats?: Map<string, EvaluatorStats>;
}

/**
 * Result of analyzing a single evaluation run
 */
export interface AnalyzeRunResult {
  runId: string;
  timestamp?: string;
  model?: string;
  datasetScores: DatasetScoreWithStats[];
  overallStats: Map<string, EvaluatorStats>;
  evaluatorNames: string[];
  /** Optional improvement suggestions if analyzer is configured */
  improvementSuggestions?: ImprovementSuggestionAnalysisResult;
}

/**
 * Result of trend analysis across multiple runs
 */
export interface TrendAnalysisResult {
  evaluator: string;
  dataset?: string;
  trend: 'improving' | 'declining' | 'stable' | 'volatile';
  scores: Array<{
    runId: string;
    timestamp?: string;
    score: number;
  }>;
  /** Linear regression slope */
  slope?: number;
  /** Average score across runs */
  average: number;
  /** Standard deviation across runs */
  stdDev: number;
}

/**
 * Configuration for EvaluationAnalysisService
 */
export interface EvaluationAnalysisServiceConfig {
  /** Threshold for considering a change as improvement/regression (default: 0.001) */
  significanceThreshold?: number;
  /** Improvement analyzer configuration */
  improvementAnalyzerConfig?: ImprovementAnalyzerConfig;
}

/**
 * Service for analyzing evaluation results with support for comparisons,
 * trend analysis, and improvement suggestions.
 */
export class EvaluationAnalysisService {
  private readonly significanceThreshold: number;
  private readonly improvementAnalyzer: ImprovementAnalyzer | null;

  constructor(
    private readonly scoreRepository: EvaluationScoreRepository,
    private readonly log: SomeDevLog,
    config: EvaluationAnalysisServiceConfig = {}
  ) {
    this.significanceThreshold = config.significanceThreshold ?? 0.001;

    // Initialize improvement analyzer if configured
    if (config.improvementAnalyzerConfig) {
      this.improvementAnalyzer = createImprovementAnalyzer(config.improvementAnalyzerConfig);
    } else {
      this.improvementAnalyzer = null;
    }
  }

  /**
   * Creates a new instance with an improvement analyzer configured for LLM-based analysis.
   */
  withImprovementAnalyzer(config: {
    output: OutputAPI;
    connectorId: string;
    analyzerModel?: string;
  }): EvaluationAnalysisService {
    return new EvaluationAnalysisService(this.scoreRepository, this.log, {
      significanceThreshold: this.significanceThreshold,
      improvementAnalyzerConfig: {
        output: config.output,
        connectorId: config.connectorId,
        analyzerModel: config.analyzerModel,
        enableHeuristics: true,
      },
    });
  }

  /**
   * Analyzes a single evaluation run to compute statistics and optionally generate improvement suggestions.
   */
  async analyzeRun(options: {
    runId: string;
    generateSuggestions?: boolean;
    experiment?: RanExperiment;
    focusCategories?: ImprovementSuggestionCategory[];
  }): Promise<AnalyzeRunResult> {
    const { runId, generateSuggestions = false, experiment, focusCategories } = options;

    this.log.info(`Analyzing evaluation run: ${runId}`);

    const scores = await this.scoreRepository.getScoresByRunId(runId);

    if (scores.length === 0) {
      throw new Error(`No scores found for run ID: ${runId}`);
    }

    // Parse scores into dataset structure with stats
    const datasetScores = parseScoreDocuments(scores);

    // Calculate overall stats across all datasets
    const overallStats = calculateOverallStats(datasetScores);
    const evaluatorNames = getUniqueEvaluatorNames(datasetScores);

    this.log.info(
      `Analyzed ${datasetScores.length} datasets with ${evaluatorNames.length} evaluators`
    );

    const result: AnalyzeRunResult = {
      runId,
      timestamp: scores[0]?.['@timestamp'],
      model: scores[0]?.model.id,
      datasetScores,
      overallStats,
      evaluatorNames,
    };

    // Generate improvement suggestions if configured and requested
    if (generateSuggestions && this.improvementAnalyzer && experiment) {
      try {
        result.improvementSuggestions = await this.improvementAnalyzer.analyze({
          experiment,
          model: scores[0]?.model.id,
          focusCategories,
        });
        this.log.info(
          `Generated ${result.improvementSuggestions.suggestions.length} improvement suggestions`
        );
      } catch (error) {
        this.log.warning('Failed to generate improvement suggestions:', error);
      }
    }

    return result;
  }

  /**
   * Compares two evaluation runs and returns detailed metrics comparison.
   */
  async compareEvaluationRuns(options: {
    currentRunId: string;
    referenceRunId: string;
    includeDetailedStats?: boolean;
  }): Promise<CompareRunsResult> {
    const { currentRunId, referenceRunId, includeDetailedStats = false } = options;

    this.log.info(
      `Comparing evaluation runs: current=${currentRunId}, reference=${referenceRunId}`
    );

    const [currentScores, referenceScores] = await Promise.all([
      this.scoreRepository.getScoresByRunId(currentRunId),
      this.scoreRepository.getScoresByRunId(referenceRunId),
    ]);

    if (currentScores.length === 0) {
      throw new Error(`No scores found for current run ID: ${currentRunId}`);
    }

    if (referenceScores.length === 0) {
      throw new Error(`No scores found for reference run ID: ${referenceRunId}`);
    }

    this.log.info(
      `Retrieved ${currentScores.length} scores for current run and ${referenceScores.length} scores for reference run`
    );

    // Build reference map with full stats
    const referenceMap = new Map<
      string,
      { mean: number; stats: EvaluatorStats; scores: number[] }
    >();
    referenceScores.forEach((score) => {
      const key = `${score.dataset.name}||${score.evaluator.name}`;
      referenceMap.set(key, {
        mean: score.evaluator.stats.mean,
        stats: {
          mean: score.evaluator.stats.mean,
          median: score.evaluator.stats.median,
          stdDev: score.evaluator.stats.std_dev,
          min: score.evaluator.stats.min,
          max: score.evaluator.stats.max,
          count: score.evaluator.stats.count,
          percentage: score.evaluator.stats.percentage,
        },
        scores: score.evaluator.scores,
      });
    });

    const comparison: MetricComparison[] = [];
    let improvements = 0;
    let regressions = 0;
    let noChange = 0;
    let totalImprovementPercent = 0;
    let totalRegressionPercent = 0;

    for (const currentScore of currentScores) {
      const key = `${currentScore.dataset.name}||${currentScore.evaluator.name}`;
      const reference = referenceMap.get(key);

      if (reference !== undefined) {
        const current = currentScore.evaluator.stats.mean;
        const referenceScore = reference.mean;
        const difference = current - referenceScore;
        const percentageChange = referenceScore !== 0 ? (difference / referenceScore) * 100 : 0;
        const isImprovement = difference > this.significanceThreshold;
        const isRegression = difference < -this.significanceThreshold;

        if (isImprovement) {
          improvements++;
          totalImprovementPercent += percentageChange;
        } else if (isRegression) {
          regressions++;
          totalRegressionPercent += Math.abs(percentageChange);
        } else {
          noChange++;
        }

        const metric: MetricComparison = {
          dataset: currentScore.dataset.name,
          evaluator: currentScore.evaluator.name,
          currentScore: current,
          referenceScore,
          difference,
          percentageChange,
          isImprovement,
          isRegression,
        };

        if (includeDetailedStats) {
          metric.currentStats = {
            mean: currentScore.evaluator.stats.mean,
            median: currentScore.evaluator.stats.median,
            stdDev: currentScore.evaluator.stats.std_dev,
            min: currentScore.evaluator.stats.min,
            max: currentScore.evaluator.stats.max,
            count: currentScore.evaluator.stats.count,
            percentage: currentScore.evaluator.stats.percentage,
          };
          metric.referenceStats = reference.stats;
        }

        comparison.push(metric);

        this.log.debug(
          `${currentScore.evaluator.name} on ${currentScore.dataset.name}: ${current.toFixed(
            3
          )} vs ${referenceScore.toFixed(3)} (${difference > 0 ? '+' : ''}${difference.toFixed(
            3
          )}, ${percentageChange > 0 ? '+' : ''}${percentageChange.toFixed(1)}%)`
        );
      } else {
        this.log.warning(
          `No matching reference score found for ${currentScore.evaluator.name} on ${currentScore.dataset.name}`
        );
      }
    }

    // Calculate overall stats if detailed stats requested
    let currentOverallStats: Map<string, EvaluatorStats> | undefined;
    let referenceOverallStats: Map<string, EvaluatorStats> | undefined;

    if (includeDetailedStats) {
      const currentDatasetScores = parseScoreDocuments(currentScores);
      const referenceDatasetScores = parseScoreDocuments(referenceScores);
      currentOverallStats = calculateOverallStats(currentDatasetScores);
      referenceOverallStats = calculateOverallStats(referenceDatasetScores);
    }

    return {
      comparison: comparison.sort(
        (a, b) => a.dataset.localeCompare(b.dataset) || a.evaluator.localeCompare(b.evaluator)
      ),
      summary: {
        totalComparisons: comparison.length,
        improvements,
        regressions,
        noChange,
        avgImprovementPercent:
          improvements > 0 ? totalImprovementPercent / improvements : undefined,
        avgRegressionPercent: regressions > 0 ? totalRegressionPercent / regressions : undefined,
      },
      metadata: {
        currentRun: {
          runId: currentRunId,
          timestamp: currentScores[0]?.['@timestamp'],
          model: currentScores[0]?.model.id,
          datasetCount: new Set(currentScores.map((s) => s.dataset.id)).size,
          evaluatorCount: new Set(currentScores.map((s) => s.evaluator.name)).size,
        },
        referenceRun: {
          runId: referenceRunId,
          timestamp: referenceScores[0]?.['@timestamp'],
          model: referenceScores[0]?.model.id,
          datasetCount: new Set(referenceScores.map((s) => s.dataset.id)).size,
          evaluatorCount: new Set(referenceScores.map((s) => s.evaluator.name)).size,
        },
      },
      currentOverallStats,
      referenceOverallStats,
    };
  }

  /**
   * Analyzes trends across multiple evaluation runs.
   */
  async analyzeTrends(options: {
    runIds: string[];
    evaluatorName?: string;
    datasetName?: string;
  }): Promise<TrendAnalysisResult[]> {
    const { runIds, evaluatorName, datasetName } = options;

    if (runIds.length < 2) {
      throw new Error('At least 2 run IDs are required for trend analysis');
    }

    this.log.info(`Analyzing trends across ${runIds.length} runs`);

    // Fetch scores for all runs
    const allScores = await Promise.all(
      runIds.map((runId) => this.scoreRepository.getScoresByRunId(runId))
    );

    // Group scores by evaluator and optionally dataset
    const groupedScores = new Map<
      string,
      Array<{ runId: string; timestamp?: string; score: number }>
    >();

    allScores.forEach((scores, runIndex) => {
      const runId = runIds[runIndex];
      scores.forEach((score) => {
        // Apply filters
        if (evaluatorName && score.evaluator.name !== evaluatorName) return;
        if (datasetName && score.dataset.name !== datasetName) return;

        const key = datasetName
          ? `${score.evaluator.name}||${score.dataset.name}`
          : score.evaluator.name;

        if (!groupedScores.has(key)) {
          groupedScores.set(key, []);
        }
        groupedScores.get(key)!.push({
          runId,
          timestamp: score['@timestamp'],
          score: score.evaluator.stats.mean,
        });
      });
    });

    // Calculate trends
    const results: TrendAnalysisResult[] = [];

    groupedScores.forEach((scoreHistory, key) => {
      if (scoreHistory.length < 2) return;

      const scores = scoreHistory.map((s) => s.score);
      const stats = calculateEvaluatorStats(scores, scores.length);

      // Calculate linear regression slope
      const n = scores.length;
      const xMean = (n - 1) / 2;
      const yMean = stats.mean;

      let numerator = 0;
      let denominator = 0;
      scores.forEach((score, i) => {
        numerator += (i - xMean) * (score - yMean);
        denominator += (i - xMean) ** 2;
      });

      const slope = denominator !== 0 ? numerator / denominator : 0;

      // Determine trend based on slope and variance
      let trend: 'improving' | 'declining' | 'stable' | 'volatile';
      const slopeThreshold = 0.01;
      const volatilityThreshold = 0.15;

      if (stats.stdDev > volatilityThreshold && Math.abs(slope) < slopeThreshold) {
        trend = 'volatile';
      } else if (slope > slopeThreshold) {
        trend = 'improving';
      } else if (slope < -slopeThreshold) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }

      const parts = key.split('||');
      results.push({
        evaluator: parts[0],
        dataset: parts[1],
        trend,
        scores: scoreHistory,
        slope,
        average: stats.mean,
        stdDev: stats.stdDev,
      });
    });

    this.log.info(`Computed ${results.length} trend analyses`);
    return results;
  }

  /**
   * Generates improvement suggestions for a given experiment using the configured analyzer.
   */
  async generateImprovementSuggestions(options: {
    experiment: RanExperiment;
    model?: string;
    additionalContext?: string;
    focusCategories?: ImprovementSuggestionCategory[];
  }): Promise<ImprovementSuggestionAnalysisResult> {
    if (!this.improvementAnalyzer) {
      // Create a heuristic-only analyzer if no LLM-based analyzer is configured
      const heuristicAnalyzer = createImprovementAnalyzer({
        enableHeuristics: true,
      });
      return heuristicAnalyzer.analyze(options);
    }

    return this.improvementAnalyzer.analyze(options);
  }

  /**
   * Compares improvement suggestions between two runs.
   */
  async compareImprovementSuggestions(options: {
    currentExperiment: RanExperiment;
    referenceExperiment: RanExperiment;
    model?: string;
  }): Promise<{
    currentSuggestions: ImprovementSuggestionAnalysisResult;
    referenceSuggestions: ImprovementSuggestionAnalysisResult;
    resolved: string[];
    newIssues: string[];
    persistent: string[];
  }> {
    const analyzer =
      this.improvementAnalyzer ?? createImprovementAnalyzer({ enableHeuristics: true });

    const [currentSuggestions, referenceSuggestions] = await Promise.all([
      analyzer.analyze({
        experiment: options.currentExperiment,
        model: options.model,
      }),
      analyzer.analyze({
        experiment: options.referenceExperiment,
        model: options.model,
      }),
    ]);

    const currentTitles = new Set(currentSuggestions.suggestions.map((s) => s.title.toLowerCase()));
    const referenceTitles = new Set(
      referenceSuggestions.suggestions.map((s) => s.title.toLowerCase())
    );

    // Issues resolved (in reference but not in current)
    const resolved = referenceSuggestions.suggestions
      .filter((s) => !currentTitles.has(s.title.toLowerCase()))
      .map((s) => s.title);

    // New issues (in current but not in reference)
    const newIssues = currentSuggestions.suggestions
      .filter((s) => !referenceTitles.has(s.title.toLowerCase()))
      .map((s) => s.title);

    // Persistent issues (in both)
    const persistent = currentSuggestions.suggestions
      .filter((s) => referenceTitles.has(s.title.toLowerCase()))
      .map((s) => s.title);

    return {
      currentSuggestions,
      referenceSuggestions,
      resolved,
      newIssues,
      persistent,
    };
  }

  /**
   * Gets the configured improvement analyzer instance.
   */
  getImprovementAnalyzer(): ImprovementAnalyzer | null {
    return this.improvementAnalyzer;
  }
}
