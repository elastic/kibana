/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigatorEvaluator, InvestigatorOutput } from '../../types';

/**
 * CODE evaluator: the investigator's job is to COLLECT evidence — every rule it acts on must carry
 * at least one `evidences[]` entry (a query result, or a "no confirming query available"
 * disposition for rules with no KI; quiet rules get an informational entry). See Critical Rule 11.
 * This is distinct from `execute_esql_grounding` (did a tool call return rows): here we check the
 * investigator actually documented evidence per rule in its output.
 *
 * Score = rules with ≥1 attributed evidence / total rules. Evidence is matched to a rule by
 * `rule_uuid` (reliable attribution within a single output). Skips (null) when there are no
 * detections to cover.
 */
export const evidenceCollectionEvaluator: InvestigatorEvaluator = {
  name: 'evidence_collection',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const discoveries = (output as InvestigatorOutput)?.discoveries ?? [];

    let totalRules = 0;
    let covered = 0;
    const issues: string[] = [];

    for (const [i, discovery] of discoveries.entries()) {
      const doc = discovery as Record<string, unknown>;
      const detections = (doc.detections ?? []) as Array<Record<string, unknown>>;
      const evidences = (doc.evidences ?? []) as Array<Record<string, unknown>>;
      const evidenceRuleUuids = new Set(
        evidences.map((e) => e.rule_uuid).filter((id): id is string => Boolean(id))
      );

      for (const det of detections) {
        const ruleUuid = det.rule_uuid as string | undefined;
        if (!ruleUuid) {
          continue;
        }
        totalRules++;
        if (evidenceRuleUuids.has(ruleUuid)) {
          covered++;
        } else {
          issues.push(`[${i}] no evidence collected for rule "${det.rule_name ?? ruleUuid}"`);
        }
      }
    }

    if (totalRules === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No detections present — nothing to collect evidence for',
      });
    }

    const score = covered / totalRules;
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${totalRules} rule(s) have collected evidence`,
    });
  },
};
