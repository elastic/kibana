/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SyncSelectedPhaseResult<TPhase extends string> =
  | { action: 'none' }
  | { action: 'set'; phase: TPhase | undefined };

/**
 * Shared “phase syncing” helper used by ILM and DLM flyouts.
 *
 * If the currently selected phase isn’t enabled:
 * - try to enable it (and set defaults) via `ensurePhaseEnabledWithDefaults`
 * - if that fails (e.g. blocked by prerequisites), pick `getFallbackPhase()`
 */
export const syncSelectedPhase = <TPhase extends string>({
  selectedPhase,
  enabledPhases,
  ensurePhaseEnabledWithDefaults,
  getFallbackPhase,
}: {
  selectedPhase: TPhase | undefined;
  enabledPhases: ReadonlyArray<TPhase>;
  ensurePhaseEnabledWithDefaults: (phase: TPhase) => boolean;
  getFallbackPhase: () => TPhase | undefined;
}): SyncSelectedPhaseResult<TPhase> => {
  if (!selectedPhase) return { action: 'none' };
  if (enabledPhases.includes(selectedPhase)) return { action: 'none' };

  const ok = ensurePhaseEnabledWithDefaults(selectedPhase);
  if (ok) return { action: 'none' };

  return { action: 'set', phase: getFallbackPhase() };
};
