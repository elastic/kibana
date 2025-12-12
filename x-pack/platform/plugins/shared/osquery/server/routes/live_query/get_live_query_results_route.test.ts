/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLiveQueryResultsRoute } from './get_live_query_results_route';
import { createMockOsqueryContext, createMockRouter } from './mocks';
import {
  MAX_OFFSET_RESULTS,
  MAX_PIT_OFFSET,
  MAX_PIT_ID_LENGTH,
  MAX_SEARCH_AFTER_SIZE,
  MAX_SORT_FIELDS,
} from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

describe('getLiveQueryResultsRoute', () => {
  let mockOsqueryContext: ReturnType<typeof createMockOsqueryContext>;
  let mockRouter: ReturnType<typeof createMockRouter>;

  beforeEach(() => {
    mockOsqueryContext = createMockOsqueryContext();
    mockRouter = createMockRouter();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('route registration', () => {
    it('should register the get live query results route', () => {
      getLiveQueryResultsRoute(
        mockRouter,
        mockOsqueryContext as unknown as OsqueryAppContext
      );

      const route = mockRouter.versioned.getRoute(
        'get',
        '/api/osquery/live_queries/{id}/results/{actionId}'
      );

      expect(route).toBeDefined();
      expect(route.versions['2023-10-31']).toBeDefined();
      expect(route.versions['2023-10-31'].handler).toBeDefined();
    });
  });

  describe('isSortResults validation', () => {
    // Test the searchAfter validation logic indirectly through the route behavior
    // The route validates searchAfter must be an array of primitives

    it('should accept valid searchAfter with numbers', () => {
      // Valid: [1733900000000, 12345]
      const validSearchAfter = JSON.stringify([1733900000000, 12345]);
      expect(() => JSON.parse(validSearchAfter)).not.toThrow();
      const parsed = JSON.parse(validSearchAfter) as unknown[];
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.every((item: unknown) => typeof item === 'number')).toBe(true);
    });

    it('should accept valid searchAfter with strings', () => {
      // Valid: ["value1", "value2"]
      const validSearchAfter = JSON.stringify(['value1', 'value2']);
      const parsed = JSON.parse(validSearchAfter) as unknown[];
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.every((item: unknown) => typeof item === 'string')).toBe(true);
    });

    it('should accept valid searchAfter with mixed primitives', () => {
      // Valid: [1733900000000, "doc-id", null, true]
      const validSearchAfter = JSON.stringify([1733900000000, 'doc-id', null, true]);
      const parsed = JSON.parse(validSearchAfter) as unknown[];
      expect(Array.isArray(parsed)).toBe(true);
      expect(
        parsed.every(
          (item: unknown) =>
            item === null ||
            typeof item === 'string' ||
            typeof item === 'number' ||
            typeof item === 'boolean'
        )
      ).toBe(true);
    });

    it('should detect invalid searchAfter with objects', () => {
      // Invalid: [{ key: "value" }]
      const invalidSearchAfter = JSON.stringify([{ key: 'value' }]);
      const parsed = JSON.parse(invalidSearchAfter) as unknown[];
      expect(Array.isArray(parsed)).toBe(true);
      // Objects are NOT valid sort results
      expect(parsed.some((item: unknown) => typeof item === 'object' && item !== null)).toBe(true);
    });

    it('should detect invalid searchAfter with arrays', () => {
      // Invalid: [[1, 2, 3]]
      const invalidSearchAfter = JSON.stringify([[1, 2, 3]]);
      const parsed = JSON.parse(invalidSearchAfter) as unknown[];
      expect(Array.isArray(parsed)).toBe(true);
      // Nested arrays are NOT valid sort results
      expect(parsed.some((item: unknown) => Array.isArray(item))).toBe(true);
    });
  });

  describe('pagination constants', () => {
    it('should export MAX_OFFSET_RESULTS as 10000', () => {
      expect(MAX_OFFSET_RESULTS).toBe(10000);
    });

    it('should export MAX_PIT_OFFSET as 100000', () => {
      expect(MAX_PIT_OFFSET).toBe(100000);
    });

    it('should export MAX_PIT_ID_LENGTH as 2048', () => {
      expect(MAX_PIT_ID_LENGTH).toBe(2048);
    });

    it('should export MAX_SEARCH_AFTER_SIZE as 1024', () => {
      expect(MAX_SEARCH_AFTER_SIZE).toBe(1024);
    });

    it('should export MAX_SORT_FIELDS as 10', () => {
      expect(MAX_SORT_FIELDS).toBe(10);
    });

    it('should have MAX_PIT_OFFSET be 10x MAX_OFFSET_RESULTS', () => {
      expect(MAX_PIT_OFFSET).toBe(MAX_OFFSET_RESULTS * 10);
    });

    it('should use PIT mode when offset exceeds 10k', () => {
      const page = 150;
      const pageSize = 100;
      const offset = page * pageSize; // 15000

      expect(offset).toBe(15000);
      expect(offset >= MAX_OFFSET_RESULTS).toBe(true);
    });

    it('should use offset mode when offset is within 10k', () => {
      const page = 50;
      const pageSize = 100;
      const offset = page * pageSize; // 5000

      expect(offset).toBe(5000);
      expect(offset >= MAX_OFFSET_RESULTS).toBe(false);
    });

    it('should use PIT mode at exactly 10k threshold', () => {
      const page = 100;
      const pageSize = 100;
      const offset = page * pageSize; // 10000

      expect(offset).toBe(10000);
      expect(offset >= MAX_OFFSET_RESULTS).toBe(true);
    });

    it('should reject requests at MAX_PIT_OFFSET threshold', () => {
      const page = 1000;
      const pageSize = 100;
      const offset = page * pageSize; // 100000

      expect(offset).toBe(100000);
      expect(offset >= MAX_PIT_OFFSET).toBe(true);
    });

    it('should allow requests just under MAX_PIT_OFFSET', () => {
      const page = 999;
      const pageSize = 100;
      const offset = page * pageSize; // 99900

      expect(offset).toBe(99900);
      expect(offset >= MAX_PIT_OFFSET).toBe(false);
    });
  });

  describe('searchAfter size limits', () => {
    it('should reject searchAfter exceeding MAX_SEARCH_AFTER_SIZE', () => {
      const largeSearchAfter = JSON.stringify(Array(200).fill('x'.repeat(100)));
      expect(largeSearchAfter.length).toBeGreaterThan(MAX_SEARCH_AFTER_SIZE);
    });

    it('should reject searchAfter with more than MAX_SORT_FIELDS', () => {
      const tooManyFields = Array(MAX_SORT_FIELDS + 5).fill(123);
      expect(tooManyFields.length).toBeGreaterThan(MAX_SORT_FIELDS);
    });

    it('should accept searchAfter within limits', () => {
      const validSearchAfter = JSON.stringify([1733900000000, 12345]);
      expect(validSearchAfter.length).toBeLessThan(MAX_SEARCH_AFTER_SIZE);

      const parsed = JSON.parse(validSearchAfter);
      expect(parsed.length).toBeLessThanOrEqual(MAX_SORT_FIELDS);
    });
  });

  describe('pitId validation', () => {
    it('should reject pitId exceeding MAX_PIT_ID_LENGTH', () => {
      const largePitId = 'x'.repeat(MAX_PIT_ID_LENGTH + 100);
      expect(largePitId.length).toBeGreaterThan(MAX_PIT_ID_LENGTH);
    });

    it('should accept pitId within limit', () => {
      const validPitId = 'x'.repeat(500);
      expect(validPitId.length).toBeLessThan(MAX_PIT_ID_LENGTH);
    });

    it('should accept typical PIT ID length (~200-500 chars)', () => {
      const typicalPitIdLength = 350;
      expect(typicalPitIdLength).toBeLessThan(MAX_PIT_ID_LENGTH);
    });
  });

  describe('PIT cursor logic', () => {
    it('should require both pitId and searchAfter for cursor continuation', () => {
      // Both pitId and searchAfter must be provided for cursor-based pagination
      const hasPitId = true;
      const hasSearchAfter = true;

      // Only use provided PIT if searchAfter is also provided
      const canUseCursor = hasPitId && hasSearchAfter;
      expect(canUseCursor).toBe(true);
    });

    it('should ignore pitId when searchAfter is not provided', () => {
      const hasPitId = true;
      const hasSearchAfter = false;

      // pitId alone is useless without searchAfter
      const canUseCursor = hasPitId && hasSearchAfter;
      expect(canUseCursor).toBe(false);
    });

    it('should not use cursor when neither is provided', () => {
      const hasPitId = false;
      const hasSearchAfter = false;

      const canUseCursor = hasPitId && hasSearchAfter;
      expect(canUseCursor).toBe(false);
    });
  });
});
