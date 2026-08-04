/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Ajv from 'ajv';
import { parse } from 'yaml';
import { z } from '@kbn/zod/v4';
import {
  getManagedWorkflowDefinition,
  SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  INVESTIGATE_STEP_ID,
  investigationStateSchema,
  MAX_HYPOTHESIS_EVIDENCE,
} from './investigation_state';

interface ParsedInvestigationWorkflow {
  steps: Array<{ name: string; with?: { schema?: object } }>;
}

/**
 * Strips keys that intentionally differ between the hand-authored YAML schema and
 * `z.toJSONSchema(investigationStateSchema)`:
 * - `$schema` — only emitted by the zod conversion;
 * - `description` — the YAML carries prompt-facing descriptions the zod schema doesn't;
 * - `additionalProperties` — zod emits `false` (it strips unknown keys), while the YAML leaves
 *   it open so the LLM's structured output isn't rejected over stray keys.
 * Everything else — properties, types, required lists, enums, and min/max constraints — must
 * match exactly.
 */
const normalizeSchema = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeSchema);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !['$schema', 'description', 'additionalProperties'].includes(key))
        .map(([key, entry]) => [key, normalizeSchema(entry)])
    );
  }
  return value;
};

/**
 * The `investigate` step's structured-output schema is hand-authored JSON Schema in
 * `investigation_workflow.yaml` (the YAML asset can't import code), and must be kept in sync
 * by hand with `investigationStateSchema` — that's the schema the investigation agent's
 * progress-report tool streams live AND the schema the UI uses to parse the persisted final
 * result, so the structured output must match exactly for the UI to render it. These tests
 * catch drift structurally (via z.toJSONSchema equality) and behaviorally (the same example
 * payloads validate identically against both).
 *
 * This lives here — importing the workflow definition from `@kbn/workflows/managed` — rather
 * than as a test in `@kbn/workflows` importing this schema, because `@kbn/workflows` is
 * dual/triple-licensed (Elastic License 2.0 OR AGPL-3.0-only OR SSPL-1.0) and cannot depend on
 * this Elastic-License-2.0-only package. This package depending on `@kbn/workflows` (available
 * under Elastic License 2.0, among others) is licensing-legal in the other direction.
 */
