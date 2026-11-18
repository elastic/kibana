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
 * The event's title, symptom_hypothesis, summary, assessment_note and severity describe one event
 * from different angles, so they have to agree.
 */
export const NARRATIVE_AGREEMENT_RULE =
  'Agreement: the event’s text fields and its severity describe one event from different angles. They name the same operations and paths, state the same impact and completion, and none contradicts a signal description or another field.';

/**
 * Content contracts for the free-text narrative fields: the single source of truth for what each
 * field holds. They feed the tool schema descriptions and the eval judge; the discovery prompt
 * refers to the field descriptions and never embeds these strings. Bounded by sentences, not characters.
 */
export const SYMPTOM_HYPOTHESIS_ROLE_RULE = dedent`
  Reader: the on-call engineer who needs the mechanism, not the symptoms. This is the causal explanation, not the observed-state report.
  At most three sentences. Sentence 1: the deepest evidence-supported failing component or dependency, its concrete failure signature, and how it reaches the affected operation. Sentence 2, when the confirming descriptions name several distinct targets or paths: how they relate, a component they share or independent failures, never only the first path. Sentence 3, only when the descriptions state how the failure ended: that outcome, as stated. For an event grouping several detections, the sentences name the earliest abnormal rule and how the others follow along grounded edges.
  Sources: confirming signal descriptions first; causal_features and matched KI context support the mechanism; blast_radius only explains evidenced propagation. Name a service, dependency, or causal link only when a confirming row or a topology edge with that source and target shows it. Rows outrank topology.
  Cover the whole symptom the confirming descriptions measure: every service or path the confirming descriptions name, not one sampled row. A sampled row illustrates the failure; it names the failing component or dependency only when the measured rows or a topology edge show it as the failing path. When the failure spans several services and no dependency chain is shown, say it spans them and that no common cause is established; any other unestablished cause takes at most one clause, and longer unknowns belong in the assessment_note.
  Not here: the observed failures and their share (summary); severity or confidence reasoning (assessment_note).
  ${NARRATIVE_AGREEMENT_RULE}
  When verification is healthy, empty, or off-topic, state that no failure mechanism is confirmed; do not infer traffic, throughput, instability, or another mechanism from the detection alone.
`;

export const SUMMARY_ROLE_RULE = dedent`
  Reader: the operator scanning the event list. This is what was observed and how far it reaches, not why. At most three sentences.
  Sentence 1: the observed failure — the normalized error signature (error type or code, operation, protocol, endpoint, port, and non-sensitive address when relevant), up to three signatures, every distinct component, target or path the confirming descriptions name, and what they state about how the failure ended. When no failure signature is observed, state the observed success, health, or off-topic signature instead and identify the anomaly as an unconfirmed rate or volume observation.
  Sentences 2–3: whether impact is confirmed, possible, or not established (confirmed only when a description states the operation failing to complete; possible impact is conditional and scoped); for a new event, the scale (the count of failing lines and its window) and the onset; where it concentrates when the description gives it (the highest-share values, named, with their percent); how long it has lasted, and whether it is still present in the latest hour or its recovery state; magnitude only when measured, copied as the percentage P% of the "N of M (P%)" figure, as the signal descriptions state it, with the scope they name (for example log lines); the shares of message categories and of breakdown groups are not the magnitude; never with the N of M counts, never recomputed over a filtered subset, and never presented as a share of attempts when it is a share of log lines. When a signal description gives a count with no measured total, there is no percentage to copy: state that count with its scope.
  Write a count of 1,000 or more with \`k\` or \`M\` and one decimal (2,512 as 2.5k, 1,400,000 as 1.4M) and a smaller count exactly; a percentage stays as the description gives it.
  Write it as what happened, in plain prose, taking the important bits from the signal descriptions and not all of them. Leave out sampled-row \`field = value\` lists, the rest of the breakdown, the hourly range and the not-measured clause.
  Copy names as the signal descriptions write them: field names, \`field = value\` pairs and service or entity names stay in backticks, and no other text is in backticks. Name the field of a breakdown only when a description names it. Add no field, name, value or figure that no confirming description states, apart from what Sources allows.
  Sources: confirming signal descriptions. Matched query KI descriptions or resolved feature metadata may name the component or dependency path, described as observed context rather than a proven cause.
  ${NARRATIVE_AGREEMENT_RULE}
  Not here: any causal mechanism or inferred cascade, including because/so/propagates wording (symptom_hypothesis); severity or confidence reasoning (assessment_note); actions, urgency language, p_value or severity_score; how the evidence was collected. State the outcome, not the investigation: "No matching failure signature was observed", never "The verification returned no rows."
`;

