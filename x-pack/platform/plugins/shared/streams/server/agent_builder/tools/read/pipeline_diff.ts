/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStep } from '@kbn/streamlang/types/streamlang';

/**
 * Per-step diff annotation surfaced to the agent so it can present a clear
 * before/after view to the user before any change is applied.
 *
 * - `unchanged` — the step exists structurally identically in both pipelines.
 * - `added` — the step is in the proposed pipeline but not in the existing one.
 * - `removed` — the step was in the existing pipeline but is no longer in the
 *    proposed one. Always worth a warning: the LLM may have dropped it
 *    silently, or the user may have asked to remove it.
 */
export type StepChangeKind = 'unchanged' | 'added' | 'removed';

export interface StepChange {
  kind: StepChangeKind;
  /** Position in the proposed pipeline. `null` for removed steps. */
  proposed_index: number | null;
  /** Position in the existing pipeline. `null` for added steps. */
  existing_index: number | null;
  step: StreamlangStep;
  /** Short human-readable label, e.g. "grok on body.text". */
  label: string;
}

export interface PipelineDiff {
  changes: StepChange[];
  added_count: number;
  removed_count: number;
  unchanged_count: number;
}

/**
 * Stable canonical signature used for structural equality between two steps.
 * `JSON.stringify` is sensitive to key order; we sort keys recursively so two
 * steps that differ only in key insertion order are still recognized as
 * identical.
 */
const canonicalSignature = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalSignature).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalSignature(v)}`);
  return `{${entries.join(',')}}`;
};

/**
 * Best-effort short label for a step — covers the common processor actions
 * and falls back to the action name for anything exotic.
 */
export const labelForStep = (step: StreamlangStep): string => {
  const obj = step as unknown as Record<string, unknown>;
  const action = typeof obj.action === 'string' ? obj.action : 'step';
  const from = typeof obj.from === 'string' ? obj.from : undefined;
  const to = typeof obj.to === 'string' ? obj.to : undefined;
  if (from && to) return `${action} on ${from} → ${to}`;
  if (from) return `${action} on ${from}`;
  if (to) return `${action} to ${to}`;
  return action;
};

/**
 * Compute a per-step structural diff between an existing and a proposed
 * pipeline. Steps are matched by canonical signature, so structural mutations
 * (e.g. a grok pattern changed) appear as one removal plus one addition. We
 * deliberately do not collapse these into a `modified` category: distinguishing
 * "step was edited" from "step was dropped and a new one added" is unreliable
 * without explicit identifiers, and conflating them risks hiding silent drops
 * from the user — exactly the failure mode this diff is designed to surface.
 */
export const computePipelineDiff = (
  existingSteps: StreamlangStep[],
  proposedSteps: StreamlangStep[]
): PipelineDiff => {
  const existingSignatures = existingSteps.map(canonicalSignature);
  const proposedSignatures = proposedSteps.map(canonicalSignature);

  const matchedExisting = new Set<number>();
  const changes: StepChange[] = [];

  proposedSteps.forEach((step, proposedIndex) => {
    const sig = proposedSignatures[proposedIndex];
    const existingIndex = existingSignatures.findIndex(
      (existingSig, idx) => existingSig === sig && !matchedExisting.has(idx)
    );

    if (existingIndex >= 0) {
      matchedExisting.add(existingIndex);
      changes.push({
        kind: 'unchanged',
        proposed_index: proposedIndex,
        existing_index: existingIndex,
        step,
        label: labelForStep(step),
      });
    } else {
      changes.push({
        kind: 'added',
        proposed_index: proposedIndex,
        existing_index: null,
        step,
        label: labelForStep(step),
      });
    }
  });

  existingSteps.forEach((step, existingIndex) => {
    if (!matchedExisting.has(existingIndex)) {
      changes.push({
        kind: 'removed',
        proposed_index: null,
        existing_index: existingIndex,
        step,
        label: labelForStep(step),
      });
    }
  });

  return {
    changes,
    added_count: changes.filter((c) => c.kind === 'added').length,
    removed_count: changes.filter((c) => c.kind === 'removed').length,
    unchanged_count: changes.filter((c) => c.kind === 'unchanged').length,
  };
};

/**
 * Build a human-readable warning per existing step the agent appears to be
 * dropping. The agent surfaces these to the user so silent drops can never
 * happen — the user is always informed what existing behaviour is going away
 * before they confirm.
 */
export const buildDropWarnings = (diff: PipelineDiff): string[] =>
  diff.changes
    .filter((change) => change.kind === 'removed')
    .map(
      (change) =>
        `The proposed pipeline REMOVES the existing step #${(change.existing_index ?? 0) + 1} (${
          change.label
        }). Confirm with the user before applying — if they did not ask to remove it, treat as low confidence and ask.`
    );
