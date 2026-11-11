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
  Cover the whole symptom the confirming descriptions measure: every service or path the failing rows reach, not one sampled row. A sampled row illustrates the failure; it names the failing component or dependency only when the measured rows or a topology edge show it as the failing path. When the failure spans several services and no dependency chain is shown, say it spans them and that no common cause is established.
  Explain only as far as the evidence supports: name no cause beyond a failing component or dependency the rows or a topology edge show. When the cause beyond that is not established, say so in at most one clause; longer unknowns and disclaimers belong in the assessment_note.
  Not here: the observed failures and their share (summary); severity or confidence reasoning (assessment_note).
  ${NARRATIVE_AGREEMENT_RULE}
  When verification is healthy, empty, or off-topic, state that no failure mechanism is confirmed; do not infer traffic, throughput, instability, or another mechanism from the detection alone.
`;

export const SUMMARY_ROLE_RULE = dedent`
  Reader: the operator scanning the event list. This is what was observed and how far it reaches, not why. At most three sentences.
  Sentence 1: the observed failure — the normalized error signature (error type or code, operation, protocol, endpoint, port, and non-sensitive address when relevant), every distinct component, target or path the confirming descriptions name, and what they state about how the failure ended. When no failure signature is observed, state the observed success, health, or off-topic signature instead and identify the anomaly as an unconfirmed rate or volume observation.
  Sentences 2–3: whether impact is confirmed, possible, or not established (confirmed only when a description states the operation failing to complete; possible impact is conditional and scoped); onset, how long it has lasted, and current or recovery state; magnitude only when measured, copied as the percentage P% of the "N of M (P%)" figure, as the signal descriptions state it, with the scope they name (for example log lines); the shares of message categories and of breakdown groups are not the magnitude, never with the N of M counts, never recomputed over a filtered subset, and never presented as a share of attempts when it is a share of log lines. When a signal description gives a count with no measured total, there is no percentage to copy: state that count as it is, with its scope.
  Copy names and figures as the signal descriptions write them: field names, \`field = value\` pairs and service or entity names stay in backticks, and no other text is in backticks. Name the field of a breakdown only when a description names it. Add no field, name, value or figure that no confirming description states.
  Sources: confirming signal descriptions. Matched query KI descriptions or resolved feature metadata may name the component or dependency path, described as observed context rather than a proven cause.
  ${NARRATIVE_AGREEMENT_RULE}
  Not here: any causal mechanism or inferred cascade, including because/so/propagates wording (symptom_hypothesis); severity or confidence reasoning (assessment_note); actions, urgency language, p_value or severity_score; how the evidence was collected. State the outcome, not the investigation: "No matching failure signature was observed", never "The verification returned no rows."
`;

export const ASSESSMENT_NOTE_ROLE_RULE = dedent`
  Reader: the operator deciding whether to trust the severity and confidence. This is judgement, not a recap. At most three short sentences.
  Sentence 1: the severity rung that decided the tier, the measured figures that put it there with their scope (a share of log lines is not a share of requests), what the descriptions state about whether the affected operation completes (or that they state none), the other cues they state that bore on the tier whichever way they point (reading every signal, not the strongest), and the blast_radius for how far the paths reach. For medium, name the missing outcome or reach; for low, whether it recovered or was never an issue; for an inactive or recovering event, give the recovery, false-alarm, or benign-change rationale instead. Name the operations and dependency paths the tier covers rather than restating the log row: "<named operations or paths>; <measured breadth> meets the <tier> condition".
  Sentence 2: what was ruled out or left unverified. For an adjacent tier you rejected, name the operations, paths or cues you weighed and why they fall short. A count or share that could not be measured is a caveat here. A service or call target the descriptions state that the knowledge base does not cover is a knowledge gap: record it as unverified, saying "none found in the knowledge base" (never "no dependency edges"), because a knowledge gap or an empty blast_radius means unknown.
  Sentence 3: why this confidence, as a percentage: the confidence field times 100, with one decimal and a % sign (confidence 0.5 is "50.0%", 0.45 is "45.0%"), naming the part that limits it, the symptom support or the tier support, and the evidence behind that part; when the confidence is carried over from the stored event, say so instead.
  ${NARRATIVE_AGREEMENT_RULE}
  Not here: the observed failure or impact (summary), the mechanism (symptom_hypothesis), signal descriptions, investigation steps, or detection metadata.
`;

/**
 * How discovery applies the shared severity contract to what the confirming signal descriptions
 * state. It is attached to discovery's write tool only: the investigator keeps its own ladder.
 */
export const DISCOVERY_SEVERITY_APPLICATION_RULE = dedent`
  How discovery applies this contract to what the confirming signal descriptions state. An error line shows a failure mode, not impact: a tier needs the evidence below. When the evidence for a higher tier is missing, rate the lower tier and say in the assessment_note which of outcome or reach is missing.
  Work through these in order:
  1. Weigh every cue the descriptions state about the outcome and the conditions, whichever way it points. A cue that the failure was contained (caught, retried, absorbed or recovered by the system) points to limited reach and unresolved completion and moves "high" toward "medium" unless a description also states the operation failing to complete; demonstrated tolerance is what "low" needs. A cue that the failure is spreading or blocking moves the rating the other way.
  2. "critical" is checked first and stops the walk when it matches: it needs one of the contract's critical conditions stated by the descriptions (a global outage, several core operations blocked, a mandatory component blocked end-to-end, confirmed exposure); no share is needed. The blast_radius only identifies a component as mandatory: the descriptions must still state the block.
  3. Outcome. Unless a containment cue applies, an error, rejection, refusal, timeout or other expiry a description reports for the operation is a stated failed outcome. "Slow" means the operation completes with added latency; a timeout is not slow. Partial results (a response missing part of its expected data) are not a stated failure: they rate "medium" unless the descriptions state the operation failing or a request-level share of partial or failed results. When no outcome is stated, completion is unresolved and the tie-break gives the lower adjacent tier.
  4. Reach and strength. "high" needs a stated failed outcome, the failure still happening, and one of: a reach, a numerator and denominator in operations, attempts, requests or users; a rate clearly above the operation's own normal for the same period, citing its prior-period figure (a rate unchanged for days is the normal); or a dependent's own operation stated failing because of a named dependency or component (a service logging that its own operation failed because a named dependency failed; "all dependencies failed" names none). A share or count of log lines measures volume, not how many attempts or users are affected: alone, with an error line alone, or as error volume across several services without one of the above, it rates "medium". A count with no measured total is volume. An unmeasured reach never raises the tier.
  5. Rows and the knowledge base. The rows outrank the knowledge base. A row showing a dependency failing together with a knowledge-base edge for it is the strongest case; a dependent logging the failing call counts even when no edge or entity exists (that name is a knowledge gap); an edge no failing row shows is context only. An edge, an empty blast_radius or a knowledge gap never raises or lowers the tier by itself, apart from identifying a mandatory component in step 2.
`;

/** Shared narrative-field rule: never let evidence-derived text reproduce a raw sensitive value. */
export const NO_RAW_SENSITIVE_VALUES_RULE =
  'Never quote PII, PCI DSS data, SSNs, credentials, secrets, tokens, opaque identifiers, email addresses, or even truncated identifiers. Non-sensitive error types, message excerpts, endpoints, and aggregate counts are allowed when they identify the observed condition.';
