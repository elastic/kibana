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
import { INVESTIGATE_STEP_ID, investigationStateSchema } from './investigation_state';

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
  };

  it('accepts a valid payload under both the YAML JSON Schema and the zod schema', () => {
    expect(validate(validPayload)).toBe(true);
    expect(investigationStateSchema.safeParse(validPayload).success).toBe(true);
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
});
