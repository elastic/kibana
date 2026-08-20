/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { severitySchema } from './common_schemas';
import { significantEventStatusSchema } from './events';
import {
  MAX_MEDIUM_STRING_LENGTH,
  MAX_SHORT_STRING_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_TIMESTAMP_LENGTH,
} from './constants';

/**
 * Name of the `tool_ui` custom event emitted by the investigation agent's progress-report
 * tool. Consumers follow the agent execution's event stream and filter for this event to
 * receive live, schema-typed updates while the investigation is still running. Every emission
 * carries the FULL current investigation state (never a delta) — see {@link investigationStateSchema}.
 */
export const INVESTIGATION_PROGRESS_UI_EVENT = 'investigation_progress' as const;

/**
 * Name of the step in `investigation_workflow.yaml` whose structured output holds the final
 * investigation state. Consumers reading the persisted result off a workflow execution look up
 * the step execution with this `stepId` — keep it in sync with the step name in the YAML.
 */
export const INVESTIGATE_STEP_ID = 'investigate' as const;

/**
 * A source file the agent read, recorded as parts rather than a URL so that consumers — not the
 * model — decide what is safe to link.
 *
 * `source` records how the code was reached, for provenance; it deliberately does NOT decide
 * whether a link can be built.
 */
const investigationEvidenceCodeSchema = z.object({
  /**
   * How this reference was obtained: `github_connector` for a GitHub connector, `code_search` for
   * Semantic Code Search. Model-reported, so treat it as advisory — it selects which URL shape a
   * consumer may build, never as proof of where the code lives.
   */
  source: z.enum(['github_connector', 'code_search']),
  /** Repository in `owner/name` form, e.g. `elastic/kibana`. */
  repo: z.string().max(MAX_SHORT_STRING_LENGTH),
  /** Repository-relative file path, e.g. `src/recommendationservice/recommendation_server.py`. */
  path: z.string().max(MAX_MEDIUM_STRING_LENGTH),
  /**
   * Hostname the code can be browsed on, taken from the origin of the URL the tool itself
   * returned — never inferred from `repo`. Absent when the tool reported no browsable location,
   * as Semantic Code Search does: it records a bare `owner/repo` with no remote.
   */
  host: z.string().max(MAX_SHORT_STRING_LENGTH).optional(),
  /**
   * Commit SHA the file was read at. GitHub resolves a branch name to a SHA in the URLs it
   * returns, so this is normally available without asking the model to look it up. Absent when the
   * tool reported no revision — in which case no link is built, because a branch-pinned link
   * drifts away from the code the investigation actually saw.
   */
  ref: z.string().max(MAX_SHORT_STRING_LENGTH).optional(),
});
export type InvestigationEvidenceCode = z.infer<typeof investigationEvidenceCodeSchema>;

/**
 * One observation supporting a claim the investigation makes, together with pointers back to the
 * concrete artefacts it rests on, so a reader can verify it instead of trusting it.
 *
 */
const investigationEvidenceSchema = z.object({
  /** What was observed and why it bears on the claim. Doubles as the label for its link. */
  description: z.string().max(MAX_TEXT_LENGTH),
  /** The exact ES|QL query executed to gather this evidence, when one was run. */
  esql_query: z.string().max(MAX_TEXT_LENGTH).optional(),
  /**
   * Absolute time window `esql_query` was evaluated over, as ISO 8601 timestamps. Required for
   * the query to be openable: the agent's queries embed absolute bounds in their WHERE clauses,
   * so handing Discover the query without its window would apply Discover's own default range on
   * top and land the reader on zero rows. Without it, consumers show the query but do not link it.
   */
  time_range: z
    .object({
      from: z.string().max(MAX_TIMESTAMP_LENGTH),
      to: z.string().max(MAX_TIMESTAMP_LENGTH),
    })
    .optional(),
  /** The source file backing this evidence, when the agent read code. */
  code: investigationEvidenceCodeSchema.optional(),
});
export type InvestigationEvidence = z.infer<typeof investigationEvidenceSchema>;

