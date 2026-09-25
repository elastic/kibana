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
  NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  INVESTIGATE_STEP_ID,
  investigationStateSchema,
  MAX_BLIND_SPOTS,
  MAX_EVIDENCE_CHART_ANNOTATIONS,
  MAX_EVIDENCE_CHART_POINTS,
  MAX_EVIDENCE_CHART_SERIES,
  MAX_HYPOTHESIS_EVIDENCE,
  MAX_IMPACT_ENTITIES,
  MAX_RECOMMENDATIONS,
  MAX_TIMELINE_EVENTS,
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
 * by hand with `investigationStateSchema`, which the investigation agent's progress-report tool
 * streams live and consumers use to parse persisted results. These tests catch workflow drift
 * structurally (via z.toJSONSchema equality) and behaviorally (the same payloads validate
 * identically against both schemas).
 *
 * This lives here — importing the workflow definition from `@kbn/workflows/managed` — rather
 * than as a test in `@kbn/workflows` importing this schema, because `@kbn/workflows` is
 * dual/triple-licensed (Elastic License 2.0 OR AGPL-3.0-only OR SSPL-1.0) and cannot depend on
 * this Elastic-License-2.0-only package. This package depending on `@kbn/workflows` (available
 * under Elastic License 2.0, among others) is licensing-legal in the other direction.
 */
