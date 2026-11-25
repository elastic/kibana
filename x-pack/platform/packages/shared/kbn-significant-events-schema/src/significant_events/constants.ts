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
 * refers to the field descriptions and never embeds these strings. Bounded by sentences (short paragraphs for the summary), not characters.
 */
export const SYMPTOM_HYPOTHESIS_ROLE_RULE = dedent`
  Reader: the on-call engineer deciding where to look first. This is the most likely explanation the evidence supports, held as a hypothesis: why the failure is happening, what in the signals points to that reason, and what would confirm or rule it out.
  At most three sentences. Sentence 1: the most likely reason the dominant failure happens, in plain terms, and what in the signals points to it: the component, dependency or condition the rows implicate and the failure signature it shows. Commit to the best-supported candidate even when the evidence is thin: a hypothesis is a proposal to test, and what is not established belongs in the assessment_note. Sentence 2: what would confirm or rule it out and, when the confirming descriptions name several distinct targets or paths, how they relate (a component they share or independent failures), in the order they began when the descriptions give each one's own onset. Sentence 3, only when the descriptions state how the failure ended: that outcome, as stated. For an event grouping several detections, the sentences name the earliest abnormal rule and how the others follow along grounded edges.
  Sources: confirming signal descriptions first; causal_features and matched KI context support the reason; blast_radius only explains evidenced propagation. Name a service, dependency, or causal link only when a confirming row or a topology edge with that source and target shows it. Rows outrank topology.
  Other populations take a clause, named by what they report. A sampled row illustrates the failure; it names the failing component or dependency only when the measured rows or a topology edge show it as the failing path. When the failure spans several services and no dependency chain is shown, the candidate is the most affected of them.
  ${NARRATIVE_AGREEMENT_RULE}
  When verification is healthy, empty, or off-topic, state that no failure is confirmed; do not infer traffic, throughput, instability, or another reason from the detection alone.
`;

export const SUMMARY_ROLE_RULE = dedent`
  Reader: the on-call engineer meeting the event for the first time. This is the conclusion: what is happening, to which components or operations, how big it is, since when, and what the signals add up to. The signal descriptions hold the detail: give what a reader needs to understand the problem, not every figure.
  Shape: short paragraphs in plain prose, one per part that has content, a blank line between them. Write for a reader who has not seen the rows: row-level fields, the breakdown and unmeasured figures stay in the signal descriptions. Say populations that behave alike once; mention a minority when its failure differs from the main one. When most matched lines read as routine (a successful or healthy result), say so first and describe the failing lines as the minority they are, with their size: the reader judges the event by what most lines say.
  1. Part 1, what is happening: the observed failure by its signature, as the error or code with the level or status the lines carry, or as the measured value against its limit when the failure is a measurement (what the signal descriptions state, without per-row identifiers or values); the operation and where it occurs; every distinct component, target or path the confirming signal descriptions name; and how it ended. Then the impact: state it when a signal description states it (confirmed when it states the operation failing to complete); otherwise say what evidence of impact is missing, because an impact the signals do not state is a guess a reader may act on. Then how big it is, as one figure: the magnitude when a signal description measures it (its P% with the scope it names, for example log lines and not attempts; a category or breakdown share is not the magnitude), otherwise the headline count. The counts per signal stay in the signal descriptions. With no failure signature, the observed success, health or off-topic signature, with the anomaly identified as an unconfirmed rate or volume observation.
  2. Part 2, how the problems connect: in the order they began when the signal descriptions give each one's onset, which component reports which problem, against what, and how one leads to the next, each link as far as a signal description or the topology supports it. Name each problem by what it reports, and give a share only when it shows which problem dominates. Name each open point once, as specifically as the evidence allows (what the signals would have to show), and only where it changes what the reader should believe or do; say nothing about what the signals are not expected to cover. A single problem has no relation to state.
  3. Part 3, since when: for a new event, when it was first seen and how long it had lasted when the event was raised. The summary is kept across continuations, so it carries no closing or last-shown time: that would go stale while the failure continues, and the signal descriptions hold the latest times.
  Rules for all three parts:
  - Time: give every time as a date and a UTC time (for example 03-07 09:41 UTC); the event is read later, so a relative word such as "today" or "last hour" would mislead.
  - Counts: write counts of 1,000 or more in compact form with one decimal (2.5k, 48.1k, 1.4M) and smaller counts exactly, as the signal descriptions do, and leave out values too small to change the story.
  - Names: copy names as the signal descriptions write them: field names, \`field = value\` pairs and service or entity names in backticks, no other text in backticks. Name a breakdown's field only when a signal description does. Use only the fields, names, values and figures the confirming signal descriptions state, apart from what Sources allows.
  - Sources: confirming signal descriptions. Matched query KI descriptions or resolved feature metadata may name the component or dependency path, as observed context rather than a proven cause.
  ${NARRATIVE_AGREEMENT_RULE}
`;

