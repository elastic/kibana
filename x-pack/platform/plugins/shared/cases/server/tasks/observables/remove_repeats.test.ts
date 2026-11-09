/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { CASE_OBSERVABLE_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import { removeRepeatedObservables } from './remove_repeats';

const response = ({
  hits = [],
  total,
  aggregations,
}: {
  hits?: Array<Record<string, unknown>>;
  total?: number;
  aggregations?: unknown;
}) => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0, skipped: 0 },
  hits: { hits, ...(total != null && { total: { value: total, relation: 'eq' } }) },
  ...(aggregations != null && { aggregations }),
});

const observableHit = (id: string) => ({ _id: `${CASE_OBSERVABLE_SAVED_OBJECT}:${id}` });

describe('removeRepeatedObservables', () => {
  const savedObjectsClient = savedObjectsClientMock.create();
  const logger = loggingSystemMock.createLogger();

  const mockSearches = ({
    caseIds,
    fieldObservables = [],
    storedTotal = null,
    typeRepeats = [],
    fieldRepeats = [],
    typeCount,
  }: {
    caseIds: string[];
    fieldObservables?: Array<{ typeKey: string; value: string }>;
    storedTotal?: number | null;
    typeRepeats?: string[][];
    fieldRepeats?: string[];
    typeCount: number;
  }) => {
    savedObjectsClient.search.mockImplementation(async (request) => {
      const {
        type,
        aggs,
        track_total_hits: trackTotalHits,
      } = request as estypes.SearchRequest & {
        type: string;
      };

      if (type === CASE_SAVED_OBJECT) {
        return response({
          hits: caseIds.map((id) => ({
            _id: `${CASE_SAVED_OBJECT}:${id}`,
            _source: {
              namespaces: ['space-1'],
              cases: { observables: fieldObservables, total_observables: storedTotal },
            },
          })),
        }) as never;
      }

      if (aggs?.refs) {
        return response({
          aggregations: {
            refs: {
              cases: { caseIds: { buckets: caseIds.map((caseId) => ({ key: { caseId } })) } },
            },
          },
        }) as never;
      }

      if (aggs?.byType) {
        return response({
          aggregations: {
            byType: {
              buckets: [
                {
                  byValue: {
                    buckets: typeRepeats.map((ids) => ({
                      copies: { hits: { hits: ids.map(observableHit) } },
                    })),
                  },
                },
              ],
            },
          },
        }) as never;
      }

      if (trackTotalHits) {
        return response({ total: typeCount }) as never;
      }

      return response({ hits: fieldRepeats.map(observableHit) }) as never;
    });
  };

  beforeEach(() => {
    jest.resetAllMocks();
    savedObjectsClient.bulkDelete.mockResolvedValue({ statuses: [] });
  });

  it('keeps the oldest copy in the type and the field copy, deletes the rest and sets the total', async () => {
    mockSearches({
      caseIds: ['case-1'],
      fieldObservables: [{ typeKey: 'ipv4', value: '10.0.0.1' }],
      storedTotal: 5,
      typeRepeats: [['oldest', 'newer', 'newest']],
      fieldRepeats: ['repeat-of-field'],
      typeCount: 1,
    });

    const result = await removeRepeatedObservables({ savedObjectsClient, logger });

    expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith(
      [
        { type: CASE_OBSERVABLE_SAVED_OBJECT, id: 'newer' },
        { type: CASE_OBSERVABLE_SAVED_OBJECT, id: 'newest' },
        { type: CASE_OBSERVABLE_SAVED_OBJECT, id: 'repeat-of-field' },
      ],
      { namespace: 'space-1', refresh: 'wait_for' }
    );
    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      CASE_SAVED_OBJECT,
      'case-1',
      { total_observables: 2 },
      { namespace: 'space-1' }
    );
    expect(result).toEqual({ casesChecked: 1, removed: 3, totalsSet: 1 });
  });

  it('leaves a case without repeats and with an accurate total alone', async () => {
    mockSearches({ caseIds: ['case-1'], storedTotal: 4, typeCount: 4 });

    const result = await removeRepeatedObservables({ savedObjectsClient, logger });

    expect(savedObjectsClient.bulkDelete).not.toHaveBeenCalled();
    expect(savedObjectsClient.update).not.toHaveBeenCalled();
    expect(result).toEqual({ casesChecked: 1, removed: 0, totalsSet: 0 });
  });

  it('only checks cases that gained observables since the last run', async () => {
    mockSearches({ caseIds: [], typeCount: 0 });

    await removeRepeatedObservables({
      savedObjectsClient,
      logger,
      since: '2026-11-08T00:00:00.000Z',
    });

    expect(savedObjectsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CASE_OBSERVABLE_SAVED_OBJECT,
        namespaces: ['*'],
        query: {
          range: { 'cases-observables.created_at': { gte: '2026-11-08T00:00:00.000Z' } },
        },
      })
    );
  });

  it('logs a failing case and goes on with the others', async () => {
    mockSearches({ caseIds: ['case-1', 'case-2'], typeRepeats: [['a', 'b']], typeCount: 1 });
    savedObjectsClient.bulkDelete
      .mockRejectedValueOnce(new Error('delete failed'))
      .mockResolvedValueOnce({ statuses: [] });

    const result = await removeRepeatedObservables({ savedObjectsClient, logger });

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to remove repeated observables of case case-1: delete failed'
    );
    expect(result.casesChecked).toBe(2);
    expect(result.removed).toBe(1);
  });
});
