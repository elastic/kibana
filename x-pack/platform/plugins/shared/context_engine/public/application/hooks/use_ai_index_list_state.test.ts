/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { AiIndexHttpItem } from '../../../common/http_api/ai_indices';
import { AI_INDICES_PER_PAGE, useAiIndexListState } from './use_ai_index_list_state';

const buildAiIndex = (overrides: Partial<AiIndexHttpItem> = {}): AiIndexHttpItem => ({
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'index', value: 'ai-index-my-ai-index' },
  automations: [],
  sources: [],
  date_created: '2026-07-17T00:00:00.000Z',
  date_modified: '2026-07-17T00:00:00.000Z',
  ...overrides,
});

const buildAiIndexes = (count: number) =>
  Array.from({ length: count }, (_, index) => buildAiIndex({ id: `ai-index-${index}` }));

const renderListState = (aiIndices: AiIndexHttpItem[]) =>
  renderHook(({ items }) => useAiIndexListState(items), { initialProps: { items: aiIndices } });

describe('useAiIndexListState', () => {
  it('returns every AI index unfiltered on the first page', () => {
    const { result } = renderListState(buildAiIndexes(3));

    expect(result.current.matchCount).toBe(3);
    expect(result.current.visibleAiIndices).toHaveLength(3);
    expect(result.current.pageCount).toBe(1);
    expect(result.current.activePage).toBe(0);
  });

  describe('search', () => {
    const aiIndices = [
      buildAiIndex({ id: 'support-tickets', description: 'Escalation playbooks' }),
      buildAiIndex({ id: 'sales-outreach', dest: { type: 'index', value: 'ai-index-crm' } }),
    ];

    it('matches on id', () => {
      const { result } = renderListState(aiIndices);

      act(() => result.current.setQuery('support'));

      expect(result.current.visibleAiIndices.map(({ id }) => id)).toEqual(['support-tickets']);
    });

    it('matches on description', () => {
      const { result } = renderListState(aiIndices);

      act(() => result.current.setQuery('escalation'));

      expect(result.current.visibleAiIndices.map(({ id }) => id)).toEqual(['support-tickets']);
    });

    it('matches on the backing index name', () => {
      const { result } = renderListState(aiIndices);

      act(() => result.current.setQuery('ai-index-crm'));

      expect(result.current.visibleAiIndices.map(({ id }) => id)).toEqual(['sales-outreach']);
    });

    it('ignores case and surrounding whitespace', () => {
      const { result } = renderListState(aiIndices);

      act(() => result.current.setQuery('  SUPPORT  '));

      expect(result.current.visibleAiIndices.map(({ id }) => id)).toEqual(['support-tickets']);
    });

    it('treats a whitespace-only query as no filter', () => {
      const { result } = renderListState(aiIndices);

      act(() => result.current.setQuery('   '));

      expect(result.current.matchCount).toBe(2);
    });
  });

  describe('filters', () => {
    const aiIndices = [
      buildAiIndex({ id: 'plain-index', dest: { type: 'index', value: 'a' } }),
      buildAiIndex({ id: 'streamed', dest: { type: 'data_stream', value: 'b' } }),
      buildAiIndex({ id: 'elastic', managed: true, dest: { type: 'index', value: 'c' } }),
    ];

    it('filters by type', () => {
      const { result } = renderListState(aiIndices);

      act(() => result.current.setTypes(['data_stream']));

      expect(result.current.visibleAiIndices.map(({ id }) => id)).toEqual(['streamed']);
    });

    it('filters by owner', () => {
      const { result } = renderListState(aiIndices);

      act(() => result.current.setOwners(['managed']));

      expect(result.current.visibleAiIndices.map(({ id }) => id)).toEqual(['elastic']);

      act(() => result.current.setOwners(['user']));

      expect(result.current.visibleAiIndices.map(({ id }) => id)).toEqual([
        'plain-index',
        'streamed',
      ]);
    });

    it('combines filters and search with AND', () => {
      const { result } = renderListState(aiIndices);

      act(() => result.current.setTypes(['index']));
      act(() => result.current.setOwners(['user']));

      expect(result.current.visibleAiIndices.map(({ id }) => id)).toEqual(['plain-index']);

      act(() => result.current.setQuery('elastic'));

      expect(result.current.matchCount).toBe(0);
    });

    it('clears every filter at once', () => {
      const { result } = renderListState(aiIndices);

      act(() => result.current.setQuery('elastic'));
      act(() => result.current.setTypes(['index']));
      act(() => result.current.setOwners(['managed']));
      act(() => result.current.clearFilters());

      expect(result.current.matchCount).toBe(3);
      expect(result.current.filters).toEqual({ query: '', types: [], owners: [] });
    });
  });

  describe('pagination', () => {
    it(`splits matches into pages of ${AI_INDICES_PER_PAGE}`, () => {
      const { result } = renderListState(buildAiIndexes(AI_INDICES_PER_PAGE + 1));

      expect(result.current.pageCount).toBe(2);
      expect(result.current.visibleAiIndices).toHaveLength(AI_INDICES_PER_PAGE);

      act(() => result.current.setActivePage(1));

      expect(result.current.activePage).toBe(1);
      expect(result.current.visibleAiIndices.map(({ id }) => id)).toEqual([
        `ai-index-${AI_INDICES_PER_PAGE}`,
      ]);
    });

    it('returns to the first page when the filters change', () => {
      const { result } = renderListState(buildAiIndexes(AI_INDICES_PER_PAGE * 2));

      act(() => result.current.setActivePage(1));
      expect(result.current.activePage).toBe(1);

      act(() => result.current.setQuery('ai-index'));

      expect(result.current.activePage).toBe(0);
    });

    it('clamps the active page when the list shrinks', () => {
      const { result, rerender } = renderListState(buildAiIndexes(AI_INDICES_PER_PAGE * 2));

      act(() => result.current.setActivePage(1));

      rerender({ items: buildAiIndexes(2) });

      expect(result.current.pageCount).toBe(1);
      expect(result.current.activePage).toBe(0);
      expect(result.current.visibleAiIndices).toHaveLength(2);
    });

    it('reports a single page when nothing matches', () => {
      const { result } = renderListState(buildAiIndexes(3));

      act(() => result.current.setQuery('nothing-matches-this'));

      expect(result.current.matchCount).toBe(0);
      expect(result.current.pageCount).toBe(1);
      expect(result.current.visibleAiIndices).toEqual([]);
    });
  });
});
