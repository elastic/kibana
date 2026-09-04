/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity, SeverityAssessment } from '@kbn/significant-events-schema';

/**
 * Discovery assessments stay active for one hour. Investigation assessments stay active for
 * 24 hours and take precedence over Discovery assessments while they remain active.
 */
const SOURCE_POLICY: Record<SeverityAssessment['source'], { priority: number; ttlMs: number }> = {
  discovery: { priority: 1, ttlMs: 60 * 60 * 1000 },
  investigation: { priority: 2, ttlMs: 24 * 60 * 60 * 1000 },
};

export const isSeverityAssessmentActive = (
  assessment: SeverityAssessment,
  materializedAt: string
): boolean =>
  assessment.invalidated_at === undefined &&
  Date.parse(assessment.assessed_at) + SOURCE_POLICY[assessment.source].ttlMs >
    Date.parse(materializedAt);

/**
 * Selects the effective severity from active assessments by source priority and then recency.
 * Later array entries win exact ties; the current severity is preserved when none are eligible.
 */
export const materializeSeverity = ({
  assessments,
  currentSeverity,
  materializedAt,
}: {
  assessments: SeverityAssessment[];
  currentSeverity: Severity;
  materializedAt: string;
}): Severity => {
  let selected: SeverityAssessment | undefined;

  assessments.forEach((assessment) => {
    if (!isSeverityAssessmentActive(assessment, materializedAt)) return;
    if (selected === undefined) {
      selected = assessment;
      return;
    }

    const selectedPolicy = SOURCE_POLICY[selected.source];
    const assessmentPolicy = SOURCE_POLICY[assessment.source];
    const priorityDelta = assessmentPolicy.priority - selectedPolicy.priority;
    const assessedAtDelta = Date.parse(assessment.assessed_at) - Date.parse(selected.assessed_at);

    if (priorityDelta > 0 || (priorityDelta === 0 && assessedAtDelta >= 0)) {
      selected = assessment;
    }
  });

  return selected?.severity ?? currentSeverity;
};
