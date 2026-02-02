/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OutputAPI } from '@kbn/inference-common';
import type {
  RanExperiment,
  ImprovementSuggestion,
  ImprovementSuggestionAnalysisResult,
  ImprovementSuggestionSummary,
  ImprovementSuggestionCategory,
  ImprovementSuggestionEvidence,
} from '../types';
import {
  llmImprovementSuggestionsResponseSchema,
  type LlmImprovementSuggestionsResponseSchema,
} from './improvement_suggestions/schemas';
import { buildAnalysisPrompt, type AnalysisPromptInput } from './improvement_suggestions/prompts';
import {
  calculateEvaluatorStats,
  type DatasetScore,
  type EvaluatorStats,
} from './evaluation_stats';

/**
 * Configuration options for the improvement analyzer.
 */
export interface ImprovementAnalyzerConfig {
  /** Output API for LLM-based analysis */
  output?: OutputAPI;
  /** Connector ID for the LLM */
  connectorId?: string;
  /** Model identifier used for analysis */
  analyzerModel?: string;
  /** Enable heuristic-based analysis (default: true) */
  enableHeuristics?: boolean;
  /** Minimum score threshold to consider as low-performing (default: 0.7) */
  lowScoreThreshold?: number;
  /** Minimum number of low-scoring examples to generate a suggestion (default: 2) */
  minExamplesForSuggestion?: number;
  /** Maximum number of suggestions to generate (default: 10) */
  maxSuggestions?: number;
}

/**
 * Input for analyzing a single experiment/run.
 */
export interface AnalyzeExperimentInput {
  /** The experiment data to analyze */
  experiment: RanExperiment;
  /** Optional model identifier used in the evaluation */
  model?: string;
  /** Additional context to guide the analysis */
  additionalContext?: string;
  /** Specific categories to focus on */
  focusCategories?: ImprovementSuggestionCategory[];
}

/**
 * Detailed per-example data for analysis.
 */
interface ExampleDetail {
  index: number;
  evaluatorScores: Record<string, { score: number; label?: string; explanation?: string }>;
  hasErrors: boolean;
  lowScoringEvaluators: string[];
}

/**
 * Creates an improvement analyzer instance.
 * @param config - Configuration for the analyzer
 * @returns Analyzer functions
 */
