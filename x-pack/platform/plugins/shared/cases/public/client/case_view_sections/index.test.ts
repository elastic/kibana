/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseUI } from '../../../common/ui/types';
import { CaseViewSectionRegistry } from '.';

const caseData = { id: 'case-1', comments: [] } as unknown as CaseUI;

describe('CaseViewSectionRegistry', () => {
  it('returns the visible sections of one position, in registration order', () => {
    const registry = new CaseViewSectionRegistry();
    registry.register({ id: 'a', position: 'related', render: () => 'a' });
    registry.register({ id: 'b', position: 'sidebar', render: () => 'b' });
    registry.register({ id: 'c', position: 'related', isVisible: () => false, render: () => 'c' });
    registry.register({ id: 'd', position: 'related', render: () => 'd' });

    expect(registry.getVisible('related', caseData).map(({ id }) => id)).toEqual(['a', 'd']);
    expect(registry.getVisible('closeModal', caseData)).toEqual([]);
  });

  it('returns registered tabs on their own position', () => {
    const registry = new CaseViewSectionRegistry();
    registry.register({ id: 'a', position: 'aboveTabs', render: () => 'a' });
    registry.register({
      id: 'b',
      position: 'tab',
      tabId: 'decisions',
      name: 'Decisions',
      render: () => 'b',
    });

    expect(registry.getVisible('tab', caseData).map(({ tabId }) => tabId)).toEqual(['decisions']);
  });

  it('refuses a second section with the same id', () => {
    const registry = new CaseViewSectionRegistry();
    registry.register({ id: 'a', position: 'related', render: () => 'a' });
    expect(() => registry.register({ id: 'a', position: 'sidebar', render: () => 'a' })).toThrow(
      'Case view section "a" is already registered'
    );
  });
});

describe('matchesRelatedFilters', () => {
  const { matchesRelatedFilters } = jest.requireActual('.');

  it('passes everything with no filters', () => {
    expect(matchesRelatedFilters({ reasons: [], isClosed: true }, undefined)).toBe(true);
    expect(
      matchesRelatedFilters({ reasons: ['linked'], isClosed: false }, { relatedBy: [], status: [] })
    ).toBe(true);
  });

  it('needs one matching reason and a matching status', () => {
    const filters = { relatedBy: ['observable', 'alert'], status: ['open'] };
    expect(matchesRelatedFilters({ reasons: ['alert'], isClosed: false }, filters)).toBe(true);
    expect(matchesRelatedFilters({ reasons: ['linked'], isClosed: false }, filters)).toBe(false);
    expect(matchesRelatedFilters({ reasons: ['alert'], isClosed: true }, filters)).toBe(false);
  });
});
