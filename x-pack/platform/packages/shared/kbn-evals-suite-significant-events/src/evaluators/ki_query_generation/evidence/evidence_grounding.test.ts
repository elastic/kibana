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

  it('grounds evidence against nested source docs via field-path flattening', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_logs: [],
        sample_docs: [
          {
            body: {
              structured: {
                object: {
                  reason: 'BackOff',
                  note: 'Back-off restarting failed container cart in pod cart-abc',
                },
              },
            },
          },
        ],
      },
      output: [
        {
          esql: 'FROM logs | WHERE true',
          title: 'K8s',
          category: 'error',
          severity_score: 50,
          evidence: [
            'body.structured.object.reason: BackOff',
            'Back-off restarting failed container cart',
          ],
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('grounds descriptive evidence via keyword overlap fallback', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_logs: [],
        sample_docs: [
          {
            body: {
              text: '{"creditCardNumber":"1234-5678","creditCardCvv":"123","creditCardExpirationYear":2025}',
            },
            resource: { attributes: { app: 'payment' } },
          },
        ],
      },
      output: [
        {
          esql: 'FROM logs | WHERE true',
          title: 'PCI',
          category: 'error',
          severity_score: 80,
          evidence: [
            'body.text contains full JSON with creditCardNumber, creditCardCvv, creditCardExpirationYear fields',
          ],
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('grounds evidence referencing field names present in docs', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_logs: [],
        sample_docs: [
          {
            attributes: { lastFourDigits: '3456', msg: 'Charge request received.' },
            resource: { attributes: { app: 'payment' } },
          },
        ],
      },
      output: [
        {
          esql: 'FROM logs | WHERE true',
          title: 'Payment',
          category: 'operational',
          severity_score: 25,
          evidence: ['attributes.lastFourDigits field present in payment service logs'],
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('grounds descriptive evidence via keyword overlap with hyphenated technical tokens', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_logs: [],
        sample_docs: [
          {
            resource: { attributes: { app: 'product-catalog' } },
            body: { text: 'otel-collector connection failed' },
          },
        ],
      },
      output: [
        {
          esql: 'FROM logs | WHERE true',
          title: 'Collector',
          category: 'error',
          severity_score: 60,
          evidence: ['product-catalog logs show otel-collector connection failures'],
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('rejects evidence with too few matching keywords and no features', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_logs: [],
        sample_docs: [{ body: { text: 'some log' } }],
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

  it('grounds feature-based evidence against input KI features', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_logs: [],
        sample_docs: [{ body: { text: 'some log' } }],
        features: [
          {
            type: 'entity',
            title: 'checkout',
            description: 'Checkout service handling orders',
            confidence: 95,
          },
          {
            type: 'dependency',
            title: 'checkout → payment',
            description: 'Checkout calls payment service via gRPC',
            confidence: 80,
          },
          {
            type: 'entity',
            title: 'payment',
            description: 'Payment service processing charges',
            confidence: 92,
          },
        ],
      },
      output: [
        {
          esql: 'FROM logs | WHERE resource.attributes.app == "checkout"',
          title: 'Checkout Errors',
          category: 'error',
          severity_score: 50,
          evidence: [
            'Entity: checkout service (confidence 95)',
            'Dependency: checkout → payment (gRPC, confidence 80)',
          ],
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('rejects feature evidence that does not match any input feature', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_logs: [],
        sample_docs: [{ body: { text: 'some log' } }],
        features: [
          {
            type: 'entity',
            title: 'cart',
            description: 'Cart service',
            confidence: 90,
          },
        ],
      },
      output: [
        {
          esql: 'FROM logs | WHERE true',
          title: 'Missing',
          category: 'error',
          severity_score: 50,
          evidence: ['Entity: payment service (confidence 100)'],
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('Evidence not found');
  });
});
