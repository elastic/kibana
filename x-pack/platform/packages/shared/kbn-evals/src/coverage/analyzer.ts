/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { EvalSuiteDefinition } from '../cli/suites';
import { resolveEvalSuites } from '../cli/suites';
import type { GateConfig } from '../quality_gates/types';

export interface ToolCoverageEntry {
  toolId: string;
  coveredBy: string[];
  percentage: number;
}

export interface EvaluatorCoverageEntry {
  evaluatorName: string;
  usedIn: string[];
}

export interface GateReadinessEntry {
  evaluator: string;
  meetsThreshold: boolean;
  actual: number;
  required: number;
}

export interface CoverageReport {
  toolCoverage: ToolCoverageEntry[];
  evaluatorCoverage: EvaluatorCoverageEntry[];
  overallToolCoveragePercent: number;
  overallEvaluatorCoveragePercent: number;
  gaps: string[];
  gateReadiness?: GateReadinessEntry[];
}

interface AnalyzerOptions {
  repoRoot: string;
  log?: ToolingLog;
  /** All known tool identifiers to measure coverage against */
  toolIds?: string[];
  /** All known evaluator names to measure coverage against */
  evaluatorNames?: string[];
  /** Optional gate config for threshold enrichment */
  gateConfig?: GateConfig;
  /** Pre-resolved suites (if omitted, will resolve via repoRoot) */
  suites?: EvalSuiteDefinition[];
  /** Actual score averages per evaluator (from a score repository query) */
  actualScores?: Record<string, number>;
}

/**
 * Build a CoverageReport by cross-referencing resolved eval suites
 * against a provided tool list and optional gate configuration.
 *
 * The analyzer uses suite metadata (tags, ids) to infer which tools
 * and evaluators are exercised by each suite. For deeper analysis,
 * consumers should pass pre-enriched suite metadata.
 */
export const analyzeCoverage = (options: AnalyzerOptions): CoverageReport => {
  const {
    repoRoot,
    log,
    toolIds = [],
    evaluatorNames = [],
    gateConfig,
    actualScores,
  } = options;

  const suites = options.suites ?? resolveEvalSuites(repoRoot, log);
  const suiteIds = suites.map((s) => s.id);

  const toolCoverage: ToolCoverageEntry[] = toolIds.map((toolId) => {
    const covering = suiteIds.filter(
      (suiteId) =>
        suiteId.includes(toolId) ||
        suites.some(
          (s) =>
            s.id === suiteId && (s.tags.includes(toolId) || s.description?.includes(toolId))
        )
    );
    return {
      toolId,
      coveredBy: covering,
      percentage: covering.length > 0 ? 1 : 0,
    };
  });

  const evaluatorCoverage: EvaluatorCoverageEntry[] = evaluatorNames.map((name) => {
    const usedIn = suiteIds.filter(
      (suiteId) =>
        suites.some(
          (s) => s.id === suiteId && (s.tags.includes(name) || s.description?.includes(name))
        )
    );
    return { evaluatorName: name, usedIn };
  });

  const coveredTools = toolCoverage.filter((t) => t.coveredBy.length > 0).length;
  const overallToolCoveragePercent =
    toolIds.length > 0 ? (coveredTools / toolIds.length) * 100 : 100;

  const coveredEvaluators = evaluatorCoverage.filter((e) => e.usedIn.length > 0).length;
  const overallEvaluatorCoveragePercent =
    evaluatorNames.length > 0 ? (coveredEvaluators / evaluatorNames.length) * 100 : 100;

  const gaps: string[] = [];
  for (const entry of toolCoverage) {
    if (entry.coveredBy.length === 0) {
      gaps.push(`Tool "${entry.toolId}" has no covering eval suite`);
    }
  }
  for (const entry of evaluatorCoverage) {
    if (entry.usedIn.length === 0) {
      gaps.push(`Evaluator "${entry.evaluatorName}" is not used in any suite`);
    }
  }

  let gateReadiness: GateReadinessEntry[] | undefined;
  if (gateConfig?.evaluators && actualScores) {
    gateReadiness = Object.entries(gateConfig.evaluators).map(([evaluator, thresholds]) => {
      const actual = actualScores[evaluator] ?? 0;
      const required = thresholds.avg ?? thresholds.min ?? 0;
      return {
        evaluator,
        meetsThreshold: actual >= required,
        actual,
        required,
      };
    });
  }

  return {
    toolCoverage,
    evaluatorCoverage,
    overallToolCoveragePercent,
    overallEvaluatorCoveragePercent,
    gaps,
    gateReadiness,
  };
};
