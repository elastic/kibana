/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RanExperiment } from '../types';
import type {
  Analyzer,
  AnalyzerMethod,
  BaseAnalysisInput,
  BaseAnalysisResult,
  BaseAnalyzerConfig,
  AnalysisFinding,
  AnalysisFindingSummary,
  AnalysisImpact,
  AnalysisConfidence,
  BatchAnalyzer,
  ComparativeAnalyzer,
} from './types';
import { calculateEvaluatorStats } from '../utils/evaluation_stats';

const ANALYZER_ID = 'tool-selection-analyzer';
const ANALYZER_NAME = 'Tool Selection Analyzer';
const ANALYZER_DESCRIPTION =
  'Analyzes tool selection patterns in evaluation results to identify issues with tool calls, sequencing, and parameter handling.';

/**
 * Tool selection specific finding types.
 */
export type ToolSelectionIssueType =
  | 'wrong_tool'
  | 'missing_tool'
  | 'unnecessary_tool'
  | 'incorrect_parameters'
  | 'sequencing_problem'
  | 'result_handling'
  | 'low_recall'
  | 'low_precision'
  | 'order_incorrect'
  | 'high_variance';

/**
 * Extended finding type for tool selection analysis.
 */
export interface ToolSelectionFinding extends AnalysisFinding {
  /** Specific type of tool selection issue */
  issueType: ToolSelectionIssueType;
  /** Tools involved in this finding */
  involvedTools?: string[];
  /** Example indices where this issue occurred */
  affectedExamples: number[];
}

/**
 * Tool selection analysis result.
 */
export interface ToolSelectionAnalysisResult extends BaseAnalysisResult<ToolSelectionFinding> {
  /** Aggregate metrics across all examples */
  aggregateMetrics: ToolSelectionAggregateMetrics;
}

/**
 * Aggregate metrics for tool selection analysis.
 */
export interface ToolSelectionAggregateMetrics {
  /** Average recall across all examples */
  avgRecall: number;
  /** Average precision across all examples */
  avgPrecision: number;
  /** Average F1 score across all examples */
  avgF1: number;
  /** Percentage of examples with correct tool order */
  orderCorrectRate: number;
  /** Percentage of examples with exact match */
  exactMatchRate: number;
  /** Most commonly missing tools */
  commonMissingTools: Array<{ tool: string; count: number }>;
  /** Most commonly extra (unexpected) tools */
  commonExtraTools: Array<{ tool: string; count: number }>;
}

/**
 * Configuration for the tool selection analyzer.
 */
export interface ToolSelectionAnalyzerConfig extends BaseAnalyzerConfig {
  /** Threshold below which recall is considered low (default: 0.7) */
  lowRecallThreshold?: number;
  /** Threshold below which precision is considered low (default: 0.7) */
  lowPrecisionThreshold?: number;
  /** Minimum examples needed to generate a finding (default: 2) */
  minExamplesForFinding?: number;
  /** Maximum number of findings to return (default: 15) */
  maxFindings?: number;
  /** Standard deviation threshold for high variance detection (default: 0.3) */
  highVarianceThreshold?: number;
}

/**
 * Input for tool selection analysis.
 */
export interface ToolSelectionAnalysisInput extends BaseAnalysisInput {
  /** Focus on specific issue types */
  focusIssueTypes?: ToolSelectionIssueType[];
}

/**
 * Extracted tool selection data from an evaluation run.
 */
interface ToolSelectionData {
  exampleIndex: number;
  evaluatorName: string;
  recall?: number;
  precision?: number;
  f1?: number;
  orderCorrect?: boolean;
  exactMatch?: boolean;
  missingTools?: string[];
  extraTools?: string[];
  actualTools?: string[];
  expectedTools?: string[];
  score?: number;
  label?: string;
  explanation?: string;
}

/**
 * Creates a tool selection analyzer instance.
 */
