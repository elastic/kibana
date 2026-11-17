/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { findKiRevision, type KiRevision } from '../ai_indices/ki_revision';
import { isActiveKi, kiTypeFilterQuery, readActiveKis } from './active_kis';
import type { DreamedKi } from './dreamed_ki';

jest.mock('../ai_indices/ki_revision', () => ({
  ...jest.requireActual('../ai_indices/ki_revision'),
  findKiRevision: jest.fn(),
}));

const NOW = new Date('2026-11-16T12:00:00.000Z');

describe('kiTypeFilterQuery', () => {
  it('matches exact types and prefixes, never relationships', () => {
    expect(kiTypeFilterQuery(['fact.*', 'entity.customer'])).toEqual({
      bool: {
        should: [{ prefix: { type: 'fact.' } }, { term: { type: 'entity.customer' } }],
        minimum_should_match: 1,
        must_not: [{ terms: { type: ['memory.relationship'] } }],
      },
    });
  });
});

describe('isActiveKi', () => {
  it('is active unless deleted, failed verification, expired, or hidden from the space', () => {
    expect(isActiveKi({}, 'default', NOW)).toBe(true);
    expect(isActiveKi({ expires_at: '2026-12-01T00:00:00.000Z' }, 'default', NOW)).toBe(true);
    expect(isActiveKi({ governance: { lifecycle: { status: 'deleted' } } }, 'default', NOW)).toBe(
      false
    );
    expect(
      isActiveKi({ governance: { lifecycle: { status: 'verification_failed' } } }, 'default', NOW)
    ).toBe(false);
    expect(isActiveKi({ expires_at: '2026-11-01T00:00:00.000Z' }, 'default', NOW)).toBe(false);
    expect(
      isActiveKi({ permissions: { kibana: { privileges: [{ space: 'other' }] } } }, 'default', NOW)
    ).toBe(false);
  });
});

describe('readActiveKis', () => {
  it('reads each KI once, in order, leaving out those that are not active', async () => {
    const stored: Record<string, DreamedKi> = {
      a: { id: 'a', type: 'fact.x', title: 'A' },
      b: { id: 'b', type: 'fact.x', title: 'B', governance: { lifecycle: { status: 'deleted' } } },
      c: { id: 'c', type: 'fact.x', title: 'C' },
    };
    jest
      .mocked(findKiRevision)
      .mockImplementation(async ({ kiId }) =>
        stored[kiId]
          ? ({ index: 'i', documentId: kiId, source: stored[kiId] } as KiRevision)
          : undefined
      );

    const kis = await readActiveKis({
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      aiIndexId: 'ai',
      dest: { type: 'index', value: 'ai-index-idx-ai' },
      spaceId: 'default',
      ids: ['c', 'a', 'b', 'missing', 'c'],
    });

    expect(kis.map(({ id }) => id)).toEqual(['c', 'a']);
    expect(findKiRevision).toHaveBeenCalledTimes(4);
  });
});
