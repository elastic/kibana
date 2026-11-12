/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DreamedKi } from '../dreaming/dreamed_ki';
import { citedMemoryKiIds, sourceVerdictOf } from './sources';

const derivedFrom = (...uris: string[]) =>
  uris.map((uri) => ({ uri, relation: 'derived_from' as const }));

const fact = (overrides: Partial<DreamedKi> = {}): DreamedKi => ({
  id: 'fact-1',
  type: 'fact.preference',
  title: 'Tom eats vegetarian',
  references: derivedFrom('ki://m-1', 'ki://m-2'),
  ...overrides,
});

const memory = (id: string, deleted = false): [string, DreamedKi] => [
  id,
  {
    id,
    type: 'memory.session_fact',
    title: id,
    ...(deleted && { governance: { lifecycle: { status: 'deleted' as const } } }),
  },
];

describe('citedMemoryKiIds', () => {
  it('lists the memory KIs, leaving out trace rounds', () => {
    expect(
      citedMemoryKiIds(fact({ references: derivedFrom('ki://m-1', 'trace://abc') }))
    ).toEqual(['m-1']);
  });
});

describe('sourceVerdictOf', () => {
  it('leaves an item whose memories all remain', () => {
    expect(sourceVerdictOf(fact(), new Map([memory('m-1'), memory('m-2')]))).toEqual({
      verdict: 'intact',
    });
  });

  it('tombstones an item whose memories were all deleted or are gone', () => {
    expect(sourceVerdictOf(fact(), new Map([memory('m-1', true)]))).toEqual({
      verdict: 'tombstone',
      reason: 'Every memory it came from was deleted.',
    });
  });

  it('rewrites an item from the memories that remain', () => {
    expect(sourceVerdictOf(fact(), new Map([memory('m-1', true), memory('m-2')]))).toEqual({
      verdict: 'rewrite',
      lostIds: ['m-1'],
      remainingIds: ['m-2'],
    });
  });

  it('never counts a trace round as lost, and leaves such an item for review', () => {
    const fromTraces = fact({ references: derivedFrom('ki://m-1', 'trace://abc') });

    expect(sourceVerdictOf(fromTraces, new Map([memory('m-1', true)]))).toEqual({
      verdict: 'needs_review',
      reason: expect.stringContaining('agent conversations'),
    });
    expect(
      sourceVerdictOf(fact({ references: derivedFrom('trace://abc') }), new Map()).verdict
    ).toBe('intact');
  });

  it('leaves a person-edited item for review', () => {
    const edited = fact({
      governance: {
        provenance: { edited_by: { uri: 'api://context_engine.ki.update', metadata: {} } },
      },
    });

    expect(sourceVerdictOf(edited, new Map([memory('m-1', true)]))).toEqual({
      verdict: 'needs_review',
      reason: expect.stringContaining('A person edited it'),
    });
  });

  it('does not tombstone an item at the reference cap, whose older memories may remain', () => {
    const atCap = fact({
      references: derivedFrom(...Array.from({ length: 100 }, (_, index) => `ki://m-${index}`)),
    });

    expect(sourceVerdictOf(atCap, new Map()).verdict).toBe('needs_review');
  });
});
