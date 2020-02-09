/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSavedObjectFormat, Props } from './save';
import { createMockDatasource, createMockVisualization } from '../mocks';
import { esFilters, IIndexPattern, IFieldType } from '../../../../../../../src/plugins/data/public';

describe('save editor frame state', () => {
  const mockVisualization = createMockVisualization();
  mockVisualization.getPersistableState.mockImplementation(x => x);
  const mockDatasource = createMockDatasource();
  const mockIndexPattern = ({ id: 'indexpattern' } as unknown) as IIndexPattern;
  const mockField = ({ name: '@timestamp' } as unknown) as IFieldType;

  mockDatasource.getPersistableState.mockImplementation(x => x);
  const saveArgs: Props = {
    activeDatasources: {
      indexpattern: mockDatasource,
    },
    visualization: mockVisualization,
    state: {
      title: 'aaa',
      datasourceStates: {
        indexpattern: {
          state: 'hello',
          isLoading: false,
        },
      },
      activeDatasourceId: 'indexpattern',
      visualization: { activeId: '2', state: {} },
    },
    framePublicAPI: {
      addNewLayer: jest.fn(),
      removeLayers: jest.fn(),
      datasourceLayers: {
        first: mockDatasource.publicAPIMock,
      },
      query: { query: '', language: 'lucene' },
      dateRange: { fromDate: 'now-7d', toDate: 'now' },
      filters: [esFilters.buildExistsFilter(mockField, mockIndexPattern)],
    },
  };

  it('transforms from internal state to persisted doc format', async () => {
    const datasource = createMockDatasource();
    datasource.getPersistableState.mockImplementation(state => ({
      stuff: `${state}_datasource_persisted`,
    }));

    const visualization = createMockVisualization();
    visualization.getPersistableState.mockImplementation(state => ({
      things: `${state}_vis_persisted`,
    }));

    const doc = await getSavedObjectFormat({
      ...saveArgs,
      activeDatasources: {
        indexpattern: datasource,
      },
      state: {
        title: 'bbb',
        datasourceStates: {
          indexpattern: {
            state: '2',
            isLoading: false,
          },
        },
        activeDatasourceId: 'indexpattern',
        visualization: { activeId: '3', state: '4' },
      },
      visualization,
    });

    expect(doc).toEqual({
      id: undefined,
      expression: '',
      state: {
        datasourceMetaData: {
          filterableIndexPatterns: [],
        },
        datasourceStates: {
          indexpattern: {
            stuff: '2_datasource_persisted',
          },
        },
        visualization: { things: '4_vis_persisted' },
        query: { query: '', language: 'lucene' },
        filters: [
          {
            meta: { index: 'indexpattern' },
            exists: { field: '@timestamp' },
          },
        ],
      },
      title: 'bbb',
      type: 'lens',
      visualizationType: '3',
    });
  });
});
