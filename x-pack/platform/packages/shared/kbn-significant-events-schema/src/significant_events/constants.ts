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
/**
 * The event's title, symptom_hypothesis, summary, assessment_note and severity describe one event
 * from different angles, so they have to agree.
 */
export const NARRATIVE_AGREEMENT_RULE =
  'Agreement: the event’s text fields and its severity describe one event from different angles. They name the same operations and paths, state the same impact and completion, and none contradicts a signal description or another field.';

export const SYMPTOM_HYPOTHESIS_ROLE_RULE = dedent`
  Reader: the on-call engineer who needs the mechanism, not the symptoms. This is the causal explanation, not the observed-state report.
  At most three sentences. Sentence 1: the deepest evidence-supported failing component or dependency, its concrete failure signature, and how it reaches the affected operation. Sentence 2, when the confirming descriptions name several distinct targets or paths: how they relate, a component they share or independent failures, never only the first path. Sentence 3, only when the descriptions state how the failure ended: that outcome, as stated. For an event grouping several detections, the sentences name the earliest abnormal rule and how the others follow along grounded edges.
  Sources: confirming signal descriptions first; causal_features and matched KI context support the mechanism; blast_radius only explains evidenced propagation. Name a service, dependency, or causal link only when a confirming row or a topology edge with that source and target shows it. Rows outrank topology.
  Not here: the observed failures and their share (summary); severity or confidence reasoning (assessment_note).
  ${NARRATIVE_AGREEMENT_RULE}
  When verification is healthy, empty, or off-topic, state that no failure mechanism is confirmed; do not infer traffic, throughput, instability, or another mechanism from the detection alone.
`;

export const SUMMARY_ROLE_RULE = dedent`
  Reader: the operator scanning the event list. This is what was observed and how far it reaches, not why. At most three sentences.
  Sentence 1: the observed failure — the normalized error signature (error type or code, operation, protocol, endpoint, port, and non-sensitive address when relevant), every distinct component, target or path the confirming descriptions name, and what they state about how the failure ended. When no failure signature is observed, state the observed success, health, or off-topic signature instead and identify the anomaly as an unconfirmed rate or volume observation.
  Sentences 2–3: whether impact is confirmed, possible, or not established (confirmed only when a description states the operation failing to complete; possible impact is conditional and scoped); onset, how long it has lasted, and current or recovery state; magnitude only when measured, copied as the percentage P% from the "N of M (P%)" figure in the signal descriptions with its one decimal place and the scope that figure names (for example log lines), never with the N of M counts, never recomputed over a filtered subset, and never presented as a share of attempts when it is a share of log lines. When a signal description gives a count with no measured total, there is no percentage to copy: state that count as it is, with its scope.
  Sources: confirming signal descriptions. Matched query KI descriptions or resolved feature metadata may name the component or dependency path, described as observed context rather than a proven cause.
  ${NARRATIVE_AGREEMENT_RULE}
  Not here: any causal mechanism or inferred cascade, including because/so/propagates wording (symptom_hypothesis); severity or confidence reasoning (assessment_note); actions, urgency language, p_value or severity_score; how the evidence was collected. State the outcome, not the investigation: "No matching failure signature was observed", never "The verification returned no rows."
`;

export const ASSESSMENT_NOTE_ROLE_RULE = dedent`
  Reader: the operator deciding whether to trust the severity and confidence. This is judgement, not a recap. At most three short sentences.
  Sentence 1: the severity rung that decided the tier, the measured figures that put it there, what the descriptions state about whether the affected operation completes, and the other cues they state that bore on the tier, whichever way they point, reading every signal rather than the strongest one, and the blast_radius for how far the paths reach (a share of log lines is not a share of attempts). For medium, say what the evidence left unsettled or unmeasured; for low, whether it recovered or was never an issue. For an inactive or recovering event, give the recovery, false-alarm, or benign-change rationale instead. Name the operations and dependency paths the tier covers, from the descriptions and the blast_radius, rather than restating the log row: "<named operations or paths>; <measured breadth> meets the <tier> condition".
  Sentence 2: what was ruled out or left unverified. For an adjacent tier you rejected, name the operations, paths or cues you weighed and why they fall short, not only that its condition was unmet. A count or share that could not be measured is a caveat recorded here, never the reason for a lower tier. Whether the operation completes is not a count or share: when the descriptions leave it unresolved, say so in sentence 1, as the reason the tier is the lower of the adjacent tiers.
  Sentence 3: why this confidence, with confidence displayed as percentage P% rounded to one decimal place.
  ${NARRATIVE_AGREEMENT_RULE}
  Not here: the observed failure or impact (summary), the mechanism (symptom_hypothesis), signal descriptions, investigation steps, or detection metadata.
`;

/**
 * How discovery applies the shared severity contract to what the confirming signal descriptions
 * state. It is attached to discovery's write tool only: the investigator keeps its own ladder.
 */
export const DISCOVERY_SEVERITY_APPLICATION_RULE = dedent`
  How discovery applies this contract to what the confirming signal descriptions state:
  - Weigh every cue the descriptions state about the outcome and the conditions against the ladder, whichever way it points.
  - A cue showing the failure was contained (caught, retried, absorbed or recovered by the system) points to limited reach and unresolved completion: it moves the rating from "high" toward "medium" unless a description also states the operation failing to complete. Demonstrated tolerance is what "low" needs.
  - A cue showing the failure spreading or blocking moves the rating the other way.
  - A count or share that was not measured never moves the tier.
  - Rate on the outcome the descriptions state for the operation. Unless a containment cue applies, an error, rejection or expiry a description reports for the operation is the operation failing. Only when the descriptions state no outcome for it (they cannot say whether it fails or completes) is completion unresolved: the tie-break then gives the lower of the adjacent tiers, and the assessment_note says so.
`;

/** Shared narrative-field rule: never let evidence-derived text reproduce a raw sensitive value. */
export const NO_RAW_SENSITIVE_VALUES_RULE =
  'Never quote PII, PCI DSS data, SSNs, credentials, secrets, tokens, opaque identifiers, email addresses, or even truncated identifiers. Non-sensitive error types, message excerpts, endpoints, and aggregate counts are allowed when they identify the observed condition.';
