/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The context engine AI index closed cases publish their outcome to. */
export const CASES_OUTCOMES_AI_INDEX_ID = 'cases-outcomes' as const;

/** Knowledge indicator `type` of a published case outcome. */
export const CASE_OUTCOME_KI_TYPE = 'case_outcome' as const;

/** The managed workflow that publishes and retracts case outcomes. */
export const CASES_PUBLISH_OUTCOME_WORKFLOW_ID = 'system-cases-publish-outcome' as const;

/** One knowledge indicator per case, so a later close replaces the earlier outcome. */
export const getCaseOutcomeKiId = (caseId: string) => `case:${caseId}`;

/** Prior outcomes look this far back. */
export const PRIOR_OUTCOMES_DAYS = 90;

/** Prior outcomes list at most this many cases. */
export const MAX_PRIOR_OUTCOMES = 10;

/**
 * The close modal posts the closing notes as a comment just before it closes the case. The
 * outcome takes the closer's latest comment written this long before the close as the notes.
 */
export const CLOSING_NOTES_WINDOW_MS = 5 * 60 * 1000;

export const INTERNAL_PRIOR_OUTCOMES_URL =
  '/internal/cases/{case_id}/prior_outcomes' as const;
