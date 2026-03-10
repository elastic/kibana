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
  it('resolves exact match by dataViewTitle and indexPattern', async () => {
    const dataViewsService = createDataViewsServiceMock();
    dataViewsService.getIdsWithTitle.mockResolvedValue([
      { id: 'dv-1', title: 'logs-*' },
      { id: 'dv-2', title: 'metrics-*' },
    ]);

    await expect(
      resolveControlDataViewId({
        dataViewsService,
        input: {
          dataViewTitle: 'logs-*',
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
          dataViewTitle: 'logs-*',
        },
      })
    ).rejects.toThrow(
      'Data view match for "logs-*" is ambiguous. Candidates: "logs-*" (a-id), "logs-*" (b-id).'
    );
  });

  it('fails when direct dataViewId validation fails', async () => {
    const dataViewsService = createDataViewsServiceMock();
    dataViewsService.get.mockRejectedValue(new Error('not found'));

    await expect(
      resolveControlDataViewId({
        dataViewsService,
        input: {
          dataViewId: 'missing-data-view-id',
        },
      })
    ).rejects.toThrow('Data view id "missing-data-view-id" does not exist.');
  });

  it('fails when no data view selector is provided', async () => {
    const dataViewsService = createDataViewsServiceMock();

    await expect(
      resolveControlDataViewId({
        dataViewsService,
        input: {},
      })
    ).rejects.toThrow(
      'Each control must provide one of "dataViewId", "dataViewTitle", or "indexPattern".'
    );
  });
});
