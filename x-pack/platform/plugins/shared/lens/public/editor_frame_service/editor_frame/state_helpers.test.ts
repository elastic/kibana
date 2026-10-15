/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { Reference } from '@kbn/content-management-utils';
import { createMockDatasource } from '../../mocks/datasource_mock';
import { createMockVisualization } from '../../mocks/visualization_mock';
import { createMockStorage, mockDataViewsService } from '../../data_views_service/mocks';
import { loadIndexPatterns } from '../../data_views_service/loader';
import { initializeSources } from './state_helpers';

jest.mock('../../data_views_service/loader', () => ({
  ...jest.requireActual('../../data_views_service/loader'),
  loadIndexPatterns: jest.fn(),
}));

const mockLoadIndexPatterns = loadIndexPatterns as jest.MockedFunction<typeof loadIndexPatterns>;

describe('initializeSources', () => {
  const textBasedState = {
    layers: {
      layer1: {
        index: 'esql-id',
        query: { esql: 'FROM logs-*' },
        columns: [],
        timeField: '@timestamp',
      },
    },
  };

  const initialize = async ({
    adHocDataViews,
    references,
  }: {
    adHocDataViews?: Record<string, DataViewSpec>;
    references?: Reference[];
  }) => {
    mockLoadIndexPatterns.mockResolvedValue({});
    await initializeSources({
      dataViews: mockDataViewsService() as never,
      eventAnnotationService: {} as never,
      datasourceMap: { textBased: createMockDatasource('textBased') },
      visualizationMap: { testVis: createMockVisualization('testVis') },
      visualizationState: { activeId: 'testVis', state: {}, selectedLayerId: null },
      datasourceStates: { textBased: { isLoading: false, state: textBasedState } },
      storage: createMockStorage() as never,
      defaultIndexPatternId: 'default',
      references,
      adHocDataViews,
    });
    return mockLoadIndexPatterns.mock.calls[0][0].adHocDataViews;
  };

  beforeEach(() => {
    mockLoadIndexPatterns.mockReset();
  });

  it('loads the data view of an ES|QL layer that has no persisted spec', async () => {
    const loaded = await initialize({});

    expect(loaded).toEqual({
      'esql-id': { id: 'esql-id', title: 'logs-*', type: 'esql', timeFieldName: '@timestamp' },
    });
  });

  it('loads the persisted spec of an ES|QL layer as it is', async () => {
    const persisted = {
      'esql-id': { id: 'esql-id', title: 'persisted-*', type: 'esql', timeFieldName: '@timestamp' },
    };

    expect(await initialize({ adHocDataViews: persisted })).toEqual(persisted);
  });

  it('does not derive a spec for a layer pointing to a saved data view', async () => {
    const loaded = await initialize({
      references: [{ type: 'index-pattern', id: 'esql-id', name: 'layer-reference' }],
    });

    expect(loaded).toEqual({});
  });
});