/** Max evidence entries per hypothesis. Keep in sync with the YAML maxItems. */
export const MAX_HYPOTHESIS_EVIDENCE = 3;

const investigationHypothesisStatusSchema = z.enum(['investigating', 'dismissed', 'confirmed']);

const investigationHypothesisSchema = z.object({
  /** The candidate cause under consideration. */
  candidate: z.string().max(MAX_TEXT_LENGTH),
  /** Current confidence in this specific hypothesis. */
  confidence: z.number().min(0).max(1),
  status: investigationHypothesisStatusSchema,
  /** Why this hypothesis was dismissed/confirmed, or the current reasoning while investigating. */
  reason: z.string().max(MAX_TEXT_LENGTH).optional(),
  /**
   * What the verdict rests on.
   */
  evidence: z.array(investigationEvidenceSchema).max(MAX_HYPOTHESIS_EVIDENCE).optional(),
});
export type InvestigationHypothesis = z.infer<typeof investigationHypothesisSchema>;

/** Max recommendation entries an investigation can emit. Keep in sync with the YAML maxItems. */
export const MAX_RECOMMENDATIONS = 5;

/**
 * One concrete, actionable step to resolve or mitigate the issue — a command, config change, or
 * code fix, rather than general advice like "investigate further". Structured so consumers can
 * render a "Try next" list without parsing prose for headings and bullets.
 */
const investigationRecommendationSchema = z.object({
  /** The action itself, stated concretely (e.g. "Revert the pool-size config change"). */
  title: z.string().max(MAX_MEDIUM_STRING_LENGTH),
  /** Why this step helps, or detail needed to carry it out, when the title alone isn't enough. */
  description: z.string().max(MAX_TEXT_LENGTH).optional(),
  /** A command, config snippet, or code change backing this step, when one applies. Raw source,
   * not a fenced markdown block — consumers decide how to render it. */
  code: z.string().max(MAX_TEXT_LENGTH).optional(),
});
export type InvestigationRecommendation = z.infer<typeof investigationRecommendationSchema>;

/** Max blind spot entries an investigation can emit. Keep in sync with the YAML maxItems. */
export const MAX_BLIND_SPOTS = 10;

/**
 * A signal the agent wanted but could not access (e.g. missing instrumentation) — an actionable
 * knowledge gap, not an incident-specific fact. Structured so consumers don't have to split a
 * "title · description" sentence themselves.
 */
const investigationBlindSpotSchema = z.object({
  /** The missing data source or access, named concisely (e.g. "No traces for the cart service"). */
  title: z.string().max(MAX_MEDIUM_STRING_LENGTH),
  /** Why this gap mattered to the investigation. */
  description: z.string().max(MAX_TEXT_LENGTH),
});
export type InvestigationBlindSpot = z.infer<typeof investigationBlindSpotSchema>;

/** Max evidence entries per event-update proposal. Keep in sync with the YAML maxItems. */
export const MAX_SIGNIFICANT_EVENT_UPDATE_EVIDENCE = 10;

/** Max number of field-change proposals an investigation can emit. Keep in sync with the YAML. */
export const MAX_SIGNIFICANT_EVENT_UPDATES = 3;

/**
 * Shared base fields for every event-update branch. Spread directly into each `z.object` call
 * (never `.extend` a shared base) so `z.toJSONSchema` emits standalone objects without `allOf`
 * wrapping — the workflow `JsonModelShapeSchema` does not allow `allOf`.
 */
const significantEventUpdateBase = {
  /** Why this field should change, referencing the confirmed findings (1–2 sentences). */
  reason: z.string().max(MAX_TEXT_LENGTH),
  evidence: z.array(investigationEvidenceSchema).min(1).max(MAX_SIGNIFICANT_EVENT_UPDATE_EVIDENCE),
};

