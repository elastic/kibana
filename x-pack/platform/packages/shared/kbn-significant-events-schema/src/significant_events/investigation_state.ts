/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_ID_LENGTH, MAX_TEXT_LENGTH, MAX_TITLE_LENGTH } from './constants';

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
 * A pointer from an investigation-trail node back to the concrete thing it is based on, so a
 * reader can always jump from the narrative to real data. Modelled as one flat object (rather
 * than a discriminated union) so the hand-synced JSON Schema twin in the workflow YAML stays
 * simple and LLM-friendly — which fields are meaningful depends on `type`:
 * - `query` — an ES|QL query the agent ran (`esql`, optionally scoped by `time_range`).
 *   Consumers can turn this into a Discover link.
 * - `ki` — a knowledge indicator the reasoning builds on (`name`, optionally `stream_name`).
 * - `rule` — a fired rule (`rule_name`, optionally `rule_uuid`).
 */
const investigationReferenceSchema = z.object({
  type: z.enum(['query', 'ki', 'rule']),
  /** Short human label for the reference chip, e.g. "error rate by service". */
  label: z.string().max(MAX_TITLE_LENGTH).optional(),
  /** The ES|QL query this node's finding is based on (`type: query`). */
  esql: z.string().max(MAX_TEXT_LENGTH).optional(),
  /** Time window the query was evaluated over (`type: query`), as ISO 8601 timestamps. */
  time_range: z
    .object({
      from: z.string().max(64),
      to: z.string().max(64),
    })
    .optional(),
  /** Name of the knowledge indicator (`type: ki`). */
  ki_name: z.string().max(MAX_TITLE_LENGTH).optional(),
  /** Stream the knowledge indicator belongs to (`type: ki`). */
  stream_name: z.string().max(MAX_ID_LENGTH).optional(),
  /** Name of the fired rule (`type: rule`). */
  rule_name: z.string().max(MAX_TITLE_LENGTH).optional(),
  rule_uuid: z.string().max(MAX_ID_LENGTH).optional(),
});
export type InvestigationReference = z.infer<typeof investigationReferenceSchema>;

/**
 * A small self-contained chart attached to an investigation-trail node. The agent already ran
 * the query, so it embeds a downsampled copy of the series — consumers render it directly
 * without re-querying (the paired `query` reference is the way back to the raw data).
 */
const investigationChartSchema = z.object({
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
  type: z.enum(['line', 'bar']),
  /** Unit of the y values, e.g. "ms", "errors/min". */
  unit: z.string().max(MAX_ID_LENGTH).optional(),
  series: z
    .array(
      z.object({
        name: z.string().max(MAX_TITLE_LENGTH).optional(),
        /** Downsampled data points; `x` is an ISO 8601 timestamp. */
        points: z
          .array(
            z.object({
              x: z.string().max(64),
              y: z.number(),
            })
          )
          .max(120),
      })
    )
    .max(5),
  /** Vertical markers for notable moments (ISO 8601 `x`), e.g. incident onset or a deploy. */
  annotations: z
    .array(
      z.object({
        x: z.string().max(64),
        label: z.string().max(MAX_TITLE_LENGTH),
      })
    )
    .max(10)
    .optional(),
});
export type InvestigationChart = z.infer<typeof investigationChartSchema>;

const investigationNodeKindSchema = z.enum([
  'observation',
  'hypothesis',
  'action',
  'evidence',
  'decision',
  'dead_end',
  'conclusion',
]);
export type InvestigationNodeKind = z.infer<typeof investigationNodeKindSchema>;

const investigationNodeStatusSchema = z.enum([
  'active',
  'done',
  'abandoned',
  'confirmed',
  'dismissed',
]);

/**
 * One node of the investigation trail — a free-form decision tree the agent appends to as it
 * works, so a reader can retrace HOW the conclusion was reached, including branches that led
 * nowhere. Nodes form a tree via `parent_id` (absent = root); array order within siblings is
 * chronological. A node should cite `references` for every claim grounded in data, and may
 * embed a `chart` when a timeseries materially supports it.
 */
