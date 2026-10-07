/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntitySummaryHighlight } from './entity_summary_staleness';

/**
 * Structural limits for a generated entity AI summary. The character budget in the
 * prompt is only a soft nudge (the model cannot count reliably), so these count caps
 * are the authoritative "keep it a summary" enforcement applied before persistence
 * and display. Capping counts — rather than truncating prose — avoids cutting a
 * highlight mid-sentence.
 */
export const MAX_ENTITY_SUMMARY_HIGHLIGHTS = 4;

/** Max recommended actions persisted/displayed for an entity AI summary. */
export const MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS = 3;

/**
 * Per-field character caps for the entity AI summary request payloads. These bound
 * untrusted string input at the validation boundary so a malicious/oversized request
 * cannot cause a Denial of Service. They are generous relative to the prompt's soft
 * character budget — the authoritative "keep it a summary" trimming is done by the
 * count caps above; these are purely a safety ceiling.
 */
export const MAX_ENTITY_ID_LENGTH = 1024;

/** Max length of an entity type identifier (e.g. `user`, `host`). */
export const MAX_ENTITY_TYPE_LENGTH = 128;

/** Max length of a single highlight title. */
export const MAX_SUMMARY_HIGHLIGHT_TITLE_LENGTH = 256;

/** Max length of a single highlight body / recommended action prose. */
export const MAX_SUMMARY_TEXT_LENGTH = 2000;

/** Max length of an ML anomaly detection job id. */
export const MAX_SUMMARY_ANOMALY_JOB_ID_LENGTH = 256;

/** Max length of the prompt variant identifier. */
export const MAX_SUMMARY_VARIANT_ID_LENGTH = 256;

/** The LLM-produced content subject to the structural caps. */
export interface EntitySummaryContent {
  highlights: EntitySummaryHighlight[];
  recommended_actions?: string[] | null;
}

export interface CappedEntitySummaryContent {
  /** Highlights trimmed to at most {@link MAX_ENTITY_SUMMARY_HIGHLIGHTS}. */
  highlights: EntitySummaryHighlight[];
  /**
   * Recommended actions trimmed to at most
   * {@link MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS}. `null`/absent is preserved as
   * `null` so callers can keep omitting the field rather than writing `[]`.
   */
  recommended_actions: string[] | null;
  /** Highlights the model produced before capping (for telemetry). */
  highlightsCount: number;
  /** Recommended actions the model produced before capping (for telemetry). */
  recommendedActionsCount: number;
  /** Highlights dropped by the cap; `0` when within budget. */
  highlightsDropped: number;
  /** Recommended actions dropped by the cap; `0` when within budget. */
  recommendedActionsDropped: number;
}

/**
 * Applies the structural caps to a generated summary and reports how much was
 * dropped. Pure and side-effect free so it can run on both the client (display)
 * and the server (authoritative persist + overshoot telemetry).
 */
export const capEntitySummaryContent = (
  content: EntitySummaryContent
): CappedEntitySummaryContent => {
  const highlights = Array.isArray(content.highlights) ? content.highlights : [];
  const recommendedActions = Array.isArray(content.recommended_actions)
    ? content.recommended_actions
    : null;

  const cappedHighlights = highlights.slice(0, MAX_ENTITY_SUMMARY_HIGHLIGHTS);
  const cappedRecommendedActions =
    recommendedActions === null
      ? null
      : recommendedActions.slice(0, MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS);

  const recommendedActionsCount = recommendedActions?.length ?? 0;

  return {
    highlights: cappedHighlights,
    recommended_actions: cappedRecommendedActions,
    highlightsCount: highlights.length,
    recommendedActionsCount,
    highlightsDropped: highlights.length - cappedHighlights.length,
    recommendedActionsDropped: recommendedActionsCount - (cappedRecommendedActions?.length ?? 0),
  };
};
