/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { MatrixConfig } from './load_matrix_config';
import type { AggregatedModelScores } from './query_matrix_scores';

/**
 * Warn when a column's configured evaluator or suite names match nothing in the
 * fetched scores.
 *
 * A column that names an evaluator no score document carries does not fail: the
 * allowlist simply skips every evaluator it does not recognise and averages
 * whatever is left. The attack-discovery column asked for `Rubric` and
 * `StrictTrajectory` while the suite writes `AttackDiscoveryRubric` and no
 * strict-trajectory evaluator at all, so it silently averaged two of three
 * evaluators and published 10.0 where the honest figure was 6.67.
 *
 * Names are compared against the data actually returned, so a typo, a renamed
 * evaluator, or a suite that stopped emitting one all surface the same way.
 */
export function warnOnConfiguredNamesMissingFromData(
  config: MatrixConfig,
  aggregated: AggregatedModelScores[],
  log: ToolingLog
): void {
  const evaluatorsInData = new Set<string>();
  const suitesInData = new Set<string>();

  for (const model of aggregated) {
    for (const suite of model.suites) {
      suitesInData.add(suite.suiteId);
      for (const dataset of suite.datasets) {
        for (const evaluator of dataset.evaluators) {
          evaluatorsInData.add(evaluator.evaluatorName);
        }
      }
    }
  }

  // Nothing came back at all: the caller already fails on an empty match, and
  // reporting every configured name as missing would bury that.
  if (evaluatorsInData.size === 0) {
    return;
  }

  for (const column of config.columns) {
    const missingEvaluators = (column.evaluators ?? []).filter(
      (name) => !evaluatorsInData.has(name)
    );
    const missingSuites = (column.suites ?? []).filter((id) => !suitesInData.has(id));

    if (missingEvaluators.length > 0) {
      log.warning(
        `column '${column.id}' names evaluator(s) absent from every score document: ` +
          `${missingEvaluators.join(', ')} -- the column still scores, but only over the ` +
          `evaluators that did match, so its value is an average of a subset. ` +
          `Evaluators present: ${[...evaluatorsInData].sort().join(', ')}`
      );
    }

    if (missingSuites.length > 0) {
      log.warning(
        `column '${column.id}' names suite(s) with no scores in this window: ` +
          `${missingSuites.join(', ')}`
      );
    }
  }
}
