/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServerEvaluatorResult } from '../evaluation_engine';
import {
  computeCompositeScore,
  evaluateCiGates,
  getDefaultCompositeConfig,
} from './convergence_loop';

/**
 * Maps a `skill-*` evaluator name to the criterion key the UI expects under
 * `validation.criteria`. The five LLM judges map 1:1 to the historical five
 * criteria fields the dashboard renders. Unmapped evaluators (e.g.
 * `skill-secret-scanner`, `esql-compile`) land in `criteria` under their own
 * name so the UI can list them generically.
 */
const CRITERION_ALIASES: Record<string, string> = {
  'skill-relevance': 'relevance',
  'skill-completeness': 'completeness',
  'skill-accuracy': 'accuracy',
  'skill-specificity': 'specificity',
  'skill-safety': 'safety',
};

const shortName = (evaluator: string): string =>
  CRITERION_ALIASES[evaluator] ?? evaluator.replace(/^skill-/, '');

export interface ValidationResultSummary {
  /** Composite weighted score in [0,1] (not a raw average). */
  score: number;
  /** Server-side gate verdict — authoritative for the `status` field. */
  passed: boolean;
  /** `{evaluatorName|criterion: score}` for the UI's criteria bar-chart. */
  criteria: Record<string, number>;
  /** One-sentence summary stitched together from per-evaluator explanations. */
  feedback: string;
  /** Evaluators that scored ≥ 0.85 with non-null scores. */
  strengths: string[];
  /** Evaluators that failed their gate or scored < 0.7. */
  weaknesses: string[];
  /** Actionable suggestions extracted from failing evaluators' explanations. */
  suggestions: string[];
  /** Raw per-evaluator results for the detailed view and future analytics. */
  evaluatorResults: ServerEvaluatorResult[];
  /** Gate details (which required evaluators passed/failed). */
  gate: { passed: boolean; failedRequired: string[]; reason?: string };
}

/**
 * Turns per-evaluator results into the shape persisted under
 * `.aesop-proposed-skills.validation.*`. The shape is deliberately backwards
 * compatible with the pre-refactor monolithic-prompt output — the UI consumes
 * `criteria: Record<string, number>`, `strengths/weaknesses/suggestions:
 * string[]`, and `llm_feedback: string`.
 *
 * `passed` is computed from `evaluateCiGates` (required-pass list + composite
 * threshold). We explicitly do not trust any LLM-self-reported `passed`
 * value — the server alone decides pass/fail.
 */
export const buildValidationSummary = (
  evaluatorResults: ServerEvaluatorResult[],
  options: {
    requiredPass: string[];
    compositeThreshold: number;
  }
): ValidationResultSummary => {
  const scorableResults = evaluatorResults.map((r) => ({
    evaluator: r.evaluator,
    score: r.score,
  }));

  const composite = computeCompositeScore(scorableResults, getDefaultCompositeConfig());
  const score = composite.compositeScore;

  const rawGate = evaluateCiGates(scorableResults, score, {
    requiredPass: options.requiredPass,
    compositeThreshold: options.compositeThreshold,
  });
  const failedRequired = rawGate.failedGates
    .filter((g) => g.gate === 'required-pass' && g.evaluator)
    .map((g) => g.evaluator as string);
  const gate = {
    passed: rawGate.passed,
    failedRequired,
    reason: rawGate.failedGates[0]?.message,
  };

  const criteria: Record<string, number> = {};
  for (const r of evaluatorResults) {
    if (r.score == null) continue; // skipped evaluators
    const key = shortName(r.evaluator);
    // If the alias collides (shouldn't happen) prefer the higher score so the
    // UI never shows a stale lower value from an earlier run slotted into the
    // same criterion.
    criteria[key] = Math.max(criteria[key] ?? -Infinity, r.score);
  }

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  for (const r of evaluatorResults) {
    const label = r.label;
    const explanation = typeof r.explanation === 'string' ? r.explanation.trim() : '';
    const displayName = shortName(r.evaluator);

    if (r.score == null || label === 'skipped') {
      continue; // don't report skipped as strength/weakness
    }
    if (r.score >= 0.85 && (label === 'pass' || label === undefined)) {
      strengths.push(
        explanation ? `${displayName}: ${explanation}` : `${displayName} passed cleanly`
      );
    } else if (r.score < 0.7 || label === 'fail') {
      if (explanation) {
        weaknesses.push(`${displayName}: ${explanation}`);
        // Many of our CODE evaluators already phrase their explanation as an
        // actionable suggestion ("Remove…", "Replace…"). For LLM judges we
        // just forward the explanation — it's the reviewer's signal.
        suggestions.push(`Address ${displayName} feedback: ${explanation}`);
      } else {
        weaknesses.push(`${displayName} scored ${r.score.toFixed(2)}`);
      }
    }
  }

  // Feedback = sentence summary + gate verdict. Keep it short; the full
  // explanations live in `evaluatorResults` and the split
  // strengths/weaknesses/suggestions arrays.
  const failedCount = weaknesses.length;
  const passedCount = strengths.length;
  const gateSummary = gate.passed
    ? 'All required gates passed.'
    : `Failed required gates: ${gate.failedRequired.join(', ') || 'composite threshold'}.`;
  const feedback = `Composite ${(score * 100).toFixed(0)}%. ${passedCount} strong, ${failedCount} weak. ${gateSummary}`.trim();

  return {
    score,
    passed: gate.passed,
    criteria,
    feedback,
    strengths,
    weaknesses,
    suggestions,
    evaluatorResults,
    gate,
  };
};
