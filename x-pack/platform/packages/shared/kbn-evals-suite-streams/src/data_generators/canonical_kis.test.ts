/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/streams-schema';
import { canonicalKIsFromExpectedGroundTruth } from './canonical_kis';
import { CANONICAL_LAST_SEEN } from './canonical_kis';

const getKIById = (kis: Feature[], id: string) => kis.find((ki) => ki.id === id);

describe('canonical_kis', () => {
  it('creates deterministic entity/dependency/infra KIs from expected_ground_truth', () => {
    const kis = canonicalKIsFromExpectedGroundTruth({
      streamName: 'logs',
      scenarioId: 'payment-unreachable',
      expectedGroundTruth:
        'entities=[frontend, checkout, payment], deps=[frontend->checkout (gRPC), checkout->payment (gRPC)], infra=[kubernetes]',
    });

    expect(getKIById(kis, 'entity-frontend')?.type).toBe('entity');
    expect(getKIById(kis, 'entity-frontend')?.properties).toEqual({ name: 'frontend' });

    expect(getKIById(kis, 'dep-frontend-checkout')?.type).toBe('dependency');
    expect(getKIById(kis, 'dep-frontend-checkout')?.properties).toEqual({
      from: 'frontend',
      to: 'checkout',
    });
    expect(getKIById(kis, 'dep-frontend-checkout')?.title).toBe('frontend → checkout');

    expect(getKIById(kis, 'infra-kubernetes')?.type).toBe('infrastructure');
    expect(getKIById(kis, 'infra-kubernetes')?.properties).toEqual({
      name: 'kubernetes',
    });

    expect(getKIById(kis, 'entity-frontend')?.uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(getKIById(kis, 'entity-frontend')?.last_seen).toBe(CANONICAL_LAST_SEEN);
  });

  it('filters ellipsis and "multiple services" items', () => {
    const kis = canonicalKIsFromExpectedGroundTruth({
      streamName: 'logs',
      scenarioId: 'healthy-baseline',
      expectedGroundTruth:
        'entities=[frontend, ..., multiple services], deps=[frontend->checkout], infra=[kubernetes]',
    });

    expect(kis.some((ki) => ki.id === 'entity-frontend')).toBe(true);
    expect(kis.some((ki) => ki.id.includes('multiple-services'))).toBe(false);
  });

  it('skips malformed deps without ->', () => {
    const kis = canonicalKIsFromExpectedGroundTruth({
      streamName: 'logs',
      scenarioId: 'healthy-baseline',
      expectedGroundTruth: 'deps=[frontend checkout, checkout->payment]',
    });

    expect(kis.some((ki) => ki.id === 'dep-checkout-payment')).toBe(true);
    expect(kis.some((ki) => ki.description.includes('frontend checkout'))).toBe(false);
  });

  it('drops text within parentheses from ids', () => {
    const kis = canonicalKIsFromExpectedGroundTruth({
      streamName: 'logs',
      scenarioId: 'scenario',
      expectedGroundTruth: 'entities=[payment (nodejs)], deps=[frontend->checkout (gRPC)]',
    });

    expect(kis.some((ki) => ki.id === 'entity-payment')).toBe(true);
    expect(kis.some((ki) => ki.id.includes('nodejs'))).toBe(false);
  });

  it('generates stable uuids for the same scenario and KI id', () => {
    const firstRun = canonicalKIsFromExpectedGroundTruth({
      streamName: 'logs',
      scenarioId: 'payment-unreachable',
      expectedGroundTruth: 'entities=[frontend]',
    });
    const secondRun = canonicalKIsFromExpectedGroundTruth({
      streamName: 'logs',
      scenarioId: 'payment-unreachable',
      expectedGroundTruth: 'entities=[frontend]',
    });

    expect(getKIById(firstRun, 'entity-frontend')?.uuid).toBe(
      getKIById(secondRun, 'entity-frontend')?.uuid
    );
  });
});
