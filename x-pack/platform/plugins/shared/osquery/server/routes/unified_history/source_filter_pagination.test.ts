/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Integration-style tests for the source filter + pagination pipeline.
 *
 * These compose the real functions (buildLiveActionsQuery, processLiveHistory,
 * mergeRows, computePaginationCursors) to verify end-to-end behaviour when
 * source filters are applied — the exact scenario that broke pagination before
 * the fix (see #259695).
 *
 * The ES layer is replaced by a lightweight in-memory stub that honours the
 * query's source filters and `search_after` cursor so we can assert
 * correct multi-page traversal.
 */

import type { LiveActionHit } from './map_live_hit_to_row';
import type { SourceFilter, UnifiedHistoryRow } from '../../../common/api/unified_history/types';
import type { SortValues } from './query_live_actions_dsl';
import { buildLiveActionsQuery } from './query_live_actions_dsl';
import { httpServerMock } from '@kbn/core/server/mocks';
import { processLiveHistory } from './process_live_history';
import { mergeRows } from './merge_rows';
import { computePaginationCursors, decodeCursor, encodeCursor } from './cursor_utils';

// ── mock result-count enrichment (not relevant to pagination) ──────────
jest.mock('../../lib/get_result_counts_for_actions', () => ({
  getResultCountsForActions: jest.fn().mockResolvedValue(new Map()),
}));

const mockOsqueryContext = {
  getStartServices: jest
    .fn()
    .mockResolvedValue([{ elasticsearch: { client: { asInternalUser: {} } } }]),
} as never;

const mockRequest = httpServerMock.createKibanaRequest();

const mockLogger = { warn: jest.fn() } as never;

// ── helpers to build realistic ES hits ─────────────────────────────────

let tsCounter = 1_700_000_000_000; // monotonic timestamp seed

const createHit = (
  id: string,
  opts: { alertIds?: string[]; ts?: number; workflow?: boolean } = {}
): LiveActionHit => {
  const ts = opts.ts ?? (tsCounter -= 1000);

  return {
    _source: {
      action_id: id,
      '@timestamp': new Date(ts).toISOString(),
      space_id: 'default',
      queries: [{ id: `q-${id}`, query: 'SELECT 1;', agents: ['agent-1'] }],
      ...(opts.alertIds ? { alert_ids: opts.alertIds } : {}),
      ...(opts.workflow ? { origin: { type: 'workflow' } } : {}),
    },
    fields: { action_id: [id] },
    sort: [ts, 1],
  };
};

interface TestClause {
  term?: Record<string, string | { value: string }>;
  exists?: { field: string };
  bool?: {
    filter?: TestClause[];
    must_not?: TestClause | TestClause[];
    should?: TestClause[];
    minimum_should_match?: number;
  };
}

const matchesClause = (
  clause: TestClause,
  document: Record<string, string | string[] | undefined>
): boolean => {
  if (clause.term) {
    return Object.entries(clause.term).every(([field, term]) => {
      const expected = typeof term === 'string' ? term : term.value;
      const value = document[field];

      return Array.isArray(value) ? value.includes(expected) : value === expected;
    });
  }

  if (clause.exists) {
    const value = document[clause.exists.field];

    return Array.isArray(value) ? value.length > 0 : value != null;
  }

  if (clause.bool) {
    const { filter = [], must_not = [], should = [], minimum_should_match } = clause.bool;
    const excluded = Array.isArray(must_not) ? must_not : [must_not];
    const minimum = minimum_should_match ?? (should.length > 0 && filter.length === 0 ? 1 : 0);

    return (
      filter.every((child) => matchesClause(child, document)) &&
      excluded.every((child) => !matchesClause(child, document)) &&
      should.filter((child) => matchesClause(child, document)).length >= minimum
    );
  }

  throw new Error('Unsupported test clause');
};

/**
 * In-memory stub that simulates ES `search` by applying the same filters
 * that `buildLiveActionsQuery` emits. It respects:
 * - source term, existence and boolean filters
 * - `search_after` cursor
 * - `size`
 */
const simulateEsSearch = (
  allHits: LiveActionHit[],
  query: ReturnType<typeof buildLiveActionsQuery>
): LiveActionHit[] => {
  const body = query.body;
  const filters = ((body.query as Record<string, unknown>).bool as Record<string, unknown>)
    .filter as unknown[];

  let hits = [...allHits];

  hits = hits.filter((hit) =>
    (filters as TestClause[]).every((filter) =>
      matchesClause(filter, {
        type: 'INPUT_ACTION',
        input_type: 'osquery',
        space_id: 'default',
        alert_ids: hit._source?.alert_ids,
        'origin.type': hit._source?.origin?.type,
      })
    )
  );

  // apply search_after
  const searchAfter = body.search_after as SortValues | undefined;
  if (searchAfter) {
    const afterTs = searchAfter[0] as number;
    hits = hits.filter((h) => (h.sort![0] as number) < afterTs);
  }

  // sort desc by timestamp (default)
  hits.sort((a, b) => (b.sort![0] as number) - (a.sort![0] as number));

  // apply size limit
  const size = body.size as number;

  return hits.slice(0, size);
};

// ── pipeline helper: runs one "page fetch" exactly like the route handler ──

interface PageResult {
  rows: UnifiedHistoryRow[];
  hasMore: boolean;
  nextPageToken: string | undefined;
}

const fetchPage = async (
  allHits: LiveActionHit[],
  opts: {
    pageSize: number;
    activeFilters?: Set<SourceFilter>;
    nextPage?: string;
  }
): Promise<PageResult> => {
  const { pageSize, activeFilters, nextPage } = opts;
  const decoded = decodeCursor(nextPage);
  const fetchSize = pageSize + 1;

  const query = buildLiveActionsQuery({
    pageSize: fetchSize,
    searchAfter: decoded.actionSearchAfter,
    spaceId: 'default',
    activeFilters,
  });

  const liveHits = simulateEsSearch(allHits, query);

  const { liveRows, sortValuesMap } = await processLiveHistory({
    liveHits,
    osqueryContext: mockOsqueryContext,
    request: mockRequest,
    cpsActive: false,
    logger: mockLogger,
  });

  const mergeResult = mergeRows<UnifiedHistoryRow>(liveRows, [], pageSize);

  const { nextActionSearchAfter, nextScheduledCursor, nextScheduledOffset } =
    computePaginationCursors({ mergeResult, sortValuesMap, decoded, scheduledOffset: 0 });

  let nextPageToken: string | undefined;
  if (mergeResult.hasMore) {
    nextPageToken = encodeCursor({
      actionSearchAfter: nextActionSearchAfter,
      scheduledCursor: nextScheduledCursor,
      scheduledOffset: nextScheduledOffset,
    });
  }

  return { rows: mergeResult.rows, hasMore: mergeResult.hasMore, nextPageToken };
};

// ── collect ALL pages via cursor traversal ──────────────────────────────

const fetchAllPages = async (
  allHits: LiveActionHit[],
  opts: { pageSize: number; activeFilters?: Set<SourceFilter> }
): Promise<UnifiedHistoryRow[]> => {
  const collected: UnifiedHistoryRow[] = [];
  let nextPage: string | undefined;

  for (let safety = 0; safety < 50; safety++) {
    const page = await fetchPage(allHits, { ...opts, nextPage });
    collected.push(...page.rows);
    if (!page.hasMore) break;
    nextPage = page.nextPageToken;
  }

  return collected;
};

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

describe('source filter pagination (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tsCounter = 1_700_000_000_000; // reset so tests are independent
  });

  // ── data set: 15 Live + 10 Rule = 25 total ──────────────────────────

  const buildMixedHits = () => {
    const hits: LiveActionHit[] = [];
    // first 10 = Rule, last 15 = Live
    for (let i = 0; i < 25; i++) {
      hits.push(createHit(`action-${i}`, i < 10 ? { alertIds: ['alert-1'] } : {}));
    }

    return hits; // first 10 = Rule, last 15 = Live
  };

  describe('without source filters (baseline)', () => {
    test('returns all 25 rows across multiple pages', async () => {
      const hits = buildMixedHits();
      const all = await fetchAllPages(hits, { pageSize: 10 });

      expect(all).toHaveLength(25);
    });

    test('first page has exactly pageSize rows and hasMore=true', async () => {
      const hits = buildMixedHits();
      const page1 = await fetchPage(hits, { pageSize: 10 });

      expect(page1.rows).toHaveLength(10);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextPageToken).toBeDefined();
    });
  });

  describe('with "rule" source filter', () => {
    const ruleFilter = new Set<SourceFilter>(['rule']);

    test('returns only Rule-sourced rows', async () => {
      const hits = buildMixedHits();
      const all = await fetchAllPages(hits, { pageSize: 10, activeFilters: ruleFilter });

      expect(all).toHaveLength(10);
      expect(
        all.every((r) => r.sourceType === 'live' && 'source' in r && r.source === 'Rule')
      ).toBe(true);
    });

    test('pagination works when Rule rows span multiple pages', async () => {
      const hits = buildMixedHits();
      const page1 = await fetchPage(hits, { pageSize: 5, activeFilters: ruleFilter });

      expect(page1.rows).toHaveLength(5);
      expect(page1.hasMore).toBe(true);

      const page2 = await fetchPage(hits, {
        pageSize: 5,
        activeFilters: ruleFilter,
        nextPage: page1.nextPageToken,
      });

      expect(page2.rows).toHaveLength(5);
      expect(page2.hasMore).toBe(false);

      // no duplicates between pages
      const page1Ids = new Set(page1.rows.map((r) => r.id));
      const hasDuplicates = page2.rows.some((r) => page1Ids.has(r.id));
      expect(hasDuplicates).toBe(false);
    });
  });

  describe('with "live" source filter', () => {
    const liveFilter = new Set<SourceFilter>(['live']);

    test('returns only Live-sourced rows', async () => {
      const hits = buildMixedHits();
      const all = await fetchAllPages(hits, { pageSize: 10, activeFilters: liveFilter });

      expect(all).toHaveLength(15);
      expect(
        all.every((r) => r.sourceType === 'live' && 'source' in r && r.source === 'Live')
      ).toBe(true);
    });

    test('pagination works when Live rows span multiple pages', async () => {
      const hits = buildMixedHits();

      const page1 = await fetchPage(hits, { pageSize: 10, activeFilters: liveFilter });
      expect(page1.rows).toHaveLength(10);
      expect(page1.hasMore).toBe(true);

      const page2 = await fetchPage(hits, {
        pageSize: 10,
        activeFilters: liveFilter,
        nextPage: page1.nextPageToken,
      });
      expect(page2.rows).toHaveLength(5);
      expect(page2.hasMore).toBe(false);
    });

    test('no rows are lost or duplicated across pages', async () => {
      const hits = buildMixedHits();
      const all = await fetchAllPages(hits, { pageSize: 7, activeFilters: liveFilter });
      const ids = all.map((r) => r.id);

      // no duplicates
      expect(new Set(ids).size).toBe(ids.length);
      // all 15 Live rows collected
      expect(ids).toHaveLength(15);
    });
  });

  describe('with "live" + "rule" source filter (both)', () => {
    const bothFilter = new Set<SourceFilter>(['live', 'rule']);

    test('returns all live action rows (both Live and Rule)', async () => {
      const hits = buildMixedHits();
      const all = await fetchAllPages(hits, { pageSize: 10, activeFilters: bothFilter });

      expect(all).toHaveLength(25);
    });

    test('pagination works identically to unfiltered for live-only data', async () => {
      const hits = buildMixedHits();
      const page1 = await fetchPage(hits, { pageSize: 10, activeFilters: bothFilter });

      expect(page1.rows).toHaveLength(10);
      expect(page1.hasMore).toBe(true);
    });
  });

  test.each([
    { selected: ['workflow'], expected: ['Workflow'] },
    { selected: ['live'], expected: ['Live'] },
    { selected: ['rule'], expected: ['Rule'] },
    { selected: ['live', 'rule'], expected: ['Live', 'Rule'] },
    { selected: ['live', 'workflow'], expected: ['Live', 'Workflow'] },
    { selected: ['rule', 'workflow'], expected: ['Rule', 'Workflow'] },
    { selected: ['live', 'rule', 'workflow'], expected: ['Live', 'Rule', 'Workflow'] },
  ])(
    'paginates $selected without losing, duplicating or leaking sources',
    async ({ selected, expected }) => {
      const hits = Array.from({ length: 32 }, (_, index) =>
        createHit(`mixed-${index}`, {
          workflow: index % 4 >= 2,
          alertIds: index % 2 === 1 ? ['alert-1'] : undefined,
        })
      );
      const rows = await fetchAllPages(hits, {
        pageSize: 3,
        activeFilters: new Set(selected as SourceFilter[]),
      });
      const expectedIds = hits
        .filter((_, index) =>
          expected.includes(index % 4 >= 2 ? 'Workflow' : index % 2 === 1 ? 'Rule' : 'Live')
        )
        .map((hit) => hit._source?.action_id);
      expect(rows.map((row) => row.id)).toEqual(expectedIds);
      expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
      expect(rows.every((row) => expected.includes(row.source))).toBe(true);
    }
  );

  describe('edge cases', () => {
    test('single row matching filter: hasMore is false, one row returned', async () => {
      const hits = [createHit('only-rule', { alertIds: ['a'] })];
      const ruleFilter = new Set<SourceFilter>(['rule']);
      const page = await fetchPage(hits, { pageSize: 10, activeFilters: ruleFilter });

      expect(page.rows).toHaveLength(1);
      expect(page.hasMore).toBe(false);
    });

    test('no rows matching filter: empty page, hasMore is false', async () => {
      // all hits are Rule-sourced, but we filter for Live only
      const hits = [createHit('r1', { alertIds: ['a'] }), createHit('r2', { alertIds: ['a'] })];
      const liveFilter = new Set<SourceFilter>(['live']);
      const page = await fetchPage(hits, { pageSize: 10, activeFilters: liveFilter });

      expect(page.rows).toHaveLength(0);
      expect(page.hasMore).toBe(false);
    });

    test('exact pageSize rows matching: hasMore is false', async () => {
      // exactly 10 Rule hits, pageSize=10
      const hits = Array.from({ length: 10 }, (_, i) => createHit(`r-${i}`, { alertIds: ['a'] }));
      const ruleFilter = new Set<SourceFilter>(['rule']);
      const page = await fetchPage(hits, { pageSize: 10, activeFilters: ruleFilter });

      expect(page.rows).toHaveLength(10);
      expect(page.hasMore).toBe(false);
    });

    test('pageSize + 1 rows matching: hasMore is true, exactly pageSize rows returned', async () => {
      const hits = Array.from({ length: 11 }, (_, i) => createHit(`r-${i}`, { alertIds: ['a'] }));
      const ruleFilter = new Set<SourceFilter>(['rule']);
      const page = await fetchPage(hits, { pageSize: 10, activeFilters: ruleFilter });

      expect(page.rows).toHaveLength(10);
      expect(page.hasMore).toBe(true);
    });

    test('deeply paginated: cursor traversal reaches all rows without loss', async () => {
      // 47 Live rows, pageSize 5 → 10 pages (9 full + 1 partial)
      const hits = Array.from({ length: 47 }, (_, i) => createHit(`live-${i}`));
      const liveFilter = new Set<SourceFilter>(['live']);
      const all = await fetchAllPages(hits, { pageSize: 5, activeFilters: liveFilter });

      expect(all).toHaveLength(47);
      expect(new Set(all.map((r) => r.id)).size).toBe(47);
    });
  });
});
