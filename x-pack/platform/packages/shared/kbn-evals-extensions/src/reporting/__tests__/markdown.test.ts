/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateMarkdownReport } from '../markdown';
import type { MarkdownReportInput, MarkdownReportConfig } from '../markdown';

describe('generateMarkdownReport', () => {
  const baseInput: MarkdownReportInput = {
    evaluatorResults: [
      { name: 'skill-safety', kind: 'CODE', score: 1.0, label: 'pass' },
      { name: 'skill-accuracy', kind: 'LLM', score: 0.85, label: 'pass' },
      {
        name: 'skill-relevance',
        kind: 'LLM',
        score: 0.6,
        label: 'warn',
        explanation: 'Tangential to security',
      },
    ],
  };

  it('should generate a valid markdown report', () => {
    const report = generateMarkdownReport(baseInput);
    expect(report).toContain('# Skill Evaluation Report');
    expect(report).toContain('| Evaluator | Kind | Score | Status |');
    expect(report).toContain('skill-safety');
    expect(report).toContain('skill-accuracy');
    expect(report).toContain('100.0%');
    expect(report).toContain('85.0%');
  });

  it('should include custom title', () => {
    const report = generateMarkdownReport(baseInput, { title: 'My Custom Report' });
    expect(report).toContain('# My Custom Report');
  });

  it('should include metadata when provided', () => {
    const config: MarkdownReportConfig = {
      runId: 'run-123',
      timestamp: '2026-03-28T10:00:00Z',
      durationMs: 2500,
    };
    const report = generateMarkdownReport(baseInput, config);
    expect(report).toContain('`run-123`');
    expect(report).toContain('2026-03-28T10:00:00Z');
    expect(report).toContain('2.5s');
  });

  it('should format duration in ms for short durations', () => {
    const report = generateMarkdownReport(baseInput, { durationMs: 500 });
    expect(report).toContain('500ms');
  });

  it('should include composite score and grade', () => {
    const input: MarkdownReportInput = {
      ...baseInput,
      compositeScore: {
        compositeScore: 0.92,
        compositeGrade: 'A',
        dimensionScores: { safety: 1.0, accuracy: 0.85 },
      },
    };
    const report = generateMarkdownReport(input);
    expect(report).toContain('92.0%');
    expect(report).toContain('A');
    expect(report).toContain('Dimension Scores');
    expect(report).toContain('safety');
  });

  it('should include CI gate status when passed', () => {
    const input: MarkdownReportInput = {
      ...baseInput,
      gateResult: { passed: true, failedGates: [] },
    };
    const report = generateMarkdownReport(input);
    expect(report).toContain('**CI Gate:** PASSED');
  });

  it('should include CI gate failures', () => {
    const input: MarkdownReportInput = {
      ...baseInput,
      gateResult: {
        passed: false,
        failedGates: [
          {
            gate: 'composite-threshold',
            expected: 0.9,
            actual: 0.7,
            message: 'Composite score 0.700 below threshold 0.9',
          },
        ],
      },
    };
    const report = generateMarkdownReport(input);
    expect(report).toContain('**CI Gate:** FAILED');
    expect(report).toContain('Gate Failures');
    expect(report).toContain('composite-threshold');
  });

  it('should include failure details for low-scoring evaluators', () => {
    const report = generateMarkdownReport(baseInput);
    expect(report).toContain('Failure Details');
    expect(report).toContain('skill-relevance');
    expect(report).toContain('Tangential to security');
  });

  it('should use custom pass threshold', () => {
    const report = generateMarkdownReport(baseInput, { passThreshold: 0.9 });
    // skill-accuracy (0.85) should now be FAIL with threshold 0.9
    expect(report).toContain('skill-accuracy');
    // The table should show FAIL for scores below 0.9
    const lines = report.split('\n');
    const accuracyLine = lines.find((l) => l.includes('skill-accuracy'));
    expect(accuracyLine).toContain('FAIL');
  });

  it('should handle N/A scores', () => {
    const input: MarkdownReportInput = {
      evaluatorResults: [{ name: 'pending-eval', kind: 'LLM', score: null, label: 'pending' }],
    };
    const report = generateMarkdownReport(input);
    expect(report).toContain('N/A');
  });

  it('should handle empty evaluator results', () => {
    const report = generateMarkdownReport({ evaluatorResults: [] });
    expect(report).toContain('# Skill Evaluation Report');
    expect(report).toContain('| Evaluator | Kind | Score | Status |');
  });
});