describe('investigation_workflow.yaml structured-output schema stays in sync with investigationStateSchema', () => {
  const workflowDefinition = getManagedWorkflowDefinition(NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID);

  if (!workflowDefinition?.yaml) {
    throw new Error(
      `Could not find a static \`yaml\` definition for managed workflow id "${NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID}"`
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
    severity: '80-critical',
    recommendations: [
      {
        title: 'Revert the pool-size config change',
        confidence: 0.95,
        description: 'Raise it back above the previous value.',
        code: 'connection_pool:\n  max_size: 100',
      },
    ],
    blind_spots: [
      {
        title: 'No profiling data available',
        confidence: 0.7,
        description: 'Would have confirmed whether a leak compounded the exhaustion.',
      },
    ],
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

  const sampleChart = {
    type: 'line',
    title: 'orders-api pool utilization',
    x_axis: { type: 'time' },
    y_axis: { label: 'Utilization', unit: 'percent' },
    series: [
      {
        name: 'orders-api',
        points: [
          { x: '2026-07-28T14:00:00Z', y: 42 },
          { x: '2026-07-28T14:05:00Z', y: 100 },
        ],
      },
    ],
    annotations: [{ x: '2026-07-28T14:02:00Z', label: 'Deploy v2.3.1' }],
  };

  const withHypothesisEvidence = (evidence: unknown[]) => ({
    summary: 'ok',
    hypotheses: [
      {
        candidate: 'Connection pool exhaustion after the 14:02 deploy',
        confidence: 0.9,
        status: 'confirmed',
        evidence,
      },
    ],
  });

  it('accepts markdown evidence with a chart under both schemas', () => {
    const payload = withHypothesisEvidence([
      {
        description: '| minute | utilization |\n| --- | --- |\n| 14:00 | 42% |\n| 14:05 | 100% |',
        chart: sampleChart,
      },
    ]);

    expect(validate(payload)).toBe(true);
    expect(investigationStateSchema.safeParse(payload).success).toBe(true);
  });

  it('accepts evidence that is a markdown observation with no chart under both schemas', () => {
    const payload = withHypothesisEvidence([
      { description: 'All checkout pods were in `CrashLoopBackOff`.' },
    ]);

    expect(validate(payload)).toBe(true);
    expect(investigationStateSchema.safeParse(payload).success).toBe(true);
  });

  it('accepts a stacked bar chart over categories with a range annotation under both schemas', () => {
    const payload = withHypothesisEvidence([
      {
        description: 'Errors per region.',
        chart: {
          type: 'bar',
          title: 'Errors by region',
          x_axis: { type: 'category', label: 'Region' },
          y_axis: {},
          stacked: true,
          series: [
            { name: '5xx', points: [{ x: 'eu-west-1', y: 12 }] },
            { name: '4xx', points: [{ x: 'eu-west-1', y: 3 }] },
          ],
          annotations: [{ x: 'eu-west-1', x_end: 'us-east-1', label: 'Affected' }],
        },
      },
    ]);

    expect(validate(payload)).toBe(true);
    expect(investigationStateSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects a chart without series under both schemas', () => {
    const payload = withHypothesisEvidence([
      { description: 'Empty.', chart: { ...sampleChart, series: [] } },
    ]);

    expect(validate(payload)).toBe(false);
    expect(investigationStateSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects an unsupported chart type under both schemas', () => {
    const payload = withHypothesisEvidence([
      { description: 'Pie.', chart: { ...sampleChart, type: 'pie' } },
    ]);

    expect(validate(payload)).toBe(false);
    expect(investigationStateSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects a chart exceeding the series, point, or annotation bounds under both schemas', () => {
    const series = { name: 's', points: [{ x: 'a', y: 1 }] };
    const tooManySeries = withHypothesisEvidence([
      {
        description: 'x',
        chart: {
          ...sampleChart,
          series: Array.from({ length: MAX_EVIDENCE_CHART_SERIES + 1 }, () => series),
        },
      },
    ]);
    const tooManyPoints = withHypothesisEvidence([
      {
        description: 'x',
        chart: {
          ...sampleChart,
          series: [
            {
              name: 's',
              points: Array.from({ length: MAX_EVIDENCE_CHART_POINTS + 1 }, (_, index) => ({
                x: `${index}`,
                y: index,
              })),
            },
          ],
        },
      },
    ]);
    const tooManyAnnotations = withHypothesisEvidence([
      {
        description: 'x',
        chart: {
          ...sampleChart,
          annotations: Array.from({ length: MAX_EVIDENCE_CHART_ANNOTATIONS + 1 }, () => ({
            x: 'a',
            label: 'b',
          })),
        },
      },
    ]);

    for (const payload of [tooManySeries, tooManyPoints, tooManyAnnotations]) {
      expect(validate(payload)).toBe(false);
      expect(investigationStateSchema.safeParse(payload).success).toBe(false);
    }
  });

  it('rejects a chart point without a numeric y under both schemas', () => {
    const payload = withHypothesisEvidence([
      {
        description: 'x',
        chart: { ...sampleChart, series: [{ name: 's', points: [{ x: 'a', y: 'high' }] }] },
      },
    ]);

    expect(validate(payload)).toBe(false);
    expect(investigationStateSchema.safeParse(payload).success).toBe(false);
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

  it('rejects an investigation severity outside the canonical tiers under both schemas', () => {
    const invalidSeverity = { ...validPayload, severity: 'critical' };

    expect(validate(invalidSeverity)).toBe(false);
    expect(investigationStateSchema.safeParse(invalidSeverity).success).toBe(false);
  });

  it('accepts a minimal scored recommendation under both schemas', () => {
    const minimalRecommendation = {
      ...validPayload,
      recommendations: [{ title: 'Roll back the deployment', confidence: 0.9 }],
    };

    expect(validate(minimalRecommendation)).toBe(true);
    expect(investigationStateSchema.safeParse(minimalRecommendation).success).toBe(true);
  });

  it('rejects a recommendation or blind spot without confidence under both schemas', () => {
    const recommendationWithoutConfidence = {
      ...validPayload,
      recommendations: [{ title: 'Roll back the deployment' }],
    };
    const blindSpotWithoutConfidence = {
      ...validPayload,
      blind_spots: [{ title: 'No traces', description: 'The causal path was unavailable.' }],
    };

    expect(validate(recommendationWithoutConfidence)).toBe(false);
    expect(investigationStateSchema.safeParse(recommendationWithoutConfidence).success).toBe(false);
    expect(validate(blindSpotWithoutConfidence)).toBe(false);
    expect(investigationStateSchema.safeParse(blindSpotWithoutConfidence).success).toBe(false);
  });

  it('rejects item confidence outside the 0–1 range under both schemas', () => {
    const invalidConfidence = {
      ...validPayload,
      recommendations: [{ title: 'Roll back the deployment', confidence: 1.1 }],
    };

    expect(validate(invalidConfidence)).toBe(false);
    expect(investigationStateSchema.safeParse(invalidConfidence).success).toBe(false);
  });

  it('sorts items by confidence descending and preserves source order for ties', () => {
    const parsed = investigationStateSchema.parse({
      ...validPayload,
      recommendations: [
        { title: 'First tied step', confidence: 0.7 },
        { title: 'Highest step', confidence: 0.9 },
        { title: 'Second tied step', confidence: 0.7 },
      ],
      blind_spots: [
        { title: 'Lower gap', confidence: 0.4, description: 'Lower relevance.' },
        { title: 'Higher gap', confidence: 0.8, description: 'Higher relevance.' },
      ],
    });

    expect(parsed.recommendations?.map(({ title }) => title)).toEqual([
      'Highest step',
      'First tied step',
      'Second tied step',
    ]);
    expect(parsed.blind_spots?.map(({ title }) => title)).toEqual(['Higher gap', 'Lower gap']);
  });

  it('rejects a recommendations array exceeding MAX_RECOMMENDATIONS under both schemas', () => {
    const tooManyRecommendations = {
      ...validPayload,
      recommendations: Array.from({ length: MAX_RECOMMENDATIONS + 1 }, (_, index) => ({
        title: `Step ${index}`,
        confidence: 0.8,
      })),
    };

    expect(validate(tooManyRecommendations)).toBe(false);
    expect(investigationStateSchema.safeParse(tooManyRecommendations).success).toBe(false);
  });

  it('rejects a recommendation missing its title under both schemas', () => {
    const missingTitle = {
      ...validPayload,
      recommendations: [{ confidence: 0.8, description: 'Do the thing' }],
    };

    expect(validate(missingTitle)).toBe(false);
    expect(investigationStateSchema.safeParse(missingTitle).success).toBe(false);
  });

  it('rejects a blind spot missing its description under both schemas', () => {
    const missingDescription = {
      ...validPayload,
      blind_spots: [{ title: 'No traces for the cart service', confidence: 0.8 }],
    };

    expect(validate(missingDescription)).toBe(false);
    expect(investigationStateSchema.safeParse(missingDescription).success).toBe(false);
  });

  it('rejects a blind_spots array exceeding MAX_BLIND_SPOTS under both schemas', () => {
    const tooManyBlindSpots = {
      ...validPayload,
      blind_spots: Array.from({ length: MAX_BLIND_SPOTS + 1 }, (_, index) => ({
        title: `Gap ${index}`,
        confidence: 0.8,
        description: `Missing data ${index}`,
      })),
    };

    expect(validate(tooManyBlindSpots)).toBe(false);
    expect(investigationStateSchema.safeParse(tooManyBlindSpots).success).toBe(false);
  });

  it('accepts a payload with an impact entity carrying a name and evidence under both schemas', () => {
    const withImpact = {
      ...validPayload,
      impact: {
        entities: [
          {
            name: 'checkout-service',
            type: 'service',
            evidence: {
              description: 'checkout-service error rate during incident window',
              chart: sampleChart,
            },
          },
        ],
      },
    };

    expect(validate(withImpact)).toBe(true);
    expect(investigationStateSchema.safeParse(withImpact).success).toBe(true);
  });

  it('accepts an impact entity with only a name (no optional fields) under both schemas', () => {
    const minimalImpact = {
      ...validPayload,
      impact: { entities: [{ name: 'payment-service' }] },
    };

    expect(validate(minimalImpact)).toBe(true);
    expect(investigationStateSchema.safeParse(minimalImpact).success).toBe(true);
  });

  it('accepts an impact entity with feature_id and stream_name under both schemas', () => {
    const withKi = {
      ...validPayload,
      impact: {
        entities: [
          {
            name: 'cart-service',
            type: 'service',
            feature_id: 'ki-abc123',
            stream_name: 'logs-app',
          },
        ],
      },
    };

    expect(validate(withKi)).toBe(true);
    expect(investigationStateSchema.safeParse(withKi).success).toBe(true);
  });

  it('rejects an impact entity missing its required name under both schemas', () => {
    const missingName = {
      ...validPayload,
      impact: { entities: [{ type: 'service' }] },
    };

    expect(validate(missingName)).toBe(false);
    expect(investigationStateSchema.safeParse(missingName).success).toBe(false);
  });

  it('rejects an impact entities array exceeding MAX_IMPACT_ENTITIES under both schemas', () => {
    const tooManyEntities = {
      ...validPayload,
      impact: {
        entities: Array.from({ length: MAX_IMPACT_ENTITIES + 1 }, (_, i) => ({
          name: `service-${i}`,
        })),
      },
    };

    expect(validate(tooManyEntities)).toBe(false);
    expect(investigationStateSchema.safeParse(tooManyEntities).success).toBe(false);
  });

  it('accepts an impact summary alongside the entities under both schemas', () => {
    const withImpactSummary = {
      ...validPayload,
      impact: {
        summary: 'Checkout failed for ~30% of requests for 40 minutes in eu-west-1.',
        entities: [{ name: 'checkout-service' }],
      },
    };

    expect(validate(withImpactSummary)).toBe(true);
    expect(investigationStateSchema.safeParse(withImpactSummary).success).toBe(true);
  });

  it('accepts a timeline and sorts it chronologically', () => {
    const withTimeline = {
      ...validPayload,
      timeline: [
        { timestamp: '2026-07-28T14:05:00Z', type: 'symptom', summary: 'Error rate spikes.' },
        { timestamp: '2026-07-28T14:02:00Z', type: 'change', summary: 'Deploy v2.3.1.' },
        { timestamp: '2026-07-28T14:40:00Z', type: 'recovery', summary: 'Rollback completes.' },
      ],
    };

    expect(validate(withTimeline)).toBe(true);
    const parsed = investigationStateSchema.parse(withTimeline);
    expect(parsed.timeline?.map(({ type }) => type)).toEqual(['change', 'symptom', 'recovery']);
  });

  it('rejects a timeline event with an unknown type or exceeding MAX_TIMELINE_EVENTS', () => {
    const badType = {
      ...validPayload,
      timeline: [{ timestamp: '2026-07-28T14:05:00Z', type: 'deploy', summary: 'x' }],
    };
    const tooMany = {
      ...validPayload,
      timeline: Array.from({ length: MAX_TIMELINE_EVENTS + 1 }, () => ({
        timestamp: '2026-07-28T14:05:00Z',
        type: 'other',
        summary: 'x',
      })),
    };

    for (const payload of [badType, tooMany]) {
      expect(validate(payload)).toBe(false);
      expect(investigationStateSchema.safeParse(payload).success).toBe(false);
    }
  });
});