const investigationTreeNodeSchema = z.object({
  /** Stable id unique within the tree, e.g. "n1", "n2". Never reused or renamed across snapshots. */
  id: z.string().max(MAX_ID_LENGTH),
  /** Id of the parent node; absent for root nodes. */
  parent_id: z.string().max(MAX_ID_LENGTH).optional(),
  kind: investigationNodeKindSchema,
  /** Short headline of the node, e.g. "Checked checkout-service error logs". */
  title: z.string().max(MAX_TITLE_LENGTH),
  /** Longer markdown elaboration: what was done, what was found, why it matters. */
  detail: z.string().max(MAX_TEXT_LENGTH).optional(),
  status: investigationNodeStatusSchema.optional(),
  references: z.array(investigationReferenceSchema).max(10).optional(),
  chart: investigationChartSchema.optional(),
});
export type InvestigationTreeNode = z.infer<typeof investigationTreeNodeSchema>;

const investigationHypothesisStatusSchema = z.enum(['investigating', 'dismissed', 'confirmed']);

const investigationHypothesisSchema = z.object({
  /** The candidate cause under consideration. */
  candidate: z.string().max(MAX_TEXT_LENGTH),
  /** Current confidence in this specific hypothesis. */
  confidence: z.number().min(0).max(1),
  status: investigationHypothesisStatusSchema,
  /** Why this hypothesis was dismissed/confirmed, or the current reasoning while investigating. */
  reason: z.string().max(MAX_TEXT_LENGTH).optional(),
});
export type InvestigationHypothesis = z.infer<typeof investigationHypothesisSchema>;

const mitigationLevelSchema = z.enum(['low', 'medium', 'high']);
export type MitigationLevel = z.infer<typeof mitigationLevelSchema>;

/**
 * A concrete proposal to run a curated mitigation workflow (a workflow tagged `mitigation`,
 * discovered via the find_mitigation_workflows tool). The agent only PROPOSES — whether the
 * workflow actually runs is decided downstream (auto-run gate in the investigation workflow,
 * or a human clicking "Run" in the UI). Flat object to keep the hand-synced JSON Schema twin
 * in the workflow YAML simple and LLM-friendly.
 */
const investigationMitigationProposalSchema = z.object({
  /** Id of the mitigation workflow, verbatim from the discovery tool result. */
  workflow_id: z.string().max(MAX_ID_LENGTH),
  workflow_name: z.string().max(MAX_TITLE_LENGTH).optional(),
  /** Concrete run inputs matching the workflow's manual-trigger inputs schema. */
  inputs: z.record(z.string(), z.any()).optional(),
  /** Why this workflow, with these inputs, addresses the root cause. */
  rationale: z.string().max(MAX_TEXT_LENGTH).optional(),
  /** How confident the agent is that this mitigation resolves the issue. */
  confidence: mitigationLevelSchema,
  /** Blast radius / destructiveness of running it. */
  risk: mitigationLevelSchema,
});
export type InvestigationMitigationProposal = z.infer<typeof investigationMitigationProposalSchema>;

/**
 * One recommended follow-up action. Every actionable recommendation gets a `description`;
 * a step additionally carries a `mitigation` proposal when it is backed by a discovered
 * mitigation workflow that could execute it.
 */
const investigationNextStepSchema = z.object({
  /** Short, concrete, actionable description of the step. */
  description: z.string().max(MAX_TEXT_LENGTH),
  mitigation: investigationMitigationProposalSchema.optional(),
});
export type InvestigationNextStep = z.infer<typeof investigationNextStepSchema>;

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
   * The final answer — the mechanism/root-cause narrative. Populated once a hypothesis is
   * `confirmed`; absent while still investigating.
   */
  conclusion: z.string().max(MAX_TEXT_LENGTH).optional(),
  /** Signals the agent wanted but could not access (e.g. missing instrumentation). */
  gaps_found: z.array(z.string().max(MAX_TEXT_LENGTH)).optional(),
  /**
   * The investigation trail: a decision tree of everything the agent did and decided, in the
   * order it happened — including abandoned branches. Optional for backward compatibility with
   * persisted results that predate it. Like the rest of the state, every snapshot carries the
   * FULL tree (nodes are appended/updated, never dropped between snapshots).
   */
  tree: z.array(investigationTreeNodeSchema).max(200).optional(),
  /**
   * Structured recommended next steps, populated alongside the conclusion. Steps backed by a
   * discovered mitigation workflow carry a concrete run proposal the auto-run gate (or a human)
   * can act on. Optional for backward compatibility with persisted results that predate it.
   */
  next_steps: z.array(investigationNextStepSchema).max(20).optional(),
});
export type InvestigationState = z.infer<typeof investigationStateSchema>;
