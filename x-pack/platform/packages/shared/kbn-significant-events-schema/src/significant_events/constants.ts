/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_ID_LENGTH = 255;
export const MAX_RULE_NAME_LENGTH = 255;
export const MAX_TITLE_LENGTH = 512;
export const MAX_TEXT_LENGTH = 10_000;
export const MAX_ARRAY_LENGTH = 100;
export const MAX_SIGNAL_DESCRIPTION_LENGTH = 350;
export const MAX_SYMPTOM_HYPOTHESIS_LENGTH = 300;
export const MAX_SUMMARY_LENGTH = 600;
export const MAX_ASSESSMENT_NOTE_LENGTH = 400;

export const SYMPTOM_HYPOTHESIS_ROLE_RULE =
  'This is the causal explanation, not the observed-state report. Use current evidence and selected causal_features to support the mechanism; use blast_radius only to explain evidenced propagation. When verification is healthy, empty, or off-topic, state that no failure mechanism is confirmed; do not infer traffic, throughput, instability, or another mechanism from the detection alone.';
export const SUMMARY_ROLE_RULE =
  'This is the discovery observation, not a root-cause explanation. Do not assert a causal mechanism or inferred cascade; that belongs in symptom_hypothesis. Preserve the decisive technical signature when one is present, including the normalized error type or code, operation, protocol, endpoint, port, and non-sensitive address when relevant to the observed condition. Include an evidence-supported component or dependency path from query KI context or resolved feature metadata when it helps an operator understand the observed failure, but describe it as observed context rather than a proven cause. When no failure signature is observed, lead with the concise observed success, health, or off-topic signature and identify the anomaly as an unconfirmed rate or volume observation. State the outcome, not the investigation: prefer "No matching failure signature was observed" over "The verification returned no rows."';
export const ASSESSMENT_NOTE_ROLE_RULE =
  'State the assessment decision and the evidence, severity rationale, confidence, or uncertainty that determined it; detailed decision reasoning is useful. Do not merely copy the summary, symptom_hypothesis, or signal description, and do not narrate investigation steps or detection metadata. It may reference the decisive technical signature when needed to justify the lifecycle decision. Prefer "Kept open because the refused payment connection confirms an active failure; the single observed path supports high but not critical severity" over a restatement of the log row.';

/** Shared narrative-field rule: never let evidence-derived text reproduce a raw sensitive value. */
export const NO_RAW_SENSITIVE_VALUES_RULE =
  'Never quote PII, PCI DSS data, SSNs, credentials, secrets, tokens, opaque identifiers, email addresses, or even truncated identifiers. Non-sensitive error types, message excerpts, endpoints, and aggregate counts are allowed when they identify the observed condition.';
