/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregatedModelScores } from './query_matrix_scores';

/** `evaluator.kind` as persisted on score documents. */
export type EvaluatorKindTag = 'code' | 'llm';

export type SubScoreAxis = 'contract' | 'judged';

export interface EvaluatorKindConflict {
  evaluatorName: string;
  /** Every kind observed for this name, from score documents and config. */
  kinds: EvaluatorKindTag[];
}

export interface EvaluatorKindIndex {
  /** Resolved kind, or undefined when nothing declares one (or sources disagree). */
  kindOf: (evaluatorName: string) => EvaluatorKindTag | undefined;
  /** Names that score documents and/or config classify inconsistently. */
  conflicts: EvaluatorKindConflict[];
}

/** `Skill Invoked (alert-analysis)` shares the base evaluator's declaration. */
const baseName = (name: string): string => name.replace(/\s*\([^)]*\)\s*$/, '');

export const axisOfKind = (kind: EvaluatorKindTag | undefined): SubScoreAxis | undefined =>
  kind === 'code' ? 'contract' : kind === 'llm' ? 'judged' : undefined;

/**
 * Builds the contract/judged classification from what evaluators declare.
 *
 * Score documents are the primary source: `evaluator.kind` is stamped by the
 * evaluator that produced the score, so it cannot drift from the code that ran.
 * `configKinds` only fills names the documents never describe -- the
 * dataset-stats route drops `evaluator.kind`, so stats-backed columns rely on it.
 * A name with more than one kind across sources is left unclassified rather
 * than resolved by precedence: picking one would put a judge opinion in the
 * contract score, or the reverse, without anyone deciding it should.
 */
export const buildEvaluatorKindIndex = (
  aggregated: readonly AggregatedModelScores[],
  configKinds: Readonly<Record<string, EvaluatorKindTag>> = {}
): EvaluatorKindIndex => {
  const docKinds = new Map<string, Set<EvaluatorKindTag>>();
  for (const model of aggregated) {
    for (const suite of model.suites) {
      for (const dataset of suite.datasets) {
        for (const evaluator of dataset.evaluators) {
          if (!evaluator.kind) {
            continue;
          }
          const kinds = docKinds.get(evaluator.evaluatorName) ?? new Set();
          kinds.add(evaluator.kind);
          docKinds.set(evaluator.evaluatorName, kinds);
        }
      }
    }
  }

  const configKindOf = (name: string): EvaluatorKindTag | undefined =>
    configKinds[name] ?? configKinds[baseName(name)];

  const conflicts: EvaluatorKindConflict[] = [];
  const resolved = new Map<string, EvaluatorKindTag | undefined>();
  const names = new Set([...docKinds.keys(), ...Object.keys(configKinds)]);
  for (const name of names) {
    const kinds = new Set(docKinds.get(name) ?? []);
    const fromConfig = configKindOf(name);
    if (fromConfig) {
      kinds.add(fromConfig);
    }
    if (kinds.size > 1) {
      conflicts.push({ evaluatorName: name, kinds: [...kinds].sort() });
      resolved.set(name, undefined);
    } else {
      resolved.set(name, [...kinds][0]);
    }
  }

  return {
    kindOf: (name) => (resolved.has(name) ? resolved.get(name) : configKindOf(name)),
    conflicts: conflicts.sort((a, b) => a.evaluatorName.localeCompare(b.evaluatorName)),
  };
};
