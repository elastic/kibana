/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeBinaryAgreement, type BinaryLabelPair } from './binary_agreement';

const repeat = (pair: BinaryLabelPair, count: number): BinaryLabelPair[] =>
  Array.from({ length: count }, () => pair);

describe('computeBinaryAgreement', () => {
  it('gives kappa 1 for perfect agreement', () => {
    const result = computeBinaryAgreement([
      ...repeat({ judge: true, human: true }, 6),
      ...repeat({ judge: false, human: false }, 4),
    ]);
    expect(result.kappa).toBe(1);
    expect(result.rawAgreement).toBe(1);
    expect(result.precision).toBe(1);
    expect(result.recall).toBe(1);
  });

  describe('textbook 2x2 table', () => {
    // Judge rows / human columns: 20 yes-yes, 5 yes-no, 10 no-yes, 15 no-no.
    const result = computeBinaryAgreement([
      ...repeat({ judge: true, human: true }, 20),
      ...repeat({ judge: true, human: false }, 5),
      ...repeat({ judge: false, human: true }, 10),
      ...repeat({ judge: false, human: false }, 15),
    ]);

    it('reproduces kappa = 0.4, agreement 0.7, precision 0.8 and recall 2/3', () => {
      expect(result.n).toBe(50);
      expect(result.confusion).toEqual({ tp: 20, fp: 5, fn: 10, tn: 15 });
      expect(result.rawAgreement).toBeCloseTo(0.7, 12);
      expect(result.kappa).toBeCloseTo(0.4, 12);
      expect(result.precision).toBeCloseTo(0.8, 12);
      expect(result.recall).toBeCloseTo(2 / 3, 12);
    });

    it('reports Wilson intervals that match the reference within 1e-6', () => {
      // Recall is 20/30; reference computed independently.
      expect(Math.abs((result.recallInterval?.low ?? NaN) - 0.4878005164)).toBeLessThan(1e-6);
      expect(Math.abs((result.recallInterval?.high ?? NaN) - 0.8076950192)).toBeLessThan(1e-6);
    });

    it('brackets every point estimate with its interval', () => {
      expect(result.rawAgreementInterval?.low).toBeLessThan(0.7);
      expect(result.rawAgreementInterval?.high).toBeGreaterThan(0.7);
      expect(result.precisionInterval?.low).toBeLessThan(0.8);
      expect(result.precisionInterval?.high).toBeGreaterThan(0.8);
      expect(result.kappaInterval?.low).toBeLessThan(0.4);
      expect(result.kappaInterval?.high).toBeGreaterThan(0.4);
    });
  });

  it('gives kappa 0 when agreement is only by chance', () => {
    const result = computeBinaryAgreement([
      ...repeat({ judge: true, human: true }, 25),
      ...repeat({ judge: true, human: false }, 25),
      ...repeat({ judge: false, human: true }, 25),
      ...repeat({ judge: false, human: false }, 25),
    ]);
    expect(result.kappa).toBeCloseTo(0, 12);
  });

  it('gives kappa -1 for systematic disagreement', () => {
    const result = computeBinaryAgreement([
      ...repeat({ judge: true, human: false }, 5),
      ...repeat({ judge: false, human: true }, 5),
    ]);
    expect(result.kappa).toBeCloseTo(-1, 12);
  });

  it('leaves kappa undefined when chance agreement is certain', () => {
    const result = computeBinaryAgreement(repeat({ judge: true, human: true }, 5));
    expect(result.rawAgreement).toBe(1);
    expect(result.kappa).toBeNull();
    expect(result.kappaInterval).toBeNull();
  });

  it('returns nulls for empty input', () => {
    const result = computeBinaryAgreement([]);
    expect(result.n).toBe(0);
    expect(result.rawAgreement).toBeNull();
    expect(result.kappa).toBeNull();
    expect(result.precision).toBeNull();
    expect(result.recall).toBeNull();
    expect(result.precisionInterval).toBeNull();
  });

  it('leaves precision undefined when the judge never says positive', () => {
    const result = computeBinaryAgreement([
      ...repeat({ judge: false, human: true }, 3),
      ...repeat({ judge: false, human: false }, 3),
    ]);
    expect(result.precision).toBeNull();
    expect(result.recall).toBe(0);
  });
});
