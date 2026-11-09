/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleDiagnosisContext } from './build_rule_diagnosis_handoff';

export const DIAGNOSE_PENDING_HANDOFF_STORAGE_KEY =
  'alertingV2.executionHistory.diagnose.pendingHandoff';

export interface PendingDiagnoseHandoff {
  context: RuleDiagnosisContext;
}

/** State B keeps the assembled context so finishing LLM setup resumes the same handoff. */
export const savePendingDiagnoseHandoff = (pending: PendingDiagnoseHandoff): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.setItem(DIAGNOSE_PENDING_HANDOFF_STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // best-effort
  }
};

export const loadPendingDiagnoseHandoff = (): PendingDiagnoseHandoff | null => {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(DIAGNOSE_PENDING_HANDOFF_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingDiagnoseHandoff) : null;
  } catch {
    return null;
  }
};

export const clearPendingDiagnoseHandoff = (): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.removeItem(DIAGNOSE_PENDING_HANDOFF_STORAGE_KEY);
  } catch {
    // best-effort
  }
};
