/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PackagePolicyPermissionSummary,
  VerificationStatus,
} from '../../../common/types/models/cloud_connector';

/**
 * Roll-up cell state per the epic's vocabulary. Frontend-computed — the backend
 * stores only the flat `permissions[]` list and `verification_status`; this
 * function combines both and returns the single state the UI renders.
 *
 * Worst-state-wins priority for result states: error > denied > required > verified.
 * Non-result fallback uses Layer 1 (`verification_status`).
 */
export type CellState =
  | { state: 'verified'; count: number }
  | { state: 'required'; count: number }
  | { state: 'denied'; count: number }
  | { state: 'error'; count: number }
  | { state: 'verifying' }
  | { state: 'verification_failed' }
  | { state: 'unknown' };

/**
 * Reduce one summary's `permissions[]` into a single `CellState`, with a Layer 1
 * fallback when there's no summary.
 *
 * Callers typically `.find` the relevant summary themselves (one lookup) and pass
 * it in — keeps the cost down vs. the previous design that did the lookup twice.
 *
 * - `permissions` with at least one `error`   → state = 'error'
 * - else with at least one `denied`           → state = 'denied'
 * - else with at least one `required`         → state = 'required'
 * - else (all verified or skipped)            → state = 'verified'
 *
 * If summary is undefined:
 *   - verificationStatus === 'pending'  → 'verifying'
 *   - verificationStatus === 'failed'   → 'verification_failed'
 *   - otherwise                         → 'unknown'
 */
export function getPermissionStateFromSummary(
  summary: PackagePolicyPermissionSummary | undefined,
  verificationStatus: VerificationStatus | undefined
): CellState {
  if (summary?.permissions?.length) {
    const counts = { verified: 0, required: 0, denied: 0, error: 0, skipped: 0 };
    for (const permission of summary.permissions) {
      if (permission.status in counts) {
        counts[permission.status] += 1;
      }
    }

    if (counts.error > 0) return { state: 'error', count: counts.error };
    if (counts.denied > 0) return { state: 'denied', count: counts.denied };
    if (counts.required > 0) return { state: 'required', count: counts.required };
    return { state: 'verified', count: counts.verified };
  }

  // No Layer 2 data — fall through to Layer 1 lifecycle state.
  if (verificationStatus === 'pending') return { state: 'verifying' };
  if (verificationStatus === 'failed') return { state: 'verification_failed' };
  return { state: 'unknown' };
}

/**
 * Aggregate counts across every permission of every package_policy summary.
 *
 * Used by Story 4 (identity-level header rollup): the per-row roll-up operates on
 * one summary; this operates on the whole `verification_permissions[]` array,
 * summing each status across all summaries.
 */
export interface IdentityPermissionTotals {
  verified: number;
  required: number;
  denied: number;
  error: number;
  skipped: number;
  integrations: number;
}

export function getIdentityPermissionTotals(
  verificationPermissions: PackagePolicyPermissionSummary[] | undefined
): IdentityPermissionTotals {
  const totals: IdentityPermissionTotals = {
    verified: 0,
    required: 0,
    denied: 0,
    error: 0,
    skipped: 0,
    integrations: verificationPermissions?.length ?? 0,
  };
  for (const summary of verificationPermissions ?? []) {
    for (const permission of summary.permissions ?? []) {
      if (permission.status in totals) {
        totals[permission.status] += 1;
      }
    }
  }
  return totals;
}

/**
 * Identity-level rollup state for the flyout header (Story 4).
 *
 * Worst-state-wins priority across all permissions of all summaries:
 *   error > denied > required > verified.
 *
 * If `verificationPermissions` is empty, falls back to Layer 1
 * (`verificationStatus`) the same way the per-row roll-up does.
 */
export function getIdentityPermissionState(
  verificationPermissions: PackagePolicyPermissionSummary[] | undefined,
  verificationStatus: VerificationStatus | undefined
): CellState {
  const totals = getIdentityPermissionTotals(verificationPermissions);
  const anyPermissions =
    totals.verified + totals.required + totals.denied + totals.error + totals.skipped;

  if (anyPermissions > 0) {
    if (totals.error > 0) return { state: 'error', count: totals.error };
    if (totals.denied > 0) return { state: 'denied', count: totals.denied };
    if (totals.required > 0) return { state: 'required', count: totals.required };
    return { state: 'verified', count: totals.verified };
  }

  if (verificationStatus === 'pending') return { state: 'verifying' };
  if (verificationStatus === 'failed') return { state: 'verification_failed' };
  return { state: 'unknown' };
}
