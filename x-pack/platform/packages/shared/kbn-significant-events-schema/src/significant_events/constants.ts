/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

export const MAX_SHORT_STRING_LENGTH = 255;
export const MAX_MEDIUM_STRING_LENGTH = 512;
export const MAX_ID_LENGTH = 255;
export const MAX_RULE_NAME_LENGTH = 255;
export const MAX_TITLE_LENGTH = 512;
export const MAX_TEXT_LENGTH = 10_000;
export const MAX_ARRAY_LENGTH = 100;

/**
 * Stable source identifier for Significant Event alert documents in `.rule-events`.
 * Part of `group_hash = sha256(space:source:fingerprint)` — never change after first write.
 * Uses the reserved `elastic*` namespace so workflow callers cannot claim this series via
 * `createAlertEventDataSchema` (which rejects that prefix). Internal producers write through
 * AlertEventsClient, not the external create-alert workflow schema.
 * Used by readers and action policies to filter Significant Events by source.
 */
export const SIGNIFICANT_EVENTS_ALERT_SOURCE = 'elastic.significant_events' as const;
export const MAX_TIMESTAMP_LENGTH = 64;

/**
 * Content contracts for the free-text narrative fields: the single source of truth for what each
 * field holds. They feed the tool schema descriptions and the eval judge; the discovery prompt
 * refers to the field descriptions and never embeds these strings. Bounded by sentences, not characters.
 */
export const SYMPTOM_HYPOTHESIS_ROLE_RULE = dedent`
  Reader: the on-call engineer who needs the mechanism, not the symptoms. This is the causal explanation, not the observed-state report.
  One plain sentence: the deepest evidence-supported failing component or dependency, its concrete failure signature, and how it reaches the affected operation. For an event grouping several detections, the same sentence names the earliest abnormal rule and how the others follow along grounded edges.
  Sources: confirming signal descriptions first; causal_features and matched KI context support the mechanism; blast_radius only explains evidenced propagation. Name a service, dependency, or causal link only when a confirming row or a topology edge with that source and target shows it. Rows outrank topology.
  Not here: the observed failures and their share (summary); severity or confidence reasoning (assessment_note).
  When verification is healthy, empty, or off-topic, state that no failure mechanism is confirmed; do not infer traffic, throughput, instability, or another mechanism from the detection alone.
`;

export const SUMMARY_ROLE_RULE = dedent`
  Reader: the operator scanning the event list. This is what was observed and how far it reaches, not why. At most three sentences.
  Sentence 1: the observed failure — the normalized error signature (error type or code, operation, protocol, endpoint, port, and non-sensitive address when relevant) and the affected component or dependency path. When no failure signature is observed, state the observed success, health, or off-topic signature instead and identify the anomaly as an unconfirmed rate or volume observation.
  Sentences 2–3: whether impact is confirmed, possible, or not established (possible impact is conditional and scoped); onset and current or recovery state; magnitude only when measured, copied as the percentage P% from the "N of M (P%)" figure in the signal descriptions with its one decimal place and the scope that figure names (for example log lines), never with the N of M counts, never recomputed over a filtered subset, and never presented as a share of attempts when it is a share of log lines. When a signal description gives a count with no measured total, there is no percentage to copy: state that count as it is, with its scope.
  Sources: confirming signal descriptions. Matched query KI descriptions or resolved feature metadata may name the component or dependency path, described as observed context rather than a proven cause.
  Not here: any causal mechanism or inferred cascade, including because/so/propagates wording (symptom_hypothesis); severity or confidence reasoning (assessment_note); actions, urgency language, p_value or severity_score; how the evidence was collected. State the outcome, not the investigation: "No matching failure signature was observed", never "The verification returned no rows."
`;

export const ASSESSMENT_NOTE_ROLE_RULE = dedent`
  Reader: the operator deciding whether to trust the severity and confidence. This is judgement, not a recap. At most three short sentences.
  Sentence 1: the severity rung that decided the tier and the measured figures that put it there, reading every signal rather than the strongest one (a share of log lines is not a share of attempts). For medium, say what the evidence left unsettled or unmeasured; for low, whether it recovered or was never an issue. For an inactive or recovering event, give the recovery, false-alarm, or benign-change rationale instead. Prefer "<confirmed failure>; <measured breadth> meets the <tier> condition" over restating the log row.
  Sentence 2: what was ruled out or left unverified. A figure that could not be measured is a caveat recorded here, never the reason for a lower tier.
  Sentence 3: why this confidence, with confidence displayed as percentage P% rounded to one decimal place.
  Not here: the observed failure or impact (summary), the mechanism (symptom_hypothesis), signal descriptions, investigation steps, or detection metadata.
`;

/** Shared narrative-field rule: never let evidence-derived text reproduce a raw sensitive value. */
export const NO_RAW_SENSITIVE_VALUES_RULE =
  'Never quote PII, PCI DSS data, SSNs, credentials, secrets, tokens, opaque identifiers, email addresses, or even truncated identifiers. Non-sensitive error types, message excerpts, endpoints, and aggregate counts are allowed when they identify the observed condition.';
