/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evidenceGroundingEvaluator } from './evidence_grounding';

describe('evidence_grounding evaluator', () => {
  it('returns null when no evidence strings present', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: { sample_logs: ['log line'], sample_docs: [{ message: 'log line' }] },
      output: [
        { esql: 'FROM logs | WHERE true', title: 'A', category: 'error', severity_score: 50 },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBeNull();
  });

  it('falls back to text matching when sample_docs is absent', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: { sample_logs: ['payment timeout observed', 'service running'] },
      output: [
        {
          esql: 'FROM logs | WHERE body.text:"timeout"',
          title: 'A',
          category: 'error',
          severity_score: 50,
          evidence: ['timeout', 'nonexistent evidence'],
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('nonexistent evidence');
  });

  it('uses isEvidenceGrounded with structured field paths when sample_docs provided', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_logs: [],
        sample_docs: [
          {
            'attributes.msg': 'Charge request received.',
            'resource.attributes.app': 'payment',
            'body.text': '{"msg":"Charge request received."}',
          },
        ],
      },
      output: [
        {
          esql: 'FROM logs | WHERE true',
          title: 'Payment',
          category: 'operational',
          severity_score: 25,
          evidence: ['attributes.msg: "Charge request received."'],
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('strips parenthetical annotations before matching', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_logs: [],
        sample_docs: [{ 'attributes.msg': 'Transaction complete.' }],
      },
      output: [
        {
          esql: 'FROM logs | WHERE true',
          title: 'Tx',
          category: 'operational',
          severity_score: 20,
          evidence: ['attributes.msg: "Transaction complete." (4% of sampled logs)'],
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('strips em-dash annotations before matching', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_logs: [],
        sample_docs: [{ 'body.text': 'payment went through (transaction_id: abc-123)' }],
      },
      output: [
        {
          esql: 'FROM logs | WHERE true',
          title: 'Payment',
          category: 'operational',
          severity_score: 20,
          evidence: ['body.text: "payment went through (transaction_id: abc-123)" — normal path'],
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('marks non-grounded evidence correctly', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_logs: [],
        sample_docs: [{ 'body.text': 'some log' }],
      },
      output: [
        {
          esql: 'FROM logs | WHERE true',
          title: 'Missing',
          category: 'error',
          severity_score: 50,
          evidence: ['Dependency: checkout → payment (confidence 100)'],
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('Evidence not found');
  });
});