export const ASSESSMENT_NOTE_ROLE_RULE = dedent`
  Reader: the operator deciding whether to trust the severity and confidence. This is judgement, not a recap. At most three short sentences.
  Sentence 1: what decided the tier: the operations or dependency paths it covers, by name, and the evidence that meets the tier's condition, with its scope (a share of log lines is not a share of the operation's attempts). For an inactive or recovering event, give the recovery, false-alarm, or benign-change rationale instead.
  Sentence 2: what would move it: the evidence a higher tier needs that the descriptions do not state (none for "critical"); anything left unverified, including a service or call target the knowledge base does not cover (unknown, not none).
  Sentence 3: the confidence as a percentage (the field times 100, with one decimal and a % sign: 0.45 is "45.0%"), the evidence that supports the score; name something missing, in plain words, only when a check of the confidence contract is not shown, and then the score is lowered for it. When the confidence is carried over from the stored event, say so instead.
  ${NARRATIVE_AGREEMENT_RULE}
  Not here: the observed failure or impact (summary), the mechanism (symptom_hypothesis), signal descriptions, investigation steps, or detection metadata.
`;

/**
 * How discovery applies the shared severity contract to what the confirming signal descriptions
 * state. It is attached to discovery's write tool only: the investigator keeps its own ladder.
 */
export const DISCOVERY_SEVERITY_APPLICATION_RULE = dedent`
  How discovery reads the confirming signal descriptions against this contract. For discovery, these requirements gate the contract's "high" and "critical" rungs: a rung matches only with this evidence. Weigh every cue the descriptions state, whichever way it points.
  - Outcome. A stated failed outcome is the operation stated to fail, be rejected or refused, time out or not complete. A caller's call to a named dependency or component that ended that way is the caller's operation failing. An operation that returns a result, even with less data than expected, completed: that is degradation, not a failed outcome. A cue that the failure was absorbed (caught, or retried or recovered successfully) leaves the outcome unstated; retries that ran out are a final failure. Demonstrated tolerance is what "low" needs.
  - "critical" needs its block or outage stated: no attempt of the operation stated completing, or the component stated unavailable or refusing every connection. Operations failing is not the same as operations blocked, and a count of services with failing lines is not an outage. The exposure condition is unchanged.
  - "high" needs one of two things:
    - a stated failed outcome, plus one of: the failing operation is a caller's call to a named dependency or component, unless the evidence shows it confined to a single burst (failing lines in one short period, with none before or after); a reach (defined below); a rate clearly above the operation's own normal, citing that normal;
    - a stated degradation (slow or incomplete results) with a reach.
    A reach is more than the limited reach "medium" covers, measured as a numerator and a denominator of the operation's own attempts (calls, jobs, messages, queries, requests) or of the parties whose attempts are stated failing or degraded (users, tenants, hosts, deployments), not of log lines or of the parties that emitted them.
    Otherwise, unless "critical" or "low" applies, the tier is at most "medium": a count or share of log lines is volume, and an unmeasured reach never raises the tier.
  - The rows outrank the knowledge base. An edge, an empty blast_radius or a knowledge gap never sets the tier by itself, apart from identifying a mandatory component for "critical".
`;

/** Shared narrative-field rule: never let evidence-derived text reproduce a raw sensitive value. */
export const NO_RAW_SENSITIVE_VALUES_RULE =
  'Never quote PII, PCI DSS data, SSNs, credentials, secrets, tokens, opaque identifiers, email addresses, or even truncated identifiers. Non-sensitive error types, message excerpts, endpoints, and aggregate counts are allowed when they identify the observed condition.';
