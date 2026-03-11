/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import { resolveControlDataViewId } from './data_view_id_resolver';

const createDataViewsServiceMock = () => {
  return {
    get: jest.fn(),
    getIdsWithTitle: jest.fn<Promise<DataViewListItem[]>, []>(),
  };
};

describe('resolveControlDataViewId', () => {
  it('resolves exact match by indexPattern', async () => {
    const dataViewsService = createDataViewsServiceMock();
    dataViewsService.getIdsWithTitle.mockResolvedValue([
      { id: 'dv-1', title: 'logs-*' },
      { id: 'dv-2', title: 'metrics-*' },
    ]);

    await expect(
      resolveControlDataViewId({
        dataViewsService,
        input: {
          indexPattern: 'logs-*',
        },
      })
    ).resolves.toBe('dv-1');

    await expect(
      resolveControlDataViewId({
        dataViewsService,
        input: {
          indexPattern: 'metrics-*',
        },
      })
    ).resolves.toBe('dv-2');
  });

  it('returns deterministic ambiguity error for duplicate title matches', async () => {
    const dataViewsService = createDataViewsServiceMock();
    dataViewsService.getIdsWithTitle.mockResolvedValue([
      { id: 'b-id', title: 'logs-*' },
      { id: 'a-id', title: 'logs-*' },
    ]);

    await expect(
      resolveControlDataViewId({
        dataViewsService,
        input: {
          indexPattern: 'logs-*',
        },
      })
    ).rejects.toThrow(
      'Data view match for "logs-*" is ambiguous. Candidates: "logs-*" (a-id), "logs-*" (b-id).'
    );
  });

});
