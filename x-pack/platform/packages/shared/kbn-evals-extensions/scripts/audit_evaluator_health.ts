/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Audits every evaluator in a golden extract and reports which ones can
 * actually separate models.
 *
 *   AGGREGATED_JSON=/tmp/aggregated_v5.json \
 *     node --require @kbn/setup-node-env scripts/audit_evaluator_health.ts
 *
 * Exits non-zero when a grader is constant or saturated, so it can be wired
 * into a run as a gate rather than staying a retrospective script.
 */

import fs from 'fs';
import {
  checkEvaluatorHealth,
  type EvaluatorObservation,
  type EvaluatorFinding,
} from '../src/matrix/evaluator_health';

/**
 * Evaluators that assert a required behaviour rather than grading quality.
 * These are expected to sit at the ceiling; see evaluator_health.ts.
 *
 * NOTE: matching on names is a stopgap. Role belongs in the evaluator
 * definition, because a name-based list can be widened until the audit passes
 * -- exactly the failure this tool exists to prevent. Anything listed here is
 * a claim that the evaluator is pass/fail, and is only as good as that claim:
 * `RequiredAlertIdsInResponse` and `DocVersionReleaseDate` return a constant
 * 1.000 across all 159 observations, and calling them gates means the audit
 * stops asking whether they were ever able to fail.
 */
const GATE_PATTERNS = [
  /^Should/i,
  /^Skill ?Invoked/i,
  /^ExpectedSkillInvocation$/i,
  /^ExpectedToolCalled$/i,
  /^ForbiddenTools$/i,
  /^FinalAnswerPresent$/i,
  /^MinExpectedSteps$/i,
  /^WorkflowEvidence$/i,
  /^RequiredAlertIdsInResponse$/i,
  /^DocVersionReleaseDate$/i,
];

const isGate = (name: string) => GATE_PATTERNS.some((p) => p.test(name));

/** Cost/latency metrics are not 0-1 scores and must not be audited as such. */
const NON_SCORE = /token|latency|cost per|duration|^Tool Calls$/i;

function main() {
  const path = process.env.AGGREGATED_JSON;
  if (!path) throw new Error('AGGREGATED_JSON is required');

  const models = JSON.parse(fs.readFileSync(path, 'utf8')) as any[];
  const bySuite = new Map<string, EvaluatorObservation[]>();

  for (const model of models) {
    for (const suite of model.suites ?? []) {
      for (const dataset of suite.datasets ?? []) {
        for (const evaluator of dataset.evaluators ?? []) {
          const name: string = evaluator.evaluatorName;
          if (NON_SCALE(evaluator) || NON_SCORE.test(name)) continue;

          const list = bySuite.get(suite.suiteId) ?? [];
          list.push({
            evaluatorName: name,
            modelId: model.modelId,
            score: evaluator.mean,
            role: isGate(name) ? 'gate' : 'grader',
          });
          bySuite.set(suite.suiteId, list);
        }
      }
    }
  }

  let failed = false;
  for (const [suiteId, observations] of [...bySuite.entries()].sort()) {
    const report = checkEvaluatorHealth({ observations });
    failed ||= !report.ok;

    process.stdout.write(`\n=== ${suiteId}\n`);
    const order: Record<string, number> = { constant: 0, saturated: 1, 'gate-failing': 2 };
    const sorted = [...report.findings].sort(
      (a, b) => (order[a.classification] ?? 9) - (order[b.classification] ?? 9)
    );
    for (const f of sorted) process.stdout.write(line(f));
    process.stdout.write(
      `  composite-safe (${report.compositeSafe.length}/${report.findings.length}): ` +
        `${report.compositeSafe.join(', ') || 'none'}\n`
    );
  }

  if (failed) {
    process.stdout.write(
      '\nFAIL: at least one grader cannot separate models. A rejudge will not fix this;\n' +
        'the rubric has to get finer-grained. See docs/rejudging_a_golden_column.md.\n'
    );
    process.exitCode = 1;
  }
}

const NON_SCALE = (evaluator: { mean: number; max?: number }) =>
  evaluator.mean > 1 || (evaluator.max ?? 0) > 1;

function line(f: EvaluatorFinding): string {
  const mark = {
    constant: 'DEAD',
    saturated: 'SAT ',
    'gate-failing': 'GATE',
    'insufficient-data': 'n/a ',
  }[f.classification as string];
  return (
    `  ${(mark ?? 'ok  ').padEnd(5)}${f.evaluatorName.padEnd(30)}` +
    `n=${String(f.observationCount).padEnd(5)}` +
    `distinct=${String(f.distinctValues).padEnd(4)}` +
    `@ceiling=${(f.ceilingShare * 100).toFixed(1)}%\n`
  );
}

main();
