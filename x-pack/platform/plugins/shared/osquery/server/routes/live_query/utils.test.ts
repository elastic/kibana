/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { getActionResponses } from './utils';
import type { ActionResultsStrategyResponse } from '../../../common/search_strategy';

describe('getActionResponses', () => {
  const createMockSearchClient = (
    mockResponse: Partial<ActionResultsStrategyResponse>
  ): IScopedSearchClient =>
    ({
      search: jest.fn().mockReturnValue(of(mockResponse)),
    } as unknown as IScopedSearchClient);

  describe('legacy mode (no hybrid data)', () => {
    it('should calculate aggregations from Fleet responses only', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 80,
                rows_count: {
                  value: 2500,
                },
                responses: {
                  buckets: [
                    { key: 'success', doc_count: 75 },
                    { key: 'error', doc_count: 5 },
                  ],
                },
              },
            },
          },
        } as any,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-123', 100);
      const result = await result$.toPromise();

      expect(result).toEqual({
        action_id: 'action-123',
        docs: 2500,
        failed: 5,
        pending: 20, // 100 - 80 responded
        responded: 80,
        successful: 75,
      });
    });

    it('should handle all agents responding successfully', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 100,
                rows_count: {
                  value: 5000,
                },
                responses: {
                  buckets: [{ key: 'success', doc_count: 100 }],
                },
              },
            },
          },
        } as any,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-456', 100);
      const result = await result$.toPromise();

      expect(result).toEqual({
        action_id: 'action-456',
        docs: 5000,
        failed: 0,
        pending: 0,
        responded: 100,
        successful: 100,
      });
    });

    it('should handle all agents failing', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 50,
                rows_count: {
                  value: 0,
                },
                responses: {
                  buckets: [{ key: 'error', doc_count: 50 }],
                },
              },
            },
          },
        } as any,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-789', 50);
      const result = await result$.toPromise();

      expect(result).toEqual({
        action_id: 'action-789',
        docs: 0,
        failed: 50,
        pending: 0,
        responded: 50,
        successful: 0,
      });
    });

    it('should handle no responses yet (all pending)', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 0,
                rows_count: {
                  value: 0,
                },
                responses: {
                  buckets: [],
                },
              },
            },
          },
        } as any,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-pending', 200);
      const result = await result$.toPromise();

      expect(result).toEqual({
        action_id: 'action-pending',
        docs: 0,
        failed: 0,
        pending: 200,
        responded: 0,
        successful: 0,
      });
    });

    it('should handle missing aggregations gracefully', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {} as any,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-no-aggs', 50);
      const result = await result$.toPromise();

      expect(result).toEqual({
        action_id: 'action-no-aggs',
        docs: 0,
        failed: 0,
        pending: 50,
        responded: 0,
        successful: 0,
      });
    });

    it('should handle integration namespaces parameter', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 25,
                rows_count: {
                  value: 1000,
                },
                responses: {
                  buckets: [{ key: 'success', doc_count: 25 }],
                },
              },
            },
          },
        } as any,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-ns', 50, ['prod', 'staging']);
      const result = await result$.toPromise();

      expect(result).toEqual({
        action_id: 'action-ns',
        docs: 1000,
        failed: 0,
        pending: 25,
        responded: 25,
        successful: 25,
      });

      expect(search.search).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationNamespaces: ['prod', 'staging'],
        }),
        expect.any(Object)
      );
    });
  });

  describe('hybrid mode (with results index data)', () => {
    it('should combine Fleet and results index data', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 70,
                rows_count: {
                  value: 2000,
                },
                responses: {
                  buckets: [
                    { key: 'success', doc_count: 65 },
                    { key: 'error', doc_count: 5 },
                  ],
                },
                unique_agent_ids: {
                  buckets: Array.from({ length: 70 }, (_, i) => ({
                    key: `fleet-agent-${i}`,
                    doc_count: 1,
                  })),
                },
              },
            },
          },
        } as any,
        resultsAgentIds: new Set([
          ...Array.from({ length: 70 }, (_, i) => `fleet-agent-${i}`), // Fleet agents
          'inferred-agent-1',
          'inferred-agent-2',
          'inferred-agent-3',
        ]),
        resultsTotalDocs: 2500,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-hybrid', 100);
      const result = await result$.toPromise();

      expect(result).toEqual({
        action_id: 'action-hybrid',
        docs: 2500, // From results index
        failed: 5,
        pending: 27, // 100 - 73 total responded
        responded: 73, // 70 Fleet + 3 inferred
        successful: 68, // 65 Fleet + 3 inferred
      });
    });

    it('should identify inferred successful agents (results but no Fleet response)', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 50,
                rows_count: {
                  value: 1500,
                },
                responses: {
                  buckets: [{ key: 'success', doc_count: 50 }],
                },
                unique_agent_ids: {
                  buckets: Array.from({ length: 50 }, (_, i) => ({
                    key: `fleet-agent-${i}`,
                    doc_count: 1,
                  })),
                },
              },
            },
          },
        } as any,
        resultsAgentIds: new Set([
          ...Array.from({ length: 50 }, (_, i) => `fleet-agent-${i}`),
          'silent-agent-1',
          'silent-agent-2',
          'silent-agent-3',
          'silent-agent-4',
          'silent-agent-5',
        ]),
        resultsTotalDocs: 2000,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-inferred', 100);
      const result = await result$.toPromise();

      expect(result).toEqual({
        action_id: 'action-inferred',
        docs: 2000,
        failed: 0,
        pending: 45, // 100 - 55 total responded
        responded: 55, // 50 Fleet + 5 inferred
        successful: 55, // 50 Fleet + 5 inferred
      });
    });

    it('should handle case where all agents only in results index (no Fleet responses)', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 0,
                rows_count: {
                  value: 0,
                },
                responses: {
                  buckets: [],
                },
                unique_agent_ids: {
                  buckets: [],
                },
              },
            },
          },
        } as any,
        resultsAgentIds: new Set(Array.from({ length: 100 }, (_, i) => `result-agent-${i}`)),
        resultsTotalDocs: 5000,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-results-only', 100);
      const result = await result$.toPromise();

      expect(result).toEqual({
        action_id: 'action-results-only',
        docs: 5000,
        failed: 0,
        pending: 0, // All 100 agents inferred successful
        responded: 100,
        successful: 100, // All inferred
      });
    });

    it('should prioritize results index total docs over Fleet rows_count', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 80,
                rows_count: {
                  value: 2000, // Fleet says 2000
                },
                responses: {
                  buckets: [{ key: 'success', doc_count: 80 }],
                },
                unique_agent_ids: {
                  buckets: Array.from({ length: 80 }, (_, i) => ({
                    key: `agent-${i}`,
                    doc_count: 1,
                  })),
                },
              },
            },
          },
        } as any,
        resultsAgentIds: new Set(Array.from({ length: 80 }, (_, i) => `agent-${i}`)),
        resultsTotalDocs: 2500, // Results index says 2500 (source of truth)
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-docs-priority', 100);
      const result = await result$.toPromise();

      expect(result.docs).toBe(2500); // Should use results index value
    });

    it('should handle hybrid mode with Fleet errors and inferred successful', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 60,
                rows_count: {
                  value: 1000,
                },
                responses: {
                  buckets: [
                    { key: 'success', doc_count: 50 },
                    { key: 'error', doc_count: 10 },
                  ],
                },
                unique_agent_ids: {
                  buckets: Array.from({ length: 60 }, (_, i) => ({
                    key: `fleet-agent-${i}`,
                    doc_count: 1,
                  })),
                },
              },
            },
          },
        } as any,
        resultsAgentIds: new Set([
          ...Array.from({ length: 60 }, (_, i) => `fleet-agent-${i}`),
          'inferred-1',
          'inferred-2',
        ]),
        resultsTotalDocs: 1200,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-mixed', 100);
      const result = await result$.toPromise();

      expect(result).toEqual({
        action_id: 'action-mixed',
        docs: 1200,
        failed: 10, // Only from Fleet
        pending: 38, // 100 - 62 total responded
        responded: 62, // 60 Fleet + 2 inferred
        successful: 52, // 50 Fleet + 2 inferred
      });
    });

    it('should handle large scale deployment (15k+ agents)', async () => {
      const fleetAgentIds = Array.from({ length: 10000 }, (_, i) => `fleet-${i}`);
      const inferredAgentIds = Array.from({ length: 5000 }, (_, i) => `inferred-${i}`);

      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 10000,
                rows_count: {
                  value: 50000,
                },
                responses: {
                  buckets: [
                    { key: 'success', doc_count: 9500 },
                    { key: 'error', doc_count: 500 },
                  ],
                },
                unique_agent_ids: {
                  buckets: fleetAgentIds.map((id) => ({ key: id, doc_count: 1 })),
                },
              },
            },
          },
        } as any,
        resultsAgentIds: new Set([...fleetAgentIds, ...inferredAgentIds]),
        resultsTotalDocs: 75000,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-scale', 20000);
      const result = await result$.toPromise();

      expect(result).toEqual({
        action_id: 'action-scale',
        docs: 75000,
        failed: 500,
        pending: 5000, // 20000 - 15000 responded
        responded: 15000, // 10000 Fleet + 5000 inferred
        successful: 14500, // 9500 Fleet + 5000 inferred
      });
    });

    it('should handle empty results index data in hybrid mode', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 50,
                rows_count: {
                  value: 1500,
                },
                responses: {
                  buckets: [{ key: 'success', doc_count: 50 }],
                },
                unique_agent_ids: {
                  buckets: Array.from({ length: 50 }, (_, i) => ({
                    key: `agent-${i}`,
                    doc_count: 1,
                  })),
                },
              },
            },
          },
        } as any,
        resultsAgentIds: new Set<string>(), // Empty results
        resultsTotalDocs: 0,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-no-results', 100);
      const result = await result$.toPromise();

      expect(result).toEqual({
        action_id: 'action-no-results',
        docs: 0, // Results index says 0
        failed: 0,
        pending: 50,
        responded: 50, // Only Fleet responses
        successful: 50,
      });
    });

    it('should ensure pending never goes negative', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 60,
                rows_count: {
                  value: 2000,
                },
                responses: {
                  buckets: [{ key: 'success', doc_count: 60 }],
                },
                unique_agent_ids: {
                  buckets: Array.from({ length: 60 }, (_, i) => ({
                    key: `agent-${i}`,
                    doc_count: 1,
                  })),
                },
              },
            },
          },
        } as any,
        resultsAgentIds: new Set([
          ...Array.from({ length: 60 }, (_, i) => `agent-${i}`),
          ...Array.from({ length: 50 }, (_, i) => `extra-${i}`),
        ]),
        resultsTotalDocs: 3000,
      };

      const search = createMockSearchClient(mockResponse);
      // Only 50 agents targeted, but 110 responded (shouldn't happen, but handle gracefully)
      const result$ = getActionResponses(search, 'action-overflow', 50);
      const result = await result$.toPromise();

      expect(result.pending).toBe(0); // Should be 0, not negative
      expect(result.responded).toBe(110);
    });
  });

  describe('edge cases', () => {
    it('should handle single agent deployment', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 1,
                rows_count: {
                  value: 50,
                },
                responses: {
                  buckets: [{ key: 'success', doc_count: 1 }],
                },
              },
            },
          },
        } as any,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-single', 1);
      const result = await result$.toPromise();

      expect(result).toEqual({
        action_id: 'action-single',
        docs: 50,
        failed: 0,
        pending: 0,
        responded: 1,
        successful: 1,
      });
    });

    it('should handle zero agents (edge case)', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 0,
                rows_count: {
                  value: 0,
                },
                responses: {
                  buckets: [],
                },
              },
            },
          },
        } as any,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-zero', 0);
      const result = await result$.toPromise();

      expect(result).toEqual({
        action_id: 'action-zero',
        docs: 0,
        failed: 0,
        pending: 0,
        responded: 0,
        successful: 0,
      });
    });

    it('should handle missing rows_count in aggregation', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 25,
                responses: {
                  buckets: [{ key: 'success', doc_count: 25 }],
                },
                // rows_count is missing
              },
            },
          },
        } as any,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-no-rows', 50);
      const result = await result$.toPromise();

      expect(result.docs).toBe(0);
    });

    it('should handle missing success bucket', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 10,
                rows_count: {
                  value: 0,
                },
                responses: {
                  buckets: [{ key: 'error', doc_count: 10 }],
                  // No success bucket
                },
              },
            },
          },
        } as any,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-no-success', 50);
      const result = await result$.toPromise();

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(10);
    });

    it('should handle missing error bucket', async () => {
      const mockResponse: Partial<ActionResultsStrategyResponse> = {
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 40,
                rows_count: {
                  value: 2000,
                },
                responses: {
                  buckets: [{ key: 'success', doc_count: 40 }],
                  // No error bucket
                },
              },
            },
          },
        } as any,
      };

      const search = createMockSearchClient(mockResponse);
      const result$ = getActionResponses(search, 'action-no-error', 50);
      const result = await result$.toPromise();

      expect(result.successful).toBe(40);
      expect(result.failed).toBe(0);
    });
  });
});
