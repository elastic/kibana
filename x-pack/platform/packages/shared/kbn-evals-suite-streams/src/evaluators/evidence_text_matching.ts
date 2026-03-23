/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SHORT_EVIDENCE_MAX_LENGTH = 3;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Evidence matching helper:
 * - For very short evidence snippets (<= 3 chars), require token boundaries to avoid
 *   false positives (e.g. "GET" matching "TARGET").
 * - For longer evidence snippets, use a simple substring match.
 */
export function matchesEvidenceText(value: string, evidence: string): boolean {
  const normalizedEvidence = evidence.trim();
  if (normalizedEvidence.length === 0) {
    return false;
  }

  if (normalizedEvidence.length <= SHORT_EVIDENCE_MAX_LENGTH) {
    return new RegExp(`(^|[^a-zA-Z0-9_])${escapeRegExp(normalizedEvidence)}($|[^a-zA-Z0-9_])`).test(
      value
    );
  }

  return value.includes(normalizedEvidence);
}
