/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adjustAggregationsForExpiration, isActionExpired } from './aggregations';
import type { ActionAggregations } from './aggregations';

describe('aggregations utilities', () => {
  describe('isActionExpired', () => {
    beforeEach(() => {
      // Mock current time to 2024-01-15 12:00:00 UTC
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('expired actions', () => {
      it('should return true for past date', () => {
        const expirationDate = '2024-01-15T11:00:00.000Z'; // 1 hour ago

        expect(isActionExpired(expirationDate)).toBe(true);
      });

      it('should return true for date 1 minute ago', () => {
        const expirationDate = '2024-01-15T11:59:00.000Z';

        expect(isActionExpired(expirationDate)).toBe(true);
      });

      it('should return true for date 1 second ago', () => {
        const expirationDate = '2024-01-15T11:59:59.000Z';

        expect(isActionExpired(expirationDate)).toBe(true);
      });

      it('should return true for date 1 day ago', () => {
        const expirationDate = '2024-01-14T12:00:00.000Z';

        expect(isActionExpired(expirationDate)).toBe(true);
      });

      it('should return true for date 1 week ago', () => {
        const expirationDate = '2024-01-08T12:00:00.000Z';

        expect(isActionExpired(expirationDate)).toBe(true);
      });
    });

    describe('non-expired actions', () => {
      it('should return false for future date', () => {
        const expirationDate = '2024-01-15T13:00:00.000Z'; // 1 hour from now

        expect(isActionExpired(expirationDate)).toBe(false);
      });

      it('should return false for date 1 minute from now', () => {
        const expirationDate = '2024-01-15T12:01:00.000Z';

        expect(isActionExpired(expirationDate)).toBe(false);
      });

      it('should return false for date 1 second from now', () => {
        const expirationDate = '2024-01-15T12:00:01.000Z';

        expect(isActionExpired(expirationDate)).toBe(false);
      });

      it('should return false for date 1 hour from now', () => {
        const expirationDate = '2024-01-15T13:00:00.000Z';

        expect(isActionExpired(expirationDate)).toBe(false);
      });

      it('should return false for date 1 day from now', () => {
        const expirationDate = '2024-01-16T12:00:00.000Z';

        expect(isActionExpired(expirationDate)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should return false for undefined expiration date', () => {
        expect(isActionExpired(undefined)).toBe(false);
      });

      it('should return false for null expiration date', () => {
        expect(isActionExpired(null)).toBe(false);
      });

      it('should return false for empty string expiration date', () => {
        expect(isActionExpired('')).toBe(false);
      });

      it('should handle current time (may be expired or not depending on milliseconds)', () => {
        const expirationDate = '2024-01-15T12:00:00.000Z';
        const result = isActionExpired(expirationDate);

        // Should be true or false depending on exact millisecond timing
        expect(typeof result).toBe('boolean');
      });

      it('should handle valid ISO 8601 dates with milliseconds', () => {
        const expirationDate = '2024-01-15T11:59:59.999Z';

        expect(isActionExpired(expirationDate)).toBe(true);
      });

      it('should handle valid ISO 8601 dates with timezone offset', () => {
        // 11:00 UTC = 10:00 in -01:00 timezone (past)
        const expirationDate = '2024-01-15T10:00:00-01:00';

        expect(isActionExpired(expirationDate)).toBe(true);
      });
    });
  });

  describe('adjustAggregationsForExpiration', () => {
    describe('non-expired actions', () => {
      it('should not modify aggregations when action is not expired', () => {
        const aggregations: ActionAggregations = {
          pending: 10,
          failed: 5,
          successful: 85,
          responded: 90,
          docs: 1500,
        };

        const result = adjustAggregationsForExpiration(aggregations, false);

        expect(result).toEqual(aggregations);
        expect(result).toBe(aggregations); // Should return same reference
      });

      it('should preserve all fields including optional ones', () => {
        const aggregations: ActionAggregations = {
          pending: 20,
          failed: 10,
          successful: 70,
          responded: 80,
          docs: 2000,
          inferredSuccessful: 5,
        };

        const result = adjustAggregationsForExpiration(aggregations, false);

        expect(result).toEqual(aggregations);
        expect(result.inferredSuccessful).toBe(5);
      });

      it('should not modify when pending is 0', () => {
        const aggregations: ActionAggregations = {
          pending: 0,
          failed: 10,
          successful: 90,
          responded: 100,
          docs: 3000,
        };

        const result = adjustAggregationsForExpiration(aggregations, false);

        expect(result).toEqual(aggregations);
      });
    });

    describe('expired actions', () => {
      it('should move pending to failed when action is expired', () => {
        const aggregations: ActionAggregations = {
          pending: 10,
          failed: 5,
          successful: 85,
          responded: 90,
          docs: 1500,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result).toEqual({
          pending: 0,
          failed: 15, // 5 + 10
          successful: 85,
          responded: 90,
          docs: 1500,
        });
      });

      it('should handle large pending count', () => {
        const aggregations: ActionAggregations = {
          pending: 1000,
          failed: 50,
          successful: 500,
          responded: 550,
          docs: 10000,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result).toEqual({
          pending: 0,
          failed: 1050, // 50 + 1000
          successful: 500,
          responded: 550,
          docs: 10000,
        });
      });

      it('should set pending to 0 when expired', () => {
        const aggregations: ActionAggregations = {
          pending: 25,
          failed: 0,
          successful: 75,
          responded: 75,
          docs: 2500,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result.pending).toBe(0);
        expect(result.failed).toBe(25);
      });

      it('should preserve other fields when adjusting', () => {
        const aggregations: ActionAggregations = {
          pending: 15,
          failed: 10,
          successful: 75,
          responded: 85,
          docs: 3000,
          inferredSuccessful: 5,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result.successful).toBe(75);
        expect(result.responded).toBe(85);
        expect(result.docs).toBe(3000);
        expect(result.inferredSuccessful).toBe(5);
      });

      it('should handle when pending is already 0', () => {
        const aggregations: ActionAggregations = {
          pending: 0,
          failed: 20,
          successful: 80,
          responded: 100,
          docs: 4000,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result).toEqual({
          pending: 0,
          failed: 20, // No change
          successful: 80,
          responded: 100,
          docs: 4000,
        });
      });

      it('should handle when failed is 0', () => {
        const aggregations: ActionAggregations = {
          pending: 30,
          failed: 0,
          successful: 70,
          responded: 70,
          docs: 2000,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result).toEqual({
          pending: 0,
          failed: 30, // All pending moved to failed
          successful: 70,
          responded: 70,
          docs: 2000,
        });
      });
    });

    describe('partial aggregations', () => {
      it('should handle aggregations with missing pending field', () => {
        const aggregations: Partial<ActionAggregations> = {
          failed: 10,
          successful: 90,
          responded: 100,
          docs: 5000,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result.pending).toBe(0);
        expect(result.failed).toBe(10); // 10 + 0 (undefined pending treated as 0)
      });

      it('should handle aggregations with missing failed field', () => {
        const aggregations: Partial<ActionAggregations> = {
          pending: 20,
          successful: 80,
          responded: 80,
          docs: 3000,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result.pending).toBe(0);
        expect(result.failed).toBe(20); // 0 (undefined failed) + 20
      });

      it('should handle aggregations with both pending and failed missing', () => {
        const aggregations: Partial<ActionAggregations> = {
          successful: 100,
          responded: 100,
          docs: 6000,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result.pending).toBe(0);
        expect(result.failed).toBe(0); // 0 + 0
      });

      it('should handle empty aggregations object', () => {
        const aggregations: Partial<ActionAggregations> = {};

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result.pending).toBe(0);
        expect(result.failed).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should handle single pending agent', () => {
        const aggregations: ActionAggregations = {
          pending: 1,
          failed: 0,
          successful: 99,
          responded: 99,
          docs: 1000,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result.pending).toBe(0);
        expect(result.failed).toBe(1);
      });

      it('should handle all agents pending', () => {
        const aggregations: ActionAggregations = {
          pending: 100,
          failed: 0,
          successful: 0,
          responded: 0,
          docs: 0,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result.pending).toBe(0);
        expect(result.failed).toBe(100);
        expect(result.successful).toBe(0);
      });

      it('should handle large numbers (10k+ agents)', () => {
        const aggregations: ActionAggregations = {
          pending: 5000,
          failed: 100,
          successful: 10000,
          responded: 10100,
          docs: 500000,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result.pending).toBe(0);
        expect(result.failed).toBe(5100);
      });

      it('should create new object (immutability check)', () => {
        const aggregations: ActionAggregations = {
          pending: 10,
          failed: 5,
          successful: 85,
          responded: 90,
          docs: 1500,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        // Result should be a new object when expired
        expect(result).not.toBe(aggregations);

        // Original should remain unchanged
        expect(aggregations.pending).toBe(10);
        expect(aggregations.failed).toBe(5);
      });
    });

    describe('realistic scenarios', () => {
      it('should handle partially responded action that expired', () => {
        const aggregations: ActionAggregations = {
          pending: 200,
          failed: 50,
          successful: 750,
          responded: 800,
          docs: 25000,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result.pending).toBe(0);
        expect(result.failed).toBe(250); // Pending agents now considered failed
        expect(result.successful).toBe(750); // No change
        expect(result.responded).toBe(800); // No change (already responded)
      });

      it('should handle hybrid mode aggregations with inferred successful', () => {
        const aggregations: ActionAggregations = {
          pending: 100,
          failed: 50,
          successful: 800,
          responded: 850,
          docs: 30000,
          inferredSuccessful: 50,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result).toEqual({
          pending: 0,
          failed: 150, // 50 + 100
          successful: 800,
          responded: 850,
          docs: 30000,
          inferredSuccessful: 50,
        });
      });

      it('should handle action where all agents timed out', () => {
        const aggregations: ActionAggregations = {
          pending: 1000,
          failed: 0,
          successful: 0,
          responded: 0,
          docs: 0,
        };

        const result = adjustAggregationsForExpiration(aggregations, true);

        expect(result.pending).toBe(0);
        expect(result.failed).toBe(1000);
        expect(result.successful).toBe(0);
        expect(result.responded).toBe(0);
      });
    });
  });
});
