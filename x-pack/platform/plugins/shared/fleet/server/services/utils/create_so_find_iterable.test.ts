/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { createSoFindIterable } from './create_so_find_iterable';

function makeFindResult(ids: string[], pitId = 'pit-1') {
  return {
    total: ids.length,
    per_page: ids.length,
    page: 1,
    pit_id: pitId,
    saved_objects: ids.map((id) => ({
      id,
      type: 'test-type',
      attributes: {},
      references: [],
      score: 1,
      sort: [id],
    })),
  };
}

describe('createSoFindIterable', () => {
  describe('early exit via break', () => {
    it('closes the point-in-time when the consumer breaks out of for-await', async () => {
      const soClient = savedObjectsClientMock.create();
      soClient.openPointInTimeForType.mockResolvedValue({ id: 'pit-abc' });
      soClient.closePointInTime.mockResolvedValue({} as any);

      // First page returns one item (so the loop can enter); break fires before the second fetch.
      soClient.find.mockResolvedValueOnce(makeFindResult(['policy-1'], 'pit-abc') as any);

      const iterable = createSoFindIterable({
        soClient,
        findRequest: { type: 'test-type', sortField: 'updated_at' },
        resultsMapper: (data) => data.saved_objects.map((so) => so.id),
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _page of iterable) {
        break; // triggers iterator.return()
      }

      expect(soClient.closePointInTime).toHaveBeenCalledWith('pit-abc');
    });
  });
});
