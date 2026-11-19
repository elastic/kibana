/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
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

  describe('#mergeToNewDoc ES|QL ad hoc data views', () => {
    const esqlSpec: DataViewSpec = {
      id: 'esql-id',
      title: 'logs-*',
      type: 'esql',
      timeFieldName: '@timestamp',
    };
    const esqlReference = {
      type: 'index-pattern',
      id: 'esql-id',
      name: 'textBasedLanguages-datasource-layer-layer1',
    };
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

    const merge = ({
      adHocDataViews,
      extraDatasourceReferences = [],
      visualizationReferences = [],
    }: {
      adHocDataViews: Record<string, DataViewSpec>;
      extraDatasourceReferences?: Array<{ type: string; id: string; name: string }>;
      visualizationReferences?: Array<{ type: string; id: string; name: string }>;
    }) => {
      const textBased = createMockDatasource('textBased');
      textBased.getPersistableState.mockImplementation((state) => ({
        state,
        references: [esqlReference],
      }));
      const formBased = createMockDatasource('formBased');
      formBased.getPersistableState.mockImplementation((state) => ({
        state,
        references: extraDatasourceReferences,
      }));
      const testVis = createMockVisualization('testVis');
      testVis.getPersistableState = jest.fn((state) => ({
        state,
        references: visualizationReferences,
      }));

      return mergeToNewDoc(
        undefined,
        { activeId: 'testVis', state: {}, selectedLayerId: null },
        {
          textBased: { isLoading: false, state: textBasedState },
          formBased: { isLoading: false, state: { layers: {} } },
        } as DatasourceStates,
        undefined,
        [],
        'textBased',
        adHocDataViews,
        {
          datasourceMap: { textBased, formBased } as unknown as DatasourceMap,
          visualizationMap: { testVis } as unknown as VisualizationMap,
          extractFilterReferences: jest.fn(() => ({ state: [], references: [] })),
        }
      );
    };

    it('does not persist the spec of an ES|QL layer, and keeps its reference internal', () => {
      const doc = merge({ adHocDataViews: { 'esql-id': esqlSpec } });

      expect(doc?.state.adHocDataViews).toEqual({});
      expect(doc?.state.internalReferences).toEqual([esqlReference]);
      expect(doc?.references).toEqual([]);
    });

    it('persists the spec when a form-based layer uses the same data view', () => {
      const doc = merge({
        adHocDataViews: { 'esql-id': esqlSpec },
        extraDatasourceReferences: [
          { type: 'index-pattern', id: 'esql-id', name: 'indexpattern-datasource-layer-ref' },
        ],
      });

      expect(doc?.state.adHocDataViews).toEqual({ 'esql-id': esqlSpec });
    });

    it('persists the spec when the visualization references the same data view', () => {
      const doc = merge({
        adHocDataViews: { 'esql-id': esqlSpec },
        visualizationReferences: [
          { type: 'index-pattern', id: 'esql-id', name: 'xy-visualization-layer-annotations' },
        ],
      });

      expect(doc?.state.adHocDataViews).toEqual({ 'esql-id': esqlSpec });
    });

    it('persists the ad hoc data views that are not ES|QL layers', () => {
      const formBasedSpec: DataViewSpec = { id: 'ad-hoc-form-based', title: 'metrics-*' };

      const doc = merge({
        adHocDataViews: { 'esql-id': esqlSpec, 'ad-hoc-form-based': formBasedSpec },
      });

      expect(doc?.state.adHocDataViews).toEqual({ 'ad-hoc-form-based': formBasedSpec });
    });

    it('treats the layer as the source of truth when the spec time field differs', () => {
      const staleSpec = { ...esqlSpec, timeFieldName: 'event.ingested' };

      const doc = merge({ adHocDataViews: { 'esql-id': staleSpec } });

      expect(doc?.state.adHocDataViews).toEqual({});
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
