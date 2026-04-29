/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeChi2PValue } from './compute_chi_2_pvalue';
import type { Histogram } from './types';

describe('computeChi2PValue()', () => {
  test('should return close to 1 if datasets are both empty or nearly identical', () => {
    const referenceTerms: Histogram[] = [
      {
        key: 'ap-northwest-1',
        doc_count: 40348,
        percentage: 0.2712470588235294,
      },
      {
        key: 'us-east-1',
        doc_count: 15134,
        percentage: 0.10174117647058824,
      },
      {
        key: 'eu-central-1',
        doc_count: 12614,
        percentage: 0.0848,
      },
      {
        key: 'sa-east-1',
        doc_count: 80654,
        percentage: 0.5422117647058824,
      },
    ];
    const comparisonTerms: Histogram[] = [
      {
        key: 'ap-northwest-1',
        doc_count: 40320,
        percentage: 0.2609691846654714,
      },
      {
        key: 'us-east-1',
        doc_count: 15127,
        percentage: 0.09790875139966732,
      },
      {
        key: 'eu-central-1',
        doc_count: 12614,
        percentage: 0.08164348450819088,
      },
      {
        key: 'sa-east-1',
        doc_count: 86440,
        percentage: 0.5594785794266703,
      },
    ];
    expect(computeChi2PValue([], [])).toStrictEqual(1);
    expect(computeChi2PValue(referenceTerms, comparisonTerms)).toStrictEqual(0.99);
  });

  test('should return close to 0 if datasets differ', () => {
    const referenceTerms: Histogram[] = [
      {
        key: 'jackson',
        doc_count: 1,
        percentage: 1,
      },
      {
        key: 'yahya',
        doc_count: 0,
        percentage: 0,
      },
    ];
    const comparisonTerms: Histogram[] = [
      {
        key: 'jackson',
        doc_count: 0,
        percentage: 0,
      },
      {
        key: 'yahya',
        doc_count: 1,
        percentage: 1,
      },
    ];
    expect(computeChi2PValue(referenceTerms, comparisonTerms)).toStrictEqual(0.000001);
  });
});