export function createToolSelectionAnalyzer(
  config: ToolSelectionAnalyzerConfig = {}
): ToolSelectionAnalyzer {
  const {
    output,
    connectorId,
    analyzerModel,
    method = 'heuristic',
    lowRecallThreshold = 0.7,
    lowPrecisionThreshold = 0.7,
    minExamplesForFinding = 2,
    maxFindings = 15,
    highVarianceThreshold = 0.3,
  } = config;

  /**
   * Extracts tool selection data from evaluation runs.
   */
  function extractToolSelectionData(experiment: RanExperiment): ToolSelectionData[] {
    const { evaluationRuns } = experiment;
    const data: ToolSelectionData[] = [];

    if (!evaluationRuns) {
      return data;
    }

    for (const evalRun of evaluationRuns) {
      // Only process tool selection related evaluators
      if (!isToolSelectionEvaluator(evalRun.name)) {
        continue;
      }

      const metadata = evalRun.result?.metadata as Record<string, unknown> | undefined;

      data.push({
        exampleIndex: evalRun.exampleIndex ?? 0,
        evaluatorName: evalRun.name,
        recall: metadata?.recall as number | undefined,
        precision: metadata?.precision as number | undefined,
        f1: metadata?.f1 as number | undefined,
        orderCorrect: metadata?.orderCorrect as boolean | undefined,
        exactMatch: metadata?.exactMatch as boolean | undefined,
        missingTools: metadata?.missingTools as string[] | undefined,
        extraTools: metadata?.extraTools as string[] | undefined,
        actualTools: metadata?.actualTools as string[] | undefined,
        expectedTools: metadata?.expectedTools as string[] | undefined,
        score: evalRun.result?.score ?? undefined,
        label: evalRun.result?.label,
        explanation: evalRun.result?.explanation,
      });
    }

    return data;
  }

  /**
   * Checks if an evaluator is related to tool selection.
   */
  function isToolSelectionEvaluator(name: string): boolean {
    const nameLower = name.toLowerCase();
    return (
      nameLower.includes('tool') ||
      nameLower.includes('function') ||
      nameLower.includes('selection')
    );
  }

  /**
   * Calculates aggregate metrics from tool selection data.
   */
  function calculateAggregateMetrics(data: ToolSelectionData[]): ToolSelectionAggregateMetrics {
    if (data.length === 0) {
      return {
        avgRecall: 0,
        avgPrecision: 0,
        avgF1: 0,
        orderCorrectRate: 0,
        exactMatchRate: 0,
        commonMissingTools: [],
        commonExtraTools: [],
      };
    }

    const recalls = data.map((d) => d.recall).filter((r): r is number => r !== undefined);
    const precisions = data.map((d) => d.precision).filter((p): p is number => p !== undefined);
    const f1s = data.map((d) => d.f1).filter((f): f is number => f !== undefined);

    const orderCorrectCount = data.filter((d) => d.orderCorrect === true).length;
    const orderCheckedCount = data.filter((d) => d.orderCorrect !== undefined).length;

    const exactMatchCount = data.filter((d) => d.exactMatch === true).length;
    const exactMatchCheckedCount = data.filter((d) => d.exactMatch !== undefined).length;

    // Count missing and extra tools
    const missingToolCounts = new Map<string, number>();
    const extraToolCounts = new Map<string, number>();

    for (const d of data) {
      if (d.missingTools) {
        for (const tool of d.missingTools) {
          missingToolCounts.set(tool, (missingToolCounts.get(tool) || 0) + 1);
        }
      }
      if (d.extraTools) {
        for (const tool of d.extraTools) {
          extraToolCounts.set(tool, (extraToolCounts.get(tool) || 0) + 1);
        }
      }
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      avgRecall: avg(recalls),
      avgPrecision: avg(precisions),
      avgF1: avg(f1s),
      orderCorrectRate: orderCheckedCount > 0 ? orderCorrectCount / orderCheckedCount : 0,
      exactMatchRate: exactMatchCheckedCount > 0 ? exactMatchCount / exactMatchCheckedCount : 0,
      commonMissingTools: Array.from(missingToolCounts.entries())
        .map(([tool, count]) => ({ tool, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      commonExtraTools: Array.from(extraToolCounts.entries())
        .map(([tool, count]) => ({ tool, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  /**
   * Generates a unique finding ID.
   */
  function generateFindingId(issueType: ToolSelectionIssueType, index: number): string {
    const timestamp = Date.now().toString(36);
    return `ts-${issueType}-${timestamp}-${index}`;
  }

  /**
   * Calculates priority score for a finding.
   */
  function calculatePriorityScore(
    impact: AnalysisImpact,
    confidence: AnalysisConfidence,
    affectedCount: number
  ): number {
    const impactScores = { high: 1.0, medium: 0.6, low: 0.3 };
    const confidenceScores = { high: 1.0, medium: 0.7, low: 0.4 };
    const countBonus = Math.min(affectedCount * 0.03, 0.2);

    return impactScores[impact] * 0.5 + confidenceScores[confidence] * 0.3 + countBonus;
  }

  /**
   * Generates heuristic-based findings from tool selection data.
   */
  function generateHeuristicFindings(
    data: ToolSelectionData[],
    metrics: ToolSelectionAggregateMetrics
  ): ToolSelectionFinding[] {
    const findings: ToolSelectionFinding[] = [];
    let findingIndex = 0;

    // Group data by evaluator
    const byEvaluator = new Map<string, ToolSelectionData[]>();
    for (const d of data) {
      if (!byEvaluator.has(d.evaluatorName)) {
        byEvaluator.set(d.evaluatorName, []);
      }
      byEvaluator.get(d.evaluatorName)!.push(d);
    }

    // Finding 1: Low recall issues (missing expected tools)
    if (metrics.avgRecall < lowRecallThreshold) {
      const lowRecallExamples = data.filter(
        (d) => d.recall !== undefined && d.recall < lowRecallThreshold
      );

      if (lowRecallExamples.length >= minExamplesForFinding) {
        const affectedIndices = [...new Set(lowRecallExamples.map((e) => e.exampleIndex))];
        const missingToolsList = metrics.commonMissingTools.slice(0, 5);

        findings.push({
          id: generateFindingId('low_recall', findingIndex++),
          title: 'Low tool selection recall - missing expected tools',
          description: `Tool selection recall is ${(metrics.avgRecall * 100).toFixed(
            1
          )}% on average, below the ${lowRecallThreshold * 100}% threshold. ${
            affectedIndices.length
          } examples have missing expected tools.${
            missingToolsList.length > 0
              ? ` Most commonly missing: ${missingToolsList
                  .map((t) => `${t.tool} (${t.count}x)`)
                  .join(', ')}.`
              : ''
          }`,
          category: 'tool_selection',
          issueType: 'low_recall',
          impact: metrics.avgRecall < 0.5 ? 'high' : 'medium',
          confidence: 'high',
          evidence: [
            {
              source: 'Tool Selection Recall',
              type: 'metric',
              exampleIndices: affectedIndices.slice(0, 10),
              score: metrics.avgRecall,
              description: `Average recall: ${(metrics.avgRecall * 100).toFixed(1)}%`,
            },
          ],
          involvedTools: missingToolsList.map((t) => t.tool),
          affectedExamples: affectedIndices,
          actionItems: [
            'Review tool descriptions to ensure expected tools are clearly discoverable',
            'Add explicit guidance in prompts for when to use specific tools',
            `Focus on commonly missing tools: ${missingToolsList
              .slice(0, 3)
              .map((t) => t.tool)
              .join(', ')}`,
            'Consider adding tool usage examples to the system prompt',
          ],
          priorityScore: calculatePriorityScore(
            metrics.avgRecall < 0.5 ? 'high' : 'medium',
            'high',
            affectedIndices.length
          ),
          tags: ['recall', 'missing-tools', 'heuristic'],
        });
      }
    }

    // Finding 2: Low precision issues (unnecessary tools called)
    if (metrics.avgPrecision < lowPrecisionThreshold) {
      const lowPrecisionExamples = data.filter(
        (d) => d.precision !== undefined && d.precision < lowPrecisionThreshold
      );

      if (lowPrecisionExamples.length >= minExamplesForFinding) {
        const affectedIndices = [...new Set(lowPrecisionExamples.map((e) => e.exampleIndex))];
        const extraToolsList = metrics.commonExtraTools.slice(0, 5);

        findings.push({
          id: generateFindingId('low_precision', findingIndex++),
          title: 'Low tool selection precision - unnecessary tool calls',
          description: `Tool selection precision is ${(metrics.avgPrecision * 100).toFixed(
            1
          )}% on average, below the ${lowPrecisionThreshold * 100}% threshold. ${
            affectedIndices.length
          } examples have unexpected tool calls.${
            extraToolsList.length > 0
              ? ` Most commonly extra: ${extraToolsList
                  .map((t) => `${t.tool} (${t.count}x)`)
                  .join(', ')}.`
              : ''
          }`,
          category: 'tool_selection',
          issueType: 'low_precision',
          impact: metrics.avgPrecision < 0.5 ? 'high' : 'medium',
          confidence: 'high',
          evidence: [
            {
              source: 'Tool Selection Precision',
              type: 'metric',
              exampleIndices: affectedIndices.slice(0, 10),
              score: metrics.avgPrecision,
              description: `Average precision: ${(metrics.avgPrecision * 100).toFixed(1)}%`,
            },
          ],
          involvedTools: extraToolsList.map((t) => t.tool),
          affectedExamples: affectedIndices,
          actionItems: [
            'Review tool descriptions to reduce confusion between similar tools',
            'Add explicit guidance on when NOT to use certain tools',
            `Focus on commonly over-used tools: ${extraToolsList
              .slice(0, 3)
              .map((t) => t.tool)
              .join(', ')}`,
            'Consider narrowing tool scope or adding disambiguation prompts',
          ],
          priorityScore: calculatePriorityScore(
            metrics.avgPrecision < 0.5 ? 'high' : 'medium',
            'high',
            affectedIndices.length
          ),
          tags: ['precision', 'extra-tools', 'heuristic'],
        });
      }
    }

    // Finding 3: Tool ordering issues
    if (metrics.orderCorrectRate < 0.8) {
      const orderIncorrectExamples = data.filter((d) => d.orderCorrect === false);

      if (orderIncorrectExamples.length >= minExamplesForFinding) {
        const affectedIndices = [...new Set(orderIncorrectExamples.map((e) => e.exampleIndex))];

        findings.push({
          id: generateFindingId('order_incorrect', findingIndex++),
          title: 'Tool call sequencing issues',
          description: `Only ${(metrics.orderCorrectRate * 100).toFixed(
            1
          )}% of examples have tools called in the correct order. ${
            affectedIndices.length
          } examples have sequencing problems, which may indicate the model doesn't understand tool dependencies or optimal execution order.`,
          category: 'tool_selection',
          issueType: 'order_incorrect',
          impact: 'medium',
          confidence: 'high',
          evidence: [
            {
              source: 'Tool Selection Order',
              type: 'metric',
              exampleIndices: affectedIndices.slice(0, 10),
              score: metrics.orderCorrectRate,
              description: `Order correct rate: ${(metrics.orderCorrectRate * 100).toFixed(1)}%`,
            },
          ],
          affectedExamples: affectedIndices,
          actionItems: [
            'Document tool dependencies and execution order requirements',
            'Add sequencing guidance to system prompts',
            'Consider using a planning step before tool execution',
            'Review if some tools should explicitly require outputs from others',
          ],
          priorityScore: calculatePriorityScore('medium', 'high', affectedIndices.length),
          tags: ['sequencing', 'order', 'heuristic'],
        });
      }
    }

    // Finding 4: High variance in tool selection performance
    byEvaluator.forEach((evalData, evaluatorName) => {
      const scores = evalData.map((d) => d.score).filter((s): s is number => s !== undefined);

      if (scores.length >= minExamplesForFinding) {
        const stats = calculateEvaluatorStats(scores, scores.length);

        if (stats.stdDev > highVarianceThreshold) {
          const lowScoreExamples = evalData.filter(
            (d) => d.score !== undefined && d.score < stats.mean - stats.stdDev
          );
          const affectedIndices = lowScoreExamples.map((e) => e.exampleIndex);

          findings.push({
            id: generateFindingId('high_variance', findingIndex++),
            title: `High variance in ${evaluatorName}`,
            description: `The ${evaluatorName} shows high variance (std dev: ${stats.stdDev.toFixed(
              3
            )}) with scores ranging from ${stats.min.toFixed(3)} to ${stats.max.toFixed(
              3
            )}. This inconsistency suggests tool selection behavior varies significantly across different input types.`,
            category: 'tool_selection',
            issueType: 'high_variance',
            impact: 'medium',
            confidence: 'medium',
            evidence: [
              {
                source: evaluatorName,
                type: 'evaluator',
                exampleIndices: affectedIndices.slice(0, 10),
                score: stats.mean,
                description: `Mean: ${stats.mean.toFixed(3)}, StdDev: ${stats.stdDev.toFixed(3)}`,
              },
            ],
            affectedExamples: affectedIndices,
            actionItems: [
              'Compare high-scoring and low-scoring examples to identify patterns',
              'Identify input characteristics that lead to poor tool selection',
              'Consider adding edge case handling in prompts',
              'Evaluate if tool selection criteria are consistent across input types',
            ],
            priorityScore: calculatePriorityScore('medium', 'medium', affectedIndices.length),
            tags: [evaluatorName, 'variance', 'heuristic'],
          });
        }
      }
    });

    // Finding 5: Specific missing tools pattern
    for (const { tool, count } of metrics.commonMissingTools.slice(0, 3)) {
      if (count >= minExamplesForFinding) {
        const examplesWithMissing = data.filter((d) => d.missingTools?.includes(tool));
        const affectedIndices = [...new Set(examplesWithMissing.map((e) => e.exampleIndex))];

        findings.push({
          id: generateFindingId('missing_tool', findingIndex++),
          title: `Tool "${tool}" frequently not selected when expected`,
          description: `The tool "${tool}" was expected but not called in ${count} cases. This suggests the model may not understand when this tool should be used or may be confusing it with other tools.`,
          category: 'tool_selection',
          issueType: 'missing_tool',
          impact: count > 5 ? 'high' : 'medium',
          confidence: 'high',
          evidence: [
            {
              source: 'Missing Tool Analysis',
              type: 'pattern',
              exampleIndices: affectedIndices.slice(0, 10),
              description: `Tool "${tool}" missing in ${count} examples`,
            },
          ],
          involvedTools: [tool],
          affectedExamples: affectedIndices,
          actionItems: [
            `Review the description for tool "${tool}" to improve clarity`,
            'Add explicit examples showing when to use this tool',
            'Check if another tool is being selected instead',
            'Consider adding disambiguation guidance in the prompt',
          ],
          priorityScore: calculatePriorityScore(count > 5 ? 'high' : 'medium', 'high', count),
          tags: [tool, 'missing-tool', 'heuristic'],
        });
      }
    }

    // Finding 6: Specific unnecessary tools pattern
    for (const { tool, count } of metrics.commonExtraTools.slice(0, 3)) {
      if (count >= minExamplesForFinding) {
        const examplesWithExtra = data.filter((d) => d.extraTools?.includes(tool));
        const affectedIndices = [...new Set(examplesWithExtra.map((e) => e.exampleIndex))];

        findings.push({
          id: generateFindingId('unnecessary_tool', findingIndex++),
          title: `Tool "${tool}" frequently called unnecessarily`,
          description: `The tool "${tool}" was called but not expected in ${count} cases. This suggests the model may be over-using this tool or misunderstanding its appropriate use cases.`,
          category: 'tool_selection',
          issueType: 'unnecessary_tool',
          impact: count > 5 ? 'high' : 'medium',
          confidence: 'high',
          evidence: [
            {
              source: 'Extra Tool Analysis',
              type: 'pattern',
              exampleIndices: affectedIndices.slice(0, 10),
              description: `Tool "${tool}" unnecessarily called in ${count} examples`,
            },
          ],
          involvedTools: [tool],
          affectedExamples: affectedIndices,
          actionItems: [
            `Review the description for tool "${tool}" to clarify when NOT to use it`,
            'Add negative examples showing when this tool should not be used',
            'Check if the tool scope is too broad',
            'Consider splitting the tool into more specific variants',
          ],
          priorityScore: calculatePriorityScore(count > 5 ? 'high' : 'medium', 'high', count),
          tags: [tool, 'unnecessary-tool', 'heuristic'],
        });
      }
    }

    // Sort by priority and limit
    return findings
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
      .slice(0, maxFindings);
  }

  /**
   * Creates a summary from findings.
   */
  function createSummary(findings: ToolSelectionFinding[]): AnalysisFindingSummary {
    const byImpact: Record<AnalysisImpact, number> = { high: 0, medium: 0, low: 0 };
    const byCategory: Record<string, number> = {};

    findings.forEach((finding) => {
      byImpact[finding.impact]++;
      byCategory[finding.issueType] = (byCategory[finding.issueType] || 0) + 1;
    });

    const topPriority = [...findings]
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
      .slice(0, 5);

    return {
      totalFindings: findings.length,
      byImpact,
      byCategory,
      topPriority,
    };
  }

  /**
   * Performs heuristic-based analysis.
   */
  function analyzeHeuristic(input: ToolSelectionAnalysisInput): ToolSelectionAnalysisResult {
    const { experiment, model } = input;
    const data = extractToolSelectionData(experiment);
    const aggregateMetrics = calculateAggregateMetrics(data);
    const findings = generateHeuristicFindings(data, aggregateMetrics);
    const summary = createSummary(findings);

    return {
      findings,
      summary,
      aggregateMetrics,
      metadata: {
        runId: experiment.id,
        datasetName: experiment.datasetName ?? experiment.datasetId,
        model,
        analyzedAt: new Date().toISOString(),
        method: 'heuristic',
      },
    };
  }

  /**
   * Performs LLM-based analysis.
   */
  async function analyzeLlm(
    input: ToolSelectionAnalysisInput
  ): Promise<ToolSelectionAnalysisResult> {
    if (!output || !connectorId) {
      throw new Error('LLM analysis requires output API and connectorId to be configured');
    }

    const { experiment, model, additionalContext } = input;
    const data = extractToolSelectionData(experiment);
    const aggregateMetrics = calculateAggregateMetrics(data);

    // Build context for LLM
    const systemPrompt = `You are an expert at analyzing tool selection patterns in AI agent evaluations.
Your task is to identify issues with how tools are being selected and used.

Focus on:
1. Wrong tool selection patterns
2. Missing tool calls
3. Unnecessary tool calls
4. Tool sequencing problems
5. Common failure patterns across examples

Provide actionable, specific recommendations.`;

    const dataContext = `
## Tool Selection Evaluation Data

### Aggregate Metrics
- Average Recall: ${(aggregateMetrics.avgRecall * 100).toFixed(1)}%
- Average Precision: ${(aggregateMetrics.avgPrecision * 100).toFixed(1)}%
- Average F1: ${(aggregateMetrics.avgF1 * 100).toFixed(1)}%
- Order Correct Rate: ${(aggregateMetrics.orderCorrectRate * 100).toFixed(1)}%
- Exact Match Rate: ${(aggregateMetrics.exactMatchRate * 100).toFixed(1)}%

### Most Commonly Missing Tools
${aggregateMetrics.commonMissingTools.map((t) => `- ${t.tool}: ${t.count} times`).join('\n')}

### Most Commonly Extra (Unexpected) Tools
${aggregateMetrics.commonExtraTools.map((t) => `- ${t.tool}: ${t.count} times`).join('\n')}

### Per-Example Data (sample)
${data
  .slice(0, 20)
  .map(
    (d) => `
Example ${d.exampleIndex} (${d.evaluatorName}):
  Score: ${d.score?.toFixed(3) ?? 'N/A'}
  Recall: ${d.recall?.toFixed(3) ?? 'N/A'}
  Precision: ${d.precision?.toFixed(3) ?? 'N/A'}
  Missing: ${d.missingTools?.join(', ') || 'None'}
  Extra: ${d.extraTools?.join(', ') || 'None'}
  Order Correct: ${d.orderCorrect ?? 'N/A'}`
  )
  .join('\n')}

${additionalContext ? `### Additional Context\n${additionalContext}` : ''}
`;

    const response = await output({
      id: 'tool-selection-analysis',
      connectorId,
      system: systemPrompt,
      input: dataContext,
    });

    // For now, combine LLM insights with heuristic findings
    // In a full implementation, we'd parse structured output from the LLM
    const heuristicFindings = generateHeuristicFindings(data, aggregateMetrics);

    // Add LLM response as a general finding if it provides useful context
    const llmContent = typeof response.output === 'string' ? response.output : '';
    if (llmContent.length > 100) {
      heuristicFindings.unshift({
        id: generateFindingId('wrong_tool', 0),
        title: 'LLM Analysis Summary',
        description: llmContent.slice(0, 1000),
        category: 'tool_selection',
        issueType: 'wrong_tool',
        impact: 'medium',
        confidence: 'medium',
        evidence: [],
        affectedExamples: [],
        actionItems: [],
        priorityScore: 0.9,
        tags: ['llm-analysis'],
      });
    }

    const summary = createSummary(heuristicFindings);

    return {
      findings: heuristicFindings.slice(0, maxFindings),
      summary,
      aggregateMetrics,
      metadata: {
        runId: experiment.id,
        datasetName: experiment.datasetName ?? experiment.datasetId,
        model,
        analyzedAt: new Date().toISOString(),
        analyzerModel,
        method: 'llm',
      },
    };
  }

  /**
   * Performs analysis using the configured method.
   */
  async function analyze(input: ToolSelectionAnalysisInput): Promise<ToolSelectionAnalysisResult> {
    if (method === 'llm' && output && connectorId) {
      return analyzeLlm(input);
    }

    if (method === 'hybrid' && output && connectorId) {
      // Hybrid: combine both approaches
      const heuristicResult = analyzeHeuristic(input);

      try {
        const llmResult = await analyzeLlm(input);

        // Merge findings, avoiding duplicates
        const seenTitles = new Set(heuristicResult.findings.map((f) => f.title.toLowerCase()));
        const mergedFindings = [...heuristicResult.findings];

        for (const finding of llmResult.findings) {
          if (!seenTitles.has(finding.title.toLowerCase())) {
            mergedFindings.push(finding);
          }
        }

        return {
          ...heuristicResult,
          findings: mergedFindings
            .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
            .slice(0, maxFindings),
          summary: createSummary(mergedFindings.slice(0, maxFindings)),
          metadata: {
            ...heuristicResult.metadata,
            analyzerModel,
            method: 'hybrid',
          },
        };
      } catch (error) {
        // Fall back to heuristic if LLM fails
        // eslint-disable-next-line no-console
        console.warn('LLM analysis failed, using heuristic results only:', error);
        return heuristicResult;
      }
    }

    return analyzeHeuristic(input);
  }

  /**
   * Analyzes multiple experiments.
   */
  async function analyzeMultiple(
    inputs: ToolSelectionAnalysisInput[]
  ): Promise<ToolSelectionAnalysisResult[]> {
    return Promise.all(inputs.map((input) => analyze(input)));
  }

  /**
   * Merges multiple analysis results.
   */
  function mergeResults(results: ToolSelectionAnalysisResult[]): ToolSelectionAnalysisResult {
    if (results.length === 0) {
      throw new Error('Cannot merge empty results array');
    }

    if (results.length === 1) {
      return results[0];
    }

    // Merge findings
    const allFindings: ToolSelectionFinding[] = [];
    const seenTitles = new Set<string>();

    for (const result of results) {
      for (const finding of result.findings) {
        const titleKey = finding.title.toLowerCase();
        if (!seenTitles.has(titleKey)) {
          seenTitles.add(titleKey);
          allFindings.push(finding);
        } else {
          // Merge affected examples for duplicate findings
          const existing = allFindings.find((f) => f.title.toLowerCase() === titleKey);
          if (existing) {
            existing.affectedExamples = [
              ...new Set([...existing.affectedExamples, ...finding.affectedExamples]),
            ];
            existing.priorityScore = Math.min((existing.priorityScore || 0) + 0.1, 1);
          }
        }
      }
    }

    // Average aggregate metrics
    const avgMetrics: ToolSelectionAggregateMetrics = {
      avgRecall: results.reduce((sum, r) => sum + r.aggregateMetrics.avgRecall, 0) / results.length,
      avgPrecision:
        results.reduce((sum, r) => sum + r.aggregateMetrics.avgPrecision, 0) / results.length,
      avgF1: results.reduce((sum, r) => sum + r.aggregateMetrics.avgF1, 0) / results.length,
      orderCorrectRate:
        results.reduce((sum, r) => sum + r.aggregateMetrics.orderCorrectRate, 0) / results.length,
      exactMatchRate:
        results.reduce((sum, r) => sum + r.aggregateMetrics.exactMatchRate, 0) / results.length,
      commonMissingTools: mergeToolCounts(
        results.map((r) => r.aggregateMetrics.commonMissingTools)
      ),
      commonExtraTools: mergeToolCounts(results.map((r) => r.aggregateMetrics.commonExtraTools)),
    };

    const sortedFindings = allFindings
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
      .slice(0, maxFindings);

    return {
      findings: sortedFindings,
      summary: createSummary(sortedFindings),
      aggregateMetrics: avgMetrics,
      metadata: {
        runId: results.map((r) => r.metadata.runId).join(','),
        datasetName: [...new Set(results.map((r) => r.metadata.datasetName))].join(', '),
        model: results[0].metadata.model,
        analyzedAt: new Date().toISOString(),
        analyzerModel: results[0].metadata.analyzerModel,
        method: results[0].metadata.method,
      },
    };
  }

  /**
   * Merges tool counts from multiple results.
   */
  function mergeToolCounts(
    toolCountsArrays: Array<Array<{ tool: string; count: number }>>
  ): Array<{ tool: string; count: number }> {
    const merged = new Map<string, number>();

    for (const toolCounts of toolCountsArrays) {
      for (const { tool, count } of toolCounts) {
        merged.set(tool, (merged.get(tool) || 0) + count);
      }
    }

    return Array.from(merged.entries())
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Compares two analysis results.
   */
  function compare(
    current: ToolSelectionAnalysisResult,
    reference: ToolSelectionAnalysisResult
  ): {
    resolved: string[];
    newIssues: string[];
    persistent: string[];
    improvements: string[];
    regressions: string[];
  } {
    const currentTitles = new Set(current.findings.map((f) => f.title.toLowerCase()));
    const referenceTitles = new Set(reference.findings.map((f) => f.title.toLowerCase()));

    const resolved = reference.findings
      .filter((f) => !currentTitles.has(f.title.toLowerCase()))
      .map((f) => f.title);

    const newIssues = current.findings
      .filter((f) => !referenceTitles.has(f.title.toLowerCase()))
      .map((f) => f.title);

    const persistent = current.findings
      .filter((f) => referenceTitles.has(f.title.toLowerCase()))
      .map((f) => f.title);

    // Check metrics for improvements/regressions
    const improvements: string[] = [];
    const regressions: string[] = [];

    if (current.aggregateMetrics.avgRecall > reference.aggregateMetrics.avgRecall + 0.05) {
      improvements.push(
        `Recall improved: ${(reference.aggregateMetrics.avgRecall * 100).toFixed(1)}% → ${(
          current.aggregateMetrics.avgRecall * 100
        ).toFixed(1)}%`
      );
    } else if (current.aggregateMetrics.avgRecall < reference.aggregateMetrics.avgRecall - 0.05) {
      regressions.push(
        `Recall decreased: ${(reference.aggregateMetrics.avgRecall * 100).toFixed(1)}% → ${(
          current.aggregateMetrics.avgRecall * 100
        ).toFixed(1)}%`
      );
    }

    if (current.aggregateMetrics.avgPrecision > reference.aggregateMetrics.avgPrecision + 0.05) {
      improvements.push(
        `Precision improved: ${(reference.aggregateMetrics.avgPrecision * 100).toFixed(1)}% → ${(
          current.aggregateMetrics.avgPrecision * 100
        ).toFixed(1)}%`
      );
    } else if (
      current.aggregateMetrics.avgPrecision <
      reference.aggregateMetrics.avgPrecision - 0.05
    ) {
      regressions.push(
        `Precision decreased: ${(reference.aggregateMetrics.avgPrecision * 100).toFixed(1)}% → ${(
          current.aggregateMetrics.avgPrecision * 100
        ).toFixed(1)}%`
      );
    }

    return { resolved, newIssues, persistent, improvements, regressions };
  }

  // Return the analyzer instance
  const analyzer: ToolSelectionAnalyzer = {
    id: ANALYZER_ID,
    name: ANALYZER_NAME,
    description: ANALYZER_DESCRIPTION,
    category: 'quality',
    config,

    analyze,
    analyzeLlm,
    analyzeHeuristic,

    canAnalyze: (input: ToolSelectionAnalysisInput) => {
      const data = extractToolSelectionData(input.experiment);
      return data.length > 0;
    },

    getSupportedMethods: () => {
      const methods: AnalyzerMethod[] = ['heuristic'];
      if (output && connectorId) {
        methods.push('llm', 'hybrid');
      }
      return methods;
    },

    isLlmConfigured: () => Boolean(output && connectorId),

    // Batch operations
    analyzeMultiple,
    mergeResults,

    // Comparative operations
    compare,
  };

  return analyzer;
}

/**
 * Full interface for the tool selection analyzer.
 */
export interface ToolSelectionAnalyzer
  extends Analyzer<
      ToolSelectionAnalysisInput,
      ToolSelectionAnalysisResult,
      ToolSelectionAnalyzerConfig
    >,
    BatchAnalyzer<ToolSelectionAnalysisInput, ToolSelectionAnalysisResult>,
    ComparativeAnalyzer<ToolSelectionAnalysisResult> {}

/**
 * Type alias for the tool selection analyzer instance.
 */
export type { ToolSelectionAnalyzer as ToolSelectionAnalyzerInstance };