export function createImprovementAnalyzer(config: ImprovementAnalyzerConfig = {}) {
  const {
    output,
    connectorId,
    analyzerModel,
    enableHeuristics = true,
    lowScoreThreshold = 0.7,
    minExamplesForSuggestion = 2,
    maxSuggestions = 10,
  } = config;

  /**
   * Extracts dataset scores from an experiment.
   */
  function extractDatasetScore(experiment: RanExperiment): DatasetScore {
    const { datasetId, datasetName, evaluationRuns, runs, id } = experiment;
    const numExamples = runs ? Object.keys(runs).length : 0;

    const evaluatorScores = new Map<string, number[]>();

    if (evaluationRuns) {
      evaluationRuns.forEach((evalRun) => {
        const score = evalRun.result?.score ?? 0;
        if (!evaluatorScores.has(evalRun.name)) {
          evaluatorScores.set(evalRun.name, []);
        }
        evaluatorScores.get(evalRun.name)!.push(score);
      });
    }

    return {
      id: datasetId,
      name: datasetName ?? datasetId,
      numExamples,
      evaluatorScores,
      experimentId: id ?? '',
    };
  }

  /**
   * Extracts per-example details from an experiment.
   */
  function extractExampleDetails(experiment: RanExperiment): ExampleDetail[] {
    const { evaluationRuns, runs } = experiment;
    const numExamples = runs ? Object.keys(runs).length : 0;
    const details: ExampleDetail[] = [];

    for (let i = 0; i < numExamples; i++) {
      const exampleDetail: ExampleDetail = {
        index: i,
        evaluatorScores: {},
        hasErrors: false,
        lowScoringEvaluators: [],
      };

      if (evaluationRuns) {
        evaluationRuns
          .filter((evalRun) => evalRun.exampleIndex === i)
          .forEach((evalRun) => {
            const score = evalRun.result?.score ?? 0;
            exampleDetail.evaluatorScores[evalRun.name] = {
              score,
              label: evalRun.result?.label ?? undefined,
              explanation: evalRun.result?.explanation,
            };

            if (score < lowScoreThreshold) {
              exampleDetail.lowScoringEvaluators.push(evalRun.name);
            }

            if (evalRun.result?.label === 'ERROR' || score === 0) {
              exampleDetail.hasErrors = true;
            }
          });
      }

      details.push(exampleDetail);
    }

    return details;
  }

  /**
   * Formats evaluator results for the prompt.
   */
  function formatEvaluatorResults(datasetScore: DatasetScore): string {
    const results: string[] = [];

    datasetScore.evaluatorScores.forEach((scores, evaluatorName) => {
      const stats = calculateEvaluatorStats(scores, datasetScore.numExamples);
      results.push(
        `### ${evaluatorName}\n` +
          `- Mean: ${stats.mean.toFixed(3)}\n` +
          `- Median: ${stats.median.toFixed(3)}\n` +
          `- Std Dev: ${stats.stdDev.toFixed(3)}\n` +
          `- Min: ${stats.min.toFixed(3)}\n` +
          `- Max: ${stats.max.toFixed(3)}\n` +
          `- Count: ${stats.count}`
      );
    });

    return results.join('\n\n');
  }

  /**
   * Formats example details for the prompt.
   */
  function formatExampleDetails(details: ExampleDetail[]): string {
    const formattedDetails = details.map((detail) => {
      const scores = Object.entries(detail.evaluatorScores)
        .map(
          ([name, data]) =>
            `  ${name}: ${data.score.toFixed(3)}${data.label ? ` (${data.label})` : ''}`
        )
        .join('\n');

      return `Example ${
        detail.index
      }:\n${scores}\n  Low-scoring: [${detail.lowScoringEvaluators.join(', ')}]`;
    });

    return formattedDetails.join('\n\n');
  }

  /**
   * Generates a unique ID for a suggestion.
   */
  function generateSuggestionId(category: ImprovementSuggestionCategory, index: number): string {
    const timestamp = Date.now().toString(36);
    return `${category}-${timestamp}-${index}`;
  }

  /**
   * Calculates a priority score based on impact and confidence.
   */
  function calculatePriorityScore(
    impact: 'high' | 'medium' | 'low',
    confidence: 'high' | 'medium' | 'low',
    evidenceCount: number
  ): number {
    const impactScores = { high: 1.0, medium: 0.6, low: 0.3 };
    const confidenceScores = { high: 1.0, medium: 0.7, low: 0.4 };
    const evidenceBonus = Math.min(evidenceCount * 0.05, 0.2);

    return impactScores[impact] * 0.5 + confidenceScores[confidence] * 0.3 + evidenceBonus;
  }

  /**
   * Transforms LLM response to full ImprovementSuggestion format.
   */
  function transformLlmResponse(
    llmResponse: LlmImprovementSuggestionsResponseSchema,
    datasetScore: DatasetScore,
    details: ExampleDetail[]
  ): ImprovementSuggestion[] {
    return llmResponse.suggestions.map((suggestion, index) => {
      const evidence: ImprovementSuggestionEvidence[] = suggestion.evidenceReferences.map((ref) => {
        // Find the average score for this evaluator on the referenced examples
        const scores = ref.exampleIndices
          .map((idx) => details[idx]?.evaluatorScores[ref.evaluatorName]?.score)
          .filter((score): score is number => score !== undefined);

        const avgScore =
          scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;

        return {
          evaluatorName: ref.evaluatorName,
          exampleIndices: ref.exampleIndices,
          score: avgScore,
          explanation: ref.explanation,
        };
      });

      const priorityScore = calculatePriorityScore(
        suggestion.impact,
        suggestion.confidence,
        evidence.length
      );

      return {
        id: generateSuggestionId(suggestion.category, index),
        title: suggestion.title,
        description: suggestion.description,
        category: suggestion.category,
        impact: suggestion.impact,
        confidence: suggestion.confidence,
        evidence,
        actionItems: suggestion.actionItems,
        priorityScore,
        tags: suggestion.tags,
      };
    });
  }

  /**
   * Generates heuristic-based suggestions from evaluation patterns.
   */
  function generateHeuristicSuggestions(
    datasetScore: DatasetScore,
    details: ExampleDetail[]
  ): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];
    let suggestionIndex = 0;

    // Analyze low-performing evaluators
    const evaluatorStats = new Map<string, EvaluatorStats>();
    datasetScore.evaluatorScores.forEach((scores, evaluatorName) => {
      evaluatorStats.set(evaluatorName, calculateEvaluatorStats(scores, datasetScore.numExamples));
    });

    // Pattern 1: Consistently low-scoring evaluators
    evaluatorStats.forEach((stats, evaluatorName) => {
      if (stats.mean < lowScoreThreshold && stats.count >= minExamplesForSuggestion) {
        const lowScoringIndices = details
          .filter((d) => d.evaluatorScores[evaluatorName]?.score < lowScoreThreshold)
          .map((d) => d.index);

        const category = inferCategoryFromEvaluator(evaluatorName);

        suggestions.push({
          id: generateSuggestionId(category, suggestionIndex++),
          title: `Improve ${evaluatorName} performance`,
          description: `The ${evaluatorName} evaluator shows consistently low scores (mean: ${stats.mean.toFixed(
            3
          )}) across ${
            lowScoringIndices.length
          } examples. This suggests a systematic issue that needs to be addressed.`,
          category,
          impact: stats.mean < 0.5 ? 'high' : 'medium',
          confidence: stats.stdDev < 0.2 ? 'high' : 'medium',
          evidence: [
            {
              evaluatorName,
              exampleIndices: lowScoringIndices.slice(0, 5),
              score: stats.mean,
              explanation: `Mean score of ${stats.mean.toFixed(3)} across ${stats.count} examples`,
            },
          ],
          actionItems: [
            `Review examples ${lowScoringIndices
              .slice(0, 3)
              .join(', ')} to understand the failure patterns`,
            `Identify common characteristics in low-scoring examples`,
            `Consider adjusting prompts or system configuration to address this evaluator's criteria`,
          ],
          priorityScore: calculatePriorityScore(
            stats.mean < 0.5 ? 'high' : 'medium',
            stats.stdDev < 0.2 ? 'high' : 'medium',
            1
          ),
          tags: [evaluatorName, 'heuristic'],
        });
      }
    });

    // Pattern 2: High variance evaluators
    evaluatorStats.forEach((stats, evaluatorName) => {
      if (stats.stdDev > 0.3 && stats.count >= minExamplesForSuggestion) {
        const category = inferCategoryFromEvaluator(evaluatorName);

        suggestions.push({
          id: generateSuggestionId(category, suggestionIndex++),
          title: `Address inconsistent ${evaluatorName} performance`,
          description: `The ${evaluatorName} evaluator shows high variance (std dev: ${stats.stdDev.toFixed(
            3
          )}) with scores ranging from ${stats.min.toFixed(3)} to ${stats.max.toFixed(
            3
          )}. This inconsistency may indicate the model's performance is sensitive to specific input characteristics.`,
          category,
          impact: 'medium',
          confidence: 'medium',
          evidence: [
            {
              evaluatorName,
              exampleIndices: details
                .filter(
                  (d) =>
                    d.evaluatorScores[evaluatorName]?.score <= stats.min + 0.1 ||
                    d.evaluatorScores[evaluatorName]?.score >= stats.max - 0.1
                )
                .map((d) => d.index)
                .slice(0, 5),
              score: stats.mean,
              explanation: `High variance (std dev: ${stats.stdDev.toFixed(
                3
              )}) between min ${stats.min.toFixed(3)} and max ${stats.max.toFixed(3)}`,
            },
          ],
          actionItems: [
            `Compare high-scoring and low-scoring examples to identify differentiating factors`,
            `Consider adding more specific guidance in prompts for edge cases`,
            `Evaluate if the input preprocessing is consistent`,
          ],
          priorityScore: calculatePriorityScore('medium', 'medium', 1),
          tags: [evaluatorName, 'variance', 'heuristic'],
        });
      }
    });

    // Pattern 3: Examples with multiple failing evaluators
    const problematicExamples = details.filter((d) => d.lowScoringEvaluators.length >= 2);

    if (problematicExamples.length >= minExamplesForSuggestion) {
      const commonFailures = findCommonEvaluators(problematicExamples);

      suggestions.push({
        id: generateSuggestionId('other', suggestionIndex++),
        title: 'Address examples with multiple evaluation failures',
        description: `${
          problematicExamples.length
        } examples failed multiple evaluators simultaneously. Common failing evaluators: ${commonFailures
          .slice(0, 3)
          .join(', ')}. These examples may represent edge cases or systematic issues.`,
        category: 'other',
        impact: 'high',
        confidence: 'high',
        evidence: commonFailures.slice(0, 3).map((evalName) => ({
          evaluatorName: evalName,
          exampleIndices: problematicExamples.map((e) => e.index).slice(0, 5),
          explanation: `Evaluator commonly fails alongside others`,
        })),
        actionItems: [
          `Deep-dive into examples ${problematicExamples
            .slice(0, 3)
            .map((e) => e.index)
            .join(', ')}`,
          `Identify if these represent a specific category of inputs`,
          `Consider adding targeted handling for these edge cases`,
        ],
        priorityScore: calculatePriorityScore('high', 'high', commonFailures.length),
        tags: ['multi-failure', 'edge-cases', 'heuristic'],
      });
    }

    return suggestions.slice(0, maxSuggestions);
  }

  /**
   * Infers a suggestion category from an evaluator name.
   */
  function inferCategoryFromEvaluator(evaluatorName: string): ImprovementSuggestionCategory {
    const nameLower = evaluatorName.toLowerCase();

    if (nameLower.includes('tool') || nameLower.includes('function')) {
      return 'tool_selection';
    }
    if (nameLower.includes('accuracy') || nameLower.includes('correct')) {
      return 'accuracy';
    }
    if (nameLower.includes('reasoning') || nameLower.includes('logic')) {
      return 'reasoning';
    }
    if (
      nameLower.includes('context') ||
      nameLower.includes('retrieval') ||
      nameLower.includes('rag')
    ) {
      return 'context_retrieval';
    }
    if (
      nameLower.includes('response') ||
      nameLower.includes('quality') ||
      nameLower.includes('format')
    ) {
      return 'response_quality';
    }
    if (
      nameLower.includes('latency') ||
      nameLower.includes('token') ||
      nameLower.includes('efficiency')
    ) {
      return 'efficiency';
    }
    if (nameLower.includes('prompt') || nameLower.includes('instruction')) {
      return 'prompt';
    }

    return 'other';
  }

  /**
   * Finds common evaluators across problematic examples.
   */
  function findCommonEvaluators(examples: ExampleDetail[]): string[] {
    const evaluatorCounts = new Map<string, number>();

    examples.forEach((example) => {
      example.lowScoringEvaluators.forEach((evalName) => {
        evaluatorCounts.set(evalName, (evaluatorCounts.get(evalName) || 0) + 1);
      });
    });

    return Array.from(evaluatorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }

  /**
   * Creates a summary from suggestions.
   */
  function createSummary(suggestions: ImprovementSuggestion[]): ImprovementSuggestionSummary {
    const byImpact: Record<'high' | 'medium' | 'low', number> = { high: 0, medium: 0, low: 0 };
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
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
      .slice(0, 5);

    return {
      totalSuggestions: suggestions.length,
      byImpact,
      byCategory,
      topPriority,
    };
  }

  /**
   * Analyzes an experiment using LLM-based analysis.
   */
  async function analyzeLlm(
    input: AnalyzeExperimentInput
  ): Promise<ImprovementSuggestionAnalysisResult> {
    if (!output || !connectorId) {
      throw new Error('LLM analysis requires output API and connectorId to be configured');
    }

    const { experiment, model, additionalContext } = input;
    const datasetScore = extractDatasetScore(experiment);
    const details = extractExampleDetails(experiment);

    const promptInput: AnalysisPromptInput = {
      datasetName: datasetScore.name,
      runId: experiment.id,
      model,
      totalExamples: datasetScore.numExamples,
      evaluatorResults: formatEvaluatorResults(datasetScore),
      exampleDetails: formatExampleDetails(details),
      additionalContext,
    };

    const { systemPrompt, userPrompt } = buildAnalysisPrompt(promptInput);

    const response = await output({
      id: 'improvement-analysis',
      connectorId,
      system: systemPrompt,
      input: userPrompt,
      schema: llmImprovementSuggestionsResponseSchema,
    });

    const suggestions = transformLlmResponse(response.output, datasetScore, details);
    const summary = createSummary(suggestions);

    return {
      suggestions,
      summary,
      metadata: {
        runId: experiment.id,
        datasetName: datasetScore.name,
        model,
        analyzedAt: new Date().toISOString(),
        analyzerModel,
      },
    };
  }

  /**
   * Analyzes an experiment using heuristic-based analysis.
   */
  function analyzeHeuristic(input: AnalyzeExperimentInput): ImprovementSuggestionAnalysisResult {
    const { experiment, model } = input;
    const datasetScore = extractDatasetScore(experiment);
    const details = extractExampleDetails(experiment);

    const suggestions = generateHeuristicSuggestions(datasetScore, details);
    const summary = createSummary(suggestions);

    return {
      suggestions,
      summary,
      metadata: {
        runId: experiment.id,
        datasetName: datasetScore.name,
        model,
        analyzedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Analyzes an experiment using both LLM and heuristic methods.
   */
  async function analyze(
    input: AnalyzeExperimentInput
  ): Promise<ImprovementSuggestionAnalysisResult> {
    const { experiment, model } = input;
    const datasetScore = extractDatasetScore(experiment);
    const details = extractExampleDetails(experiment);

    let suggestions: ImprovementSuggestion[] = [];

    // Generate heuristic suggestions if enabled
    if (enableHeuristics) {
      const heuristicSuggestions = generateHeuristicSuggestions(datasetScore, details);
      suggestions.push(...heuristicSuggestions);
    }

    // Generate LLM suggestions if configured
    if (output && connectorId) {
      try {
        const llmResult = await analyzeLlm(input);
        // Merge LLM suggestions, avoiding duplicates based on title similarity
        const existingTitles = new Set(suggestions.map((s) => s.title.toLowerCase()));

        for (const llmSuggestion of llmResult.suggestions) {
          if (!existingTitles.has(llmSuggestion.title.toLowerCase())) {
            suggestions.push(llmSuggestion);
          }
        }
      } catch (error) {
        // Log but don't fail if LLM analysis fails
        // eslint-disable-next-line no-console
        console.warn('LLM analysis failed, using heuristic results only:', error);
      }
    }

    // Sort by priority and limit
    suggestions = suggestions
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
      .slice(0, maxSuggestions);

    const summary = createSummary(suggestions);

    return {
      suggestions,
      summary,
      metadata: {
        runId: experiment.id,
        datasetName: datasetScore.name,
        model,
        analyzedAt: new Date().toISOString(),
        analyzerModel: output && connectorId ? analyzerModel : undefined,
      },
    };
  }

  /**
   * Analyzes multiple experiments and combines results.
   */
  async function analyzeMultiple(
    inputs: AnalyzeExperimentInput[]
  ): Promise<ImprovementSuggestionAnalysisResult[]> {
    return Promise.all(inputs.map((input) => analyze(input)));
  }

  /**
   * Merges multiple analysis results into a combined result.
   */
  function mergeResults(
    results: ImprovementSuggestionAnalysisResult[]
  ): ImprovementSuggestionAnalysisResult {
    if (results.length === 0) {
      throw new Error('Cannot merge empty results array');
    }

    if (results.length === 1) {
      return results[0];
    }

    // Combine all suggestions
    let allSuggestions: ImprovementSuggestion[] = [];
    const seenTitles = new Set<string>();

    for (const result of results) {
      for (const suggestion of result.suggestions) {
        const titleKey = suggestion.title.toLowerCase();
        if (!seenTitles.has(titleKey)) {
          seenTitles.add(titleKey);
          allSuggestions.push(suggestion);
        } else {
          // Merge evidence from duplicate suggestions
          const existing = allSuggestions.find((s) => s.title.toLowerCase() === titleKey);
          if (existing) {
            existing.evidence = [...existing.evidence, ...suggestion.evidence];
            // Boost priority for recurring suggestions
            existing.priorityScore = Math.min((existing.priorityScore || 0) + 0.1, 1);
          }
        }
      }
    }

    // Sort and limit
    allSuggestions = allSuggestions
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
      .slice(0, maxSuggestions);

    const summary = createSummary(allSuggestions);

    return {
      suggestions: allSuggestions,
      summary,
      metadata: {
        runId: results.map((r) => r.metadata.runId).join(','),
        datasetName: [...new Set(results.map((r) => r.metadata.datasetName))].join(', '),
        model: results[0].metadata.model,
        analyzedAt: new Date().toISOString(),
        analyzerModel: results[0].metadata.analyzerModel,
      },
    };
  }

  return {
    analyze,
    analyzeLlm,
    analyzeHeuristic,
    analyzeMultiple,
    mergeResults,
    extractDatasetScore,
    extractExampleDetails,
    createSummary,
  };
}

/**
 * Type for the improvement analyzer instance.
 */
export type ImprovementAnalyzer = ReturnType<typeof createImprovementAnalyzer>;