/**
 * One proposed change to a significant event field, produced by the investigation agent.
 * The `field` discriminator identifies which event attribute is being changed; `from`/`to` are
 * typed per field (enum for severity/status, free text for summary).
 *
 * Each entry is self-contained: `from` records what the value was before this investigation ran
 * (populated from `inputs.context`), so the UI never needs to thread prior state from elsewhere.
 *
 * Applied deterministically by the `attach_to_significant_event` step in `investigation_workflow.yaml`
 * (in the same append-only version that records the completed investigation); `reason`/`evidence`
 * persist only here (the workflow execution's structured output), never on the event document — the
 * event version records only the changed field values plus the workflow execution id.
 */
export const significantEventUpdateSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal('severity'),
    from: severitySchema,
    to: severitySchema,
    ...significantEventUpdateBase,
  }),
  z.object({
    field: z.literal('summary'),
    from: z.string().max(MAX_TEXT_LENGTH),
    to: z.string().min(1).max(MAX_TEXT_LENGTH),
    ...significantEventUpdateBase,
  }),
  z.object({
    field: z.literal('status'),
    from: significantEventStatusSchema,
    to: significantEventStatusSchema,
    ...significantEventUpdateBase,
  }),
]);
export type SignificantEventUpdate = z.infer<typeof significantEventUpdateSchema>;

/**
 * Full state of an investigation at a point in time. This is the ONE schema shared by:
 * - every `investigation_progress` `tool_ui` event emitted while the investigation runs (always
 *   the complete current state, never a delta — so the latest event alone is enough to render), and
 * - the `investigate` step's final structured output in `investigation_workflow.yaml` (kept in
 *   sync with this schema by hand — cross-reference the comment there).
 *
 * Because both paths share this shape, a consumer renders identically whether it's following the
 * live stream or reading the persisted final result.
 */
export const investigationStateSchema = z.object({
  /** Current ("what's happening now") or final narrative summary of the investigation. */
  summary: z.string().max(MAX_TEXT_LENGTH),
  hypotheses: z.array(investigationHypothesisSchema).max(50),
  /**
   * The final answer — the mechanism/root-cause narrative, as plain prose (no markdown headings
   * or bullet lists). Populated once a hypothesis is `confirmed`; absent while still
   * investigating. Actionable steps belong in `recommendations`, not here.
   */
  conclusion: z.string().max(MAX_TEXT_LENGTH).optional(),
  /** Concrete, actionable steps to resolve or mitigate the issue. */
  recommendations: z.array(investigationRecommendationSchema).max(MAX_RECOMMENDATIONS).optional(),
  /**
   * Actionable knowledge gaps discovered during the investigation. Replaces the free-text
   * `gaps_found` string array; investigations persisted before this field existed are read back
   * without any blind spots, since this schema strips the keys it no longer declares. That loss is
   * accepted rather than migrated — the gaps are also folded into the memory `_gaps/overview` page
   * by the workflow's `merge_investigation_gaps` step, so they survive outside this payload.
   */
  blind_spots: z.array(investigationBlindSpotSchema).max(MAX_BLIND_SPOTS).optional(),
  /**
   * Optional list of field-change proposals produced by the investigation. Each entry names
   * the event field being changed (`severity`, `summary`, or `status`) along with the old and
   * new values, a one-or-two-sentence reason tied to the confirmed findings, and the evidence
   * backing the change. Omit the array (or omit a field's entry) when no change is warranted
   * for that field. Applied automatically by the `attach_to_significant_event` step, in the same
   * event version that records the completed investigation.
   */
  significant_event_updates: z
    .array(significantEventUpdateSchema)
    .max(MAX_SIGNIFICANT_EVENT_UPDATES)
    .optional(),
});
export type InvestigationState = z.infer<typeof investigationStateSchema>;