export const ASSESSMENT_NOTE_ROLE_RULE = dedent`
  Reader: the operator deciding whether to trust the severity and confidence. This is judgement, not a recap: write it for this event, not from the tier's generic conditions. At most three short sentences.
  Sentence 1: the tier, then a colon, then what decided it: the operations or dependency paths it covers, by name, and the evidence that meets the tier's condition, with its scope (a share of log lines is not a share of the operation's attempts). On a continuation that evidence is the event's whole confirming evidence, the stored signals together with this cycle's, and the sentence says what this cycle added. For an inactive or recovering event, give the recovery, false-alarm, or benign-change rationale instead.
  Sentence 2: what would move it: the evidence a higher tier needs that the descriptions do not state (none for "critical"); anything left unverified, including a service or call target the knowledge base does not cover (unknown, not none).
  Sentence 3: "Confidence is" and the confidence as a percentage (the field times 100, with one decimal and a % sign: 0.45 is "45.0%"), the evidence that supports the score; name something missing, in plain words, only when a check of the confidence contract is not shown, and then the score is lowered for it. When the confidence is carried over from the stored event, say so instead.
  ${NARRATIVE_AGREEMENT_RULE}
`;

/**
 * How discovery applies the shared severity contract to what the confirming signal descriptions
 * state. It is attached to discovery's write tool only: the investigator keeps its own ladder.
 */
export const DISCOVERY_SEVERITY_APPLICATION_RULE = dedent`
  How discovery reads the confirming signal descriptions against this contract. For discovery, these requirements gate the contract's "high" and "critical" rungs: a rung matches only with this evidence. Weigh every cue the descriptions state, whichever way it points.
  - Outcome. A stated failed outcome is the operation stated to fail, be rejected or refused, time out or not complete. A caller's call to a named dependency or component that ended that way is the caller's operation failing. An operation that returns a result, even with less data than expected, completed: that is degradation, not a failed outcome. An error line reporting such a call states that outcome; only a cue that the failure was absorbed (caught, or retried or recovered successfully) leaves it unstated, and retries that ran out are a final failure. Demonstrated tolerance is what "low" needs.
  - "critical" needs its block or outage stated: no attempt of the operation stated completing, or the component stated unavailable or refusing every connection. An outage is the component's primary function stated unavailable; some operations refused, or several services with failing lines, report failures, not an outage. The exposure condition is unchanged.
  - "high" needs one of two things:
    - a stated failed outcome, plus any one of:
      - a reach (defined below);
      - failing lines per hour that rose well above the earlier hours' counts, as the signal descriptions state them (earlier hours may have none, and a partial current hour that already has failing lines counts, because it only grows), which marks a failure that is new or growing; a single burst that has ended (failing lines in one short period, quiet before and after) does not;
      - a rate clearly above the operation's own normal, citing that normal;
    - a stated degradation (slow or incomplete results) with a reach.
    A reach is more than the limited reach "medium" covers, measured as a numerator and a denominator of the operation's own attempts (calls, jobs, messages, queries, requests) or of the parties whose attempts are stated failing or degraded (users, tenants, hosts, deployments), not of log lines or of the parties that emitted them.
    Otherwise, unless "critical" or "low" applies, the tier is at most "medium": a count or share of failing lines is volume, and an unmeasured reach never raises the tier.
  - The rows outrank the knowledge base. An edge, an empty blast_radius or a knowledge gap never sets the tier by itself, apart from identifying a mandatory component for "critical".
`;

/** Shared narrative-field rule: never let evidence-derived text reproduce a raw sensitive value. */
export const NO_RAW_SENSITIVE_VALUES_RULE =
  'Never quote PII, PCI DSS data, SSNs, credentials, secrets, tokens, opaque identifiers, email addresses, or even truncated identifiers. Non-sensitive error types, message excerpts, endpoints, and aggregate counts are allowed when they identify the observed condition.';
