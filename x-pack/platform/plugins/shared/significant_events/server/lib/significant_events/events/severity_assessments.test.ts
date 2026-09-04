/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SeverityAssessment } from '@kbn/significant-events-schema';
import { materializeSeverity } from './severity_assessments';

const discovery = (
  severity: SeverityAssessment['severity'],
  assessedAt: string
): SeverityAssessment => ({ source: 'discovery', severity, assessed_at: assessedAt });

const investigation = (
  severity: SeverityAssessment['severity'],
  assessedAt: string,
  invalidatedAt?: string
): SeverityAssessment => ({
  source: 'investigation',
  severity,
  assessed_at: assessedAt,
  workflow_execution_id: `workflow-${assessedAt}`,
  ...(invalidatedAt === undefined ? {} : { invalidated_at: invalidatedAt }),
});

describe('severity assessments', () => {
  const materializedAt = '2026-01-02T00:00:00.000Z';

  it('prefers a fresh investigation over a newer discovery assessment', () => {
    expect(
      materializeSeverity({
        assessments: [
          investigation('40-medium', '2026-01-01T12:00:00.001Z'),
          discovery('80-critical', '2026-01-01T23:59:00.000Z'),
        ],
        currentSeverity: '60-high',
        materializedAt,
      })
    ).toBe('40-medium');
  });

  it('uses the newest eligible assessment from the winning source', () => {
    expect(
      materializeSeverity({
        assessments: [
          discovery('40-medium', '2026-01-01T23:30:00.000Z'),
          discovery('60-high', '2026-01-01T23:45:00.000Z'),
        ],
        currentSeverity: '20-low',
        materializedAt,
      })
    ).toBe('60-high');
  });

  it('ignores expired and explicitly invalidated assessments', () => {
    expect(
      materializeSeverity({
        assessments: [
          investigation('80-critical', '2026-01-01T00:00:00.000Z'),
          investigation('60-high', '2026-01-01T23:00:00.000Z', '2026-01-01T23:30:00.000Z'),
          discovery('40-medium', '2026-01-01T23:30:00.000Z'),
        ],
        currentSeverity: '20-low',
        materializedAt,
      })
    ).toBe('40-medium');
  });

  it('preserves current severity when no assessment is eligible', () => {
    expect(
      materializeSeverity({
        assessments: [discovery('20-low', '2026-01-01T22:59:59.999Z')],
        currentSeverity: '60-high',
        materializedAt,
      })
    ).toBe('60-high');
  });

  it('uses append order as the deterministic final tie-breaker', () => {
    expect(
      materializeSeverity({
        assessments: [
          discovery('40-medium', '2026-01-01T23:30:00.000Z'),
          discovery('60-high', '2026-01-01T23:30:00.000Z'),
        ],
        currentSeverity: '20-low',
        materializedAt,
      })
    ).toBe('60-high');
  });
});
