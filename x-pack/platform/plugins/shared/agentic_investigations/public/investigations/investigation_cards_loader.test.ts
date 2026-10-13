/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { createInvestigationCardsLoader } from './investigation_cards_loader';

describe('createInvestigationCardsLoader', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reads the cards rendered in one tick with one list call', async () => {
    const http = httpServiceMock.createStartContract();
    http.get.mockResolvedValue({
      results: [{ id: 'a' }, { id: 'b' }],
      pagination: { total: 2, page: 1, per_page: 3 },
    });
    const loader = createInvestigationCardsLoader(http);

    const loads = Promise.all([loader.load('a'), loader.load('b'), loader.load('c')]);
    jest.runAllTimers();

    await expect(loads).resolves.toEqual([{ id: 'a' }, { id: 'b' }, undefined]);
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith('/internal/investigations/investigations', {
      version: '1',
      query: { id: ['a', 'b', 'c'], per_page: 3 },
    });
  });

  it('rejects every card of a failed read', async () => {
    const http = httpServiceMock.createStartContract();
    http.get.mockRejectedValue(new Error('forbidden'));
    const loader = createInvestigationCardsLoader(http);

    const load = loader.load('a');
    jest.runAllTimers();

    await expect(load).rejects.toThrow('forbidden');
  });
});
