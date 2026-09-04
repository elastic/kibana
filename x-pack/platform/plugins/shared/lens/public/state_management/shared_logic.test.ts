/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type {
  DatasourceMap,
  DatasourceStates,
  VisualizationMap,
  VisualizationState,
} from '@kbn/lens-common';
import { getActiveDataFromDatatable, mergeToNewDoc } from './shared_logic';
import { createMockDatasource, createMockVisualization } from '../mocks';

describe('lens shared logic', () => {
  describe('#mergeToNewDoc', () => {
    const buildDoc = (query: unknown) => {
      const datasourceMap = { testDatasource: createMockDatasource() } as unknown as DatasourceMap;
      const visualizationMap = { testVis: createMockVisualization() } as VisualizationMap;
      const visualization: VisualizationState = {
        activeId: 'testVis',
        state: {},
        selectedLayerId: null,
      };
      const datasourceStates = {
        testDatasource: { isLoading: false, state: {} },
      } as DatasourceStates;
      return mergeToNewDoc(
        undefined,
        visualization,
        datasourceStates,
        query as Parameters<typeof mergeToNewDoc>[3],
        [],
        'testDatasource',
        {},
        {
          datasourceMap,
          visualizationMap,
          extractFilterReferences: jest.fn(() => ({ state: [], references: [] })),
        }
      );
    };

    it('never persists an aggregate (ES|QL) editor query into the slot', () => {
      expect(buildDoc({ esql: 'FROM index | LIMIT 10' })?.state.query).toBeUndefined();
    });

    it('persists the chart-scoped KQL/Lucene filter', () => {
      const kqlQuery = { query: 'bytes > 100', language: 'kuery' };
      expect(buildDoc(kqlQuery)?.state.query).toEqual(kqlQuery);
    });
  });

  describe('#getActiveDataFromDatatable', () => {
    const defaultLayerId = 'default-layer';
    const firstTable: Datatable = {
      type: 'datatable',
      columns: [],
      rows: [],
    };
    const secondTable: Datatable = {
      type: 'datatable',
      columns: [],
      rows: [],
    };

    it('should return {} for empty datatable', () => {
      expect(getActiveDataFromDatatable(defaultLayerId, undefined)).toEqual({});
    });

    it('should return multiple tables', () => {
      const datatables: Record<string, Datatable> = {
        first: firstTable,
        second: secondTable,
      };
      expect(getActiveDataFromDatatable(defaultLayerId, datatables)).toEqual({
        first: firstTable,
        second: secondTable,
      });
    });

    it('should return since table with default layer id', () => {
      const datatables: Record<string, Datatable> = {
        first: firstTable,
      };
      expect(getActiveDataFromDatatable(defaultLayerId, datatables)).toEqual({
        [defaultLayerId]: firstTable,
      });
    });
  });
});
