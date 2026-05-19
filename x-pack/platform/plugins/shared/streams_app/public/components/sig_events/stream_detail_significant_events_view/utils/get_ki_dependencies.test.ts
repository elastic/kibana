/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/streams-ai';
import type { Feature } from '@kbn/streams-schema';
import {
  normalizeServiceName,
  findKIByIdentifier,
  getKIDependencies,
  DEPENDENCY_FEATURE_TYPE,
} from './get_ki_dependencies';

function makeFeature(overrides: Partial<Feature> & Pick<Feature, 'id' | 'type'>): Feature {
  return {
    stream_name: 'test-stream',
    description: '',
    properties: {},
    confidence: 80,
    uuid: overrides.id,
    status: 'active',
    last_seen: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeFeatureKI(
  overrides: Partial<Feature> & Pick<Feature, 'id' | 'type'>
): KnowledgeIndicator {
  return { kind: 'feature', feature: makeFeature(overrides) };
}

function makeQueryKI(id: string, title?: string): KnowledgeIndicator {
  return {
    kind: 'query',
    query: {
      id,
      title: title ?? id,
      description: '',
      type: 'match',
      esql: { query: 'FROM test' },
      severity_score: 50,
    },
    rule: { backed: false, id: `rule-${id}` },
    stream_name: 'test-stream',
  };
}

describe('normalizeServiceName', () => {
  it('lowercases and strips -service suffix', () => {
    expect(normalizeServiceName('Checkout-Service')).toBe('checkout');
  });

  it('strips " Service" suffix with space', () => {
    expect(normalizeServiceName('Payment Service')).toBe('payment');
  });

  it('handles plain lowercase names', () => {
    expect(normalizeServiceName('checkout')).toBe('checkout');
  });

  it('trims whitespace', () => {
    expect(normalizeServiceName('  api  ')).toBe('api');
  });

  it('handles null/undefined by coercing to string', () => {
    expect(normalizeServiceName(null)).toBe('');
    expect(normalizeServiceName(undefined)).toBe('');
  });

  it('handles non-string values', () => {
    expect(normalizeServiceName(42)).toBe('42');
  });
});

describe('findKIByIdentifier', () => {
  const checkoutKI = makeFeatureKI({
    id: 'checkout-service',
    type: 'entity',
    title: 'Checkout Service',
  });
  const paymentKI = makeFeatureKI({
    id: 'payment-service',
    type: 'entity',
    title: 'Payment Service',
  });
  const queryKI = makeQueryKI('query-1');
  const allKIs = [checkoutKI, paymentKI, queryKI];

  it('matches by exact id', () => {
    expect(findKIByIdentifier('checkout-service', allKIs)).toBe(checkoutKI);
  });

  it('matches by exact title', () => {
    expect(findKIByIdentifier('Payment Service', allKIs)).toBe(paymentKI);
  });

  it('matches by normalized short name against id', () => {
    expect(findKIByIdentifier('checkout', allKIs)).toBe(checkoutKI);
  });

  it('matches by normalized short name against title', () => {
    expect(findKIByIdentifier('payment', allKIs)).toBe(paymentKI);
  });

  it('returns undefined when no match', () => {
    expect(findKIByIdentifier('unknown', allKIs)).toBeUndefined();
  });

  it('skips query KIs', () => {
    expect(findKIByIdentifier('query-1', allKIs)).toBeUndefined();
  });
});

describe('getKIDependencies', () => {
  const checkoutKI = makeFeatureKI({
    id: 'checkout-service',
    type: 'entity',
    title: 'Checkout Service',
  });
  const paymentKI = makeFeatureKI({
    id: 'payment-service',
    type: 'entity',
    title: 'Payment Service',
  });
  const apiKI = makeFeatureKI({ id: 'api-service', type: 'entity', title: 'API Service' });

  const depCheckoutToPayment = makeFeatureKI({
    id: 'dep-checkout-payment',
    type: DEPENDENCY_FEATURE_TYPE,
    properties: { source: 'checkout', target: 'payment' },
  });

  const depApiToCheckout = makeFeatureKI({
    id: 'dep-api-checkout',
    type: DEPENDENCY_FEATURE_TYPE,
    properties: { source: 'api', target: 'checkout' },
  });

  const allKIs = [checkoutKI, paymentKI, apiKI, depCheckoutToPayment, depApiToCheckout];

  it('returns empty for query KIs', () => {
    const queryKI = makeQueryKI('q1');
    const result = getKIDependencies(queryKI, allKIs);
    expect(result).toEqual({ dependsOn: [], dependents: [] });
  });

  it('finds outgoing dependencies (dependsOn)', () => {
    const result = getKIDependencies(checkoutKI, allKIs);
    expect(result.dependsOn).toHaveLength(1);
    expect(result.dependsOn[0].via).toBe(depCheckoutToPayment);
    expect(result.dependsOn[0].ki).toBe(paymentKI);
  });

  it('finds incoming dependencies (dependents)', () => {
    const result = getKIDependencies(checkoutKI, allKIs);
    expect(result.dependents).toHaveLength(1);
    expect(result.dependents[0].via).toBe(depApiToCheckout);
    expect(result.dependents[0].ki).toBe(apiKI);
  });

  it('finds both directions for a middle node', () => {
    const result = getKIDependencies(checkoutKI, allKIs);
    expect(result.dependsOn).toHaveLength(1);
    expect(result.dependents).toHaveLength(1);
  });

  it('finds only dependents for a leaf target', () => {
    const result = getKIDependencies(paymentKI, allKIs);
    expect(result.dependsOn).toHaveLength(0);
    expect(result.dependents).toHaveLength(1);
    expect(result.dependents[0].ki).toBe(checkoutKI);
  });

  it('finds only dependsOn for a root source', () => {
    const result = getKIDependencies(apiKI, allKIs);
    expect(result.dependsOn).toHaveLength(1);
    expect(result.dependsOn[0].ki).toBe(checkoutKI);
    expect(result.dependents).toHaveLength(0);
  });

  it('returns empty when KI has no relationships', () => {
    const isolatedKI = makeFeatureKI({ id: 'isolated', type: 'entity' });
    const result = getKIDependencies(isolatedKI, allKIs);
    expect(result).toEqual({ dependsOn: [], dependents: [] });
  });

  it('skips dependency edges where the referenced KI is not found', () => {
    const danglingDep = makeFeatureKI({
      id: 'dep-checkout-unknown',
      type: DEPENDENCY_FEATURE_TYPE,
      properties: { source: 'checkout', target: 'nonexistent' },
    });
    const result = getKIDependencies(checkoutKI, [...allKIs, danglingDep]);
    // The dangling dep's target doesn't resolve, so dependsOn only has the payment one
    expect(result.dependsOn).toHaveLength(1);
    expect(result.dependsOn[0].ki).toBe(paymentKI);
  });

  it('supports from/to as alternative property names', () => {
    const depWithFromTo = makeFeatureKI({
      id: 'dep-from-to',
      type: DEPENDENCY_FEATURE_TYPE,
      properties: { from: 'checkout', to: 'api' },
    });
    const kis = [checkoutKI, apiKI, depWithFromTo];
    const result = getKIDependencies(checkoutKI, kis);
    expect(result.dependsOn).toHaveLength(1);
    expect(result.dependsOn[0].ki).toBe(apiKI);
  });

  it('matches by exact title', () => {
    const depByTitle = makeFeatureKI({
      id: 'dep-by-title',
      type: DEPENDENCY_FEATURE_TYPE,
      properties: { source: 'Checkout Service', target: 'Payment Service' },
    });
    const kis = [checkoutKI, paymentKI, depByTitle];
    const result = getKIDependencies(checkoutKI, kis);
    expect(result.dependsOn).toHaveLength(1);
    expect(result.dependsOn[0].ki).toBe(paymentKI);
  });

  it('matches by exact id', () => {
    const depById = makeFeatureKI({
      id: 'dep-by-id',
      type: DEPENDENCY_FEATURE_TYPE,
      properties: { source: 'checkout-service', target: 'payment-service' },
    });
    const kis = [checkoutKI, paymentKI, depById];
    const result = getKIDependencies(checkoutKI, kis);
    expect(result.dependsOn).toHaveLength(1);
  });

  it('handles KI with empty title gracefully', () => {
    const noTitleKI = makeFeatureKI({ id: 'no-title', type: 'entity' });
    const dep = makeFeatureKI({
      id: 'dep-to-notitle',
      type: DEPENDENCY_FEATURE_TYPE,
      properties: { source: 'checkout', target: 'no-title' },
    });
    const kis = [checkoutKI, noTitleKI, dep];
    const result = getKIDependencies(checkoutKI, kis);
    expect(result.dependsOn).toHaveLength(1);
    expect(result.dependsOn[0].ki).toBe(noTitleKI);
  });

  it('does not match dependency KIs against themselves', () => {
    const result = getKIDependencies(depCheckoutToPayment, allKIs);
    // dependency-type KIs shouldn't have dependencies of their own resolved
    // (the feature type would need to not be DEPENDENCY_FEATURE_TYPE to enter the loop)
    // but since depCheckoutToPayment IS a dependency type, its feature.type === 'dependency',
    // and we only look at depFeatures. It won't match itself as source/target.
    expect(result.dependsOn).toHaveLength(0);
    expect(result.dependents).toHaveLength(0);
  });

  it('handles dependency with missing properties', () => {
    const depNoProps = makeFeatureKI({
      id: 'dep-no-props',
      type: DEPENDENCY_FEATURE_TYPE,
      properties: {},
    });
    const kis = [checkoutKI, paymentKI, depNoProps];
    const result = getKIDependencies(checkoutKI, kis);
    expect(result).toEqual({ dependsOn: [], dependents: [] });
  });
});
