/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { CasePersistedAttributes } from '../../common/types/case';
import { fetchObservablesPreviews } from './observables_preview';

const caseSO = (id: string, fieldCount: number) =>
  ({
    id,
    type: 'cases',
    references: [],
    attributes: {
      observables: Array.from({ length: fieldCount }, (_, i) => ({
        id: `f-${i}`,
        typeKey: 'ipv4',
        value: `10.0.0.${i}`,
        description: null,
      })),
    },
  } as unknown as SavedObject<CasePersistedAttributes>);

describe('fetchObservablesPreviews', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the oldest objects of the cases whose field has room', async () => {
    esClient.search.mockResolvedValue({
      aggregations: {
        refs: {
          cases: {
            caseIds: {
              buckets: [
                {
                  key: 'case-1',
                  reverse: {
                    oldest: {
                      hits: {
                        hits: [
                          {
                            _id: 'cases-observables:obs-1',
                            _source: {
                              'cases-observables': {
                                type_key: 'ipv4',
                                value: '10.1.1.1',
                                description: null,
                                created_at: '2026-11-06T00:00:00.000Z',
                                updated_at: null,
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    } as never);

    const previews = await fetchObservablesPreviews(esClient, [
      caseSO('case-1', 2),
      caseSO('full', 50),
    ]);

    expect(previews.get('case-1')).toEqual([
      {
        id: 'obs-1',
        typeKey: 'ipv4',
        value: '10.1.1.1',
        description: null,
        createdAt: '2026-11-06T00:00:00.000Z',
        updatedAt: null,
      },
    ]);
    const [[request]] = esClient.search.mock.calls;
    expect(JSON.stringify(request)).toContain('"include":["case-1"]');
  });

  it('does not search when every field is full', async () => {
    await fetchObservablesPreviews(esClient, [caseSO('full', 50)]);
    expect(esClient.search).not.toHaveBeenCalled();
  });
});