describe('investigation_workflow.yaml structured-output schema stays in sync with investigationStateSchema', () => {
  const workflowDefinition = getManagedWorkflowDefinition(
    SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID
  );

  if (!workflowDefinition?.yaml) {
    throw new Error(
      `Could not find a static \`yaml\` definition for managed workflow id "${SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID}"`
    );
  }

  const parsedYaml = parse(workflowDefinition.yaml) as ParsedInvestigationWorkflow;
  const investigateStep = parsedYaml.steps.find((step) => step.name === INVESTIGATE_STEP_ID);
  const jsonSchema = investigateStep?.with?.schema;

  if (!jsonSchema) {
    throw new Error(
      `Could not find a \`schema\` on the \`${INVESTIGATE_STEP_ID}\` step in investigation_workflow.yaml`
    );
  }

  const ajv = new Ajv();
  const validate = ajv.compile(jsonSchema);

  it('matches z.toJSONSchema(investigationStateSchema) structurally', () => {
    expect(normalizeSchema(jsonSchema)).toEqual(
      normalizeSchema(z.toJSONSchema(investigationStateSchema))
    );
  });

  const severityUpdate = {
    field: 'severity' as const,
    from: '40-medium' as const,
    to: '80-critical' as const,
    reason: 'Checkout is fully blocked for every user, not intermittently degraded as triaged.',
    evidence: [
      {
        description: 'Zero successful checkout completions during the incident window.',
        esql_query:
          'FROM traces | WHERE service.name == "checkout" | STATS failures = COUNT(*) WHERE event.outcome == "failure"',
      },
      { description: 'All checkout pods in CrashLoopBackOff for the full window.' },
    ],
  };

  const statusUpdate = {
    field: 'status' as const,
    from: 'open' as const,
    to: 'dismissed' as const,
    reason: 'The investigation found no evidence of an actual failure — this is a false alarm.',
    evidence: [{ description: 'All metrics remained within normal bounds throughout the window.' }],
  };

  const summaryUpdate = {
    field: 'summary' as const,
    from: 'Potential latency spike on the checkout service.',
    to: 'Latency on the checkout service remained within SLA bounds — the triage summary overstated impact.',
    reason:
      'P99 latency never exceeded 200ms and error rates stayed below 0.1% throughout the incident window.',
    evidence: [
      {
        description: 'P99 latency stayed below 200ms throughout.',
        esql_query:
          'FROM traces | WHERE service.name == "checkout" | STATS p99 = PERCENTILE(duration, 99)',
      },
    ],
  };

  const validPayload = {
    summary: 'A deploy at 14:02 introduced a connection leak in the checkout service.',
    hypotheses: [
      {
        candidate: 'Disk saturation',
        confidence: 0.05,
        status: 'dismissed',
        reason: 'IOPS stayed flat.',
      },
      {
        candidate: 'Connection pool exhaustion after the 14:02 deploy',
        confidence: 0.9,
        status: 'confirmed',
        reason: 'Pool metrics spiked exactly at deploy time.',
      },
    ],
    conclusion: 'Connection pool exhaustion caused by the 14:02 deploy.',
    gaps_found: ['No profiling data available'],
    significant_event_updates: [severityUpdate],
  };

  it('accepts a valid payload under both the YAML JSON Schema and the zod schema', () => {
    expect(validate(validPayload)).toBe(true);
    expect(investigationStateSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts all three event_update field types (severity, status, summary) under both schemas', () => {
    const allFields = {
      ...validPayload,
      significant_event_updates: [severityUpdate, statusUpdate, summaryUpdate],
    };

    expect(validate(allFields)).toBe(true);
    expect(investigationStateSchema.safeParse(allFields).success).toBe(true);
  });

  it('accepts a minimal payload (empty hypotheses, no optional fields) under both schemas', () => {
    const minimalPayload = { summary: 'Just started.', hypotheses: [] };

    expect(validate(minimalPayload)).toBe(true);
    expect(investigationStateSchema.safeParse(minimalPayload).success).toBe(true);
  });

  it('rejects a payload missing a required top-level field under both schemas', () => {
    const { summary, ...missingSummary } = validPayload;

    expect(validate(missingSummary)).toBe(false);
    expect(investigationStateSchema.safeParse(missingSummary).success).toBe(false);
  });

  it('rejects a hypothesis missing a required field under both schemas', () => {
    const invalidHypothesis = {
      summary: 'ok',
      hypotheses: [{ candidate: 'X', status: 'investigating' }], // missing confidence
    };

    expect(validate(invalidHypothesis)).toBe(false);
    expect(investigationStateSchema.safeParse(invalidHypothesis).success).toBe(false);
  });

  it('accepts hypothesis evidence carrying a query and its window under both schemas', () => {
    const withEvidence = {
      summary: 'ok',
      hypotheses: [
        {
          candidate: 'Connection pool exhaustion after the 14:02 deploy',
          confidence: 0.9,
          status: 'confirmed',
          reason: 'Pool metrics spiked exactly at deploy time.',
          evidence: [
            {
              description: 'Pool utilization saturates at 14:02.',
              esql_query: 'FROM metrics-* | STATS max = MAX(pool.utilization)',
              time_range: { from: '2026-07-28T13:30:00Z', to: '2026-07-28T15:00:00Z' },
            },
          ],
        },
      ],
    };

    expect(validate(withEvidence)).toBe(true);
    expect(investigationStateSchema.safeParse(withEvidence).success).toBe(true);
  });

  it('accepts evidence that is an observation with no query under both schemas', () => {
    const observationOnly = {
      summary: 'ok',
      hypotheses: [
        {
          candidate: 'Missing null check',
          confidence: 0.8,
          status: 'confirmed',
          evidence: [{ description: 'All checkout pods were in CrashLoopBackOff.' }],
        },
      ],
    };

    expect(validate(observationOnly)).toBe(true);
    expect(investigationStateSchema.safeParse(observationOnly).success).toBe(true);
  });

  it('rejects hypothesis evidence exceeding MAX_HYPOTHESIS_EVIDENCE under both schemas', () => {
    const tooMuchEvidence = {
      summary: 'ok',
      hypotheses: [
        {
          candidate: 'X',
          confidence: 0.5,
          status: 'investigating',
          evidence: Array.from({ length: MAX_HYPOTHESIS_EVIDENCE + 1 }, (_, index) => ({
            description: `Observation ${index}`,
          })),
        },
      ],
    };

    expect(validate(tooMuchEvidence)).toBe(false);
    expect(investigationStateSchema.safeParse(tooMuchEvidence).success).toBe(false);
  });

  it('rejects evidence with a half-specified time range under both schemas', () => {
    const missingTo = {
      summary: 'ok',
      hypotheses: [
        {
          candidate: 'X',
          confidence: 0.5,
          status: 'investigating',
          evidence: [
            {
              description: 'Ran a query.',
              esql_query: 'FROM logs-* | LIMIT 1',
              time_range: { from: '2026-07-28T13:30:00Z' },
            },
          ],
        },
      ],
    };

    expect(validate(missingTo)).toBe(false);
    expect(investigationStateSchema.safeParse(missingTo).success).toBe(false);
  });

  it('rejects an invalid hypothesis status under both schemas', () => {
    const invalidStatus = {
      summary: 'ok',
      hypotheses: [{ candidate: 'X', confidence: 0.5, status: 'unknown' }],
    };

    expect(validate(invalidStatus)).toBe(false);
    expect(investigationStateSchema.safeParse(invalidStatus).success).toBe(false);
  });

  it('rejects an over-length conclusion under both schemas', () => {
    const oversized = { ...validPayload, conclusion: 'x'.repeat(10_001) };

    expect(validate(oversized)).toBe(false);
    expect(investigationStateSchema.safeParse(oversized).success).toBe(false);
  });

  it('rejects an event_update with an unknown field under both schemas', () => {
    const unknownField = {
      ...validPayload,
      significant_event_updates: [
        {
          field: 'confidence',
          from: '0.5',
          to: '0.8',
          reason: 'better',
          evidence: [{ description: 'x' }],
        },
      ],
    };

    expect(validate(unknownField)).toBe(false);
    expect(investigationStateSchema.safeParse(unknownField).success).toBe(false);
  });

  it('rejects a severity event_update with an invalid enum value under both schemas', () => {
    const invalidSeverity = {
      ...validPayload,
      significant_event_updates: [{ ...severityUpdate, to: '90-mega' }],
    };

    expect(validate(invalidSeverity)).toBe(false);
    expect(investigationStateSchema.safeParse(invalidSeverity).success).toBe(false);
  });

  it('rejects a status event_update with an invalid enum value under both schemas', () => {
    const invalidStatus = {
      ...validPayload,
      significant_event_updates: [{ ...statusUpdate, to: 'unknown' }],
    };

    expect(validate(invalidStatus)).toBe(false);
    expect(investigationStateSchema.safeParse(invalidStatus).success).toBe(false);
  });

  it('rejects an event_update missing a required field (reason) under both schemas', () => {
    const { reason, ...withoutReason } = severityUpdate;
    const missingReason = { ...validPayload, significant_event_updates: [withoutReason] };

    expect(validate(missingReason)).toBe(false);
    expect(investigationStateSchema.safeParse(missingReason).success).toBe(false);
  });

  it('rejects an event_update with empty evidence under both schemas', () => {
    const emptyEvidence = {
      ...validPayload,
      significant_event_updates: [{ ...severityUpdate, evidence: [] }],
    };

    expect(validate(emptyEvidence)).toBe(false);
    expect(investigationStateSchema.safeParse(emptyEvidence).success).toBe(false);
  });

  it('rejects a summary event_update with an empty `to` under both schemas', () => {
    const emptySummary = {
      ...validPayload,
      significant_event_updates: [{ ...summaryUpdate, to: '' }],
    };

    expect(validate(emptySummary)).toBe(false);
    expect(investigationStateSchema.safeParse(emptySummary).success).toBe(false);
  });

  it('rejects a significant_event_updates array exceeding MAX_SIGNIFICANT_EVENT_UPDATES under both schemas', () => {
    const tooMany = {
      ...validPayload,
      significant_event_updates: [severityUpdate, statusUpdate, summaryUpdate, severityUpdate],
    };

    expect(validate(tooMany)).toBe(false);
    expect(investigationStateSchema.safeParse(tooMany).success).toBe(false);
  });
});
