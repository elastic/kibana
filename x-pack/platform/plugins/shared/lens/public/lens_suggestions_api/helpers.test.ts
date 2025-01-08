/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { mergeSuggestionWithVisContext } from './helpers';
import { mockAllSuggestions } from '../mocks';
import { TypedLensByValueInput } from '../react_embeddable/types';

const context = {
  dataViewSpec: {
    id: 'index1',
    title: 'index1',
    name: 'DataView',
  },
  fieldName: '',
  textBasedColumns: [
    {
      id: 'field1',
      name: 'field1',
      meta: {
        type: 'number',
      },
    },
    {
      id: 'field2',
      name: 'field2',
      meta: {
        type: 'string',
      },
    },
  ] as DatatableColumn[],
  query: {
    esql: 'FROM index1 | keep field1, field2',
  },
};

describe('lens suggestions api helpers', () => {
  describe('mergeSuggestionWithVisContext', () => {
    it('should return the suggestion as it is if the visualization types do not match', async () => {
      const suggestion = mockAllSuggestions[0];
      const visAttributes = {
        visualizationType: 'lnsXY',
        state: {
          visualization: {
            preferredSeriesType: 'bar_stacked',
          },
          datasourceStates: { textBased: { layers: {} } },
        },
      } as unknown as TypedLensByValueInput['attributes'];
      expect(mergeSuggestionWithVisContext({ suggestion, visAttributes, context })).toStrictEqual(
        suggestion
      );
    });

    it('should return the suggestion as it is if the context is not from ES|QL', async () => {
      const nonESQLContext = {
        dataViewSpec: {
          id: 'index1',
          title: 'index1',
          name: 'DataView',
        },
        fieldName: 'field1',
      };
      const suggestion = mockAllSuggestions[0];
      const visAttributes = {
        visualizationType: 'lnsHeatmap',
        state: {
          visualization: {
            preferredSeriesType: 'bar_stacked',
          },
          datasourceStates: { textBased: { layers: {} } },
        },
      } as unknown as TypedLensByValueInput['attributes'];
      expect(
        mergeSuggestionWithVisContext({ suggestion, visAttributes, context: nonESQLContext })
      ).toStrictEqual(suggestion);
    });

    it('should return the suggestion as it is for DSL config (formbased)', async () => {
      const suggestion = mockAllSuggestions[0];
      const visAttributes = {
        visualizationType: 'lnsHeatmap',
        state: {
          visualization: {
            preferredSeriesType: 'bar_stacked',
          },
          datasourceStates: { formBased: { layers: {} } },
        },
      } as unknown as TypedLensByValueInput['attributes'];
      expect(mergeSuggestionWithVisContext({ suggestion, visAttributes, context })).toStrictEqual(
        suggestion
      );
    });

    it('should return the suggestion as it is for columns that dont match the context', async () => {
      const suggestion = mockAllSuggestions[0];
      const visAttributes = {
        visualizationType: 'lnsHeatmap',
        state: {
          visualization: {
            shape: 'heatmap',
          },
          datasourceStates: {
            textBased: {
              layers: {
                layer1: {
                  index: 'layer1',
                  query: {
                    esql: 'FROM kibana_sample_data_flights | keep Dest, AvgTicketPrice',
                  },
                  columns: [
                    {
                      columnId: 'colA',
                      fieldName: 'Dest',
                      meta: {
                        type: 'string',
                      },
                    },
                    {
                      columnId: 'colB',
                      fieldName: 'AvgTicketPrice',
                      meta: {
                        type: 'number',
                      },
                    },
                  ],
                  timeField: 'timestamp',
                },
              },
            },
          },
        },
      } as unknown as TypedLensByValueInput['attributes'];
      expect(mergeSuggestionWithVisContext({ suggestion, visAttributes, context })).toStrictEqual(
        suggestion
      );
    });

    it('should return the suggestion updated with the attributes if the visualization types and the context columns match', async () => {
      const suggestion = mockAllSuggestions[0];
      const visAttributes = {
        visualizationType: 'lnsHeatmap',
        state: {
          visualization: {
            shape: 'heatmap',
            layerId: 'layer1',
            layerType: 'data',
            legend: {
              isVisible: false,
              position: 'left',
              type: 'heatmap_legend',
            },
            gridConfig: {
              type: 'heatmap_grid',
              isCellLabelVisible: true,
              isYAxisLabelVisible: false,
              isXAxisLabelVisible: false,
              isYAxisTitleVisible: false,
              isXAxisTitleVisible: false,
            },
            valueAccessor: 'acc1',
            xAccessor: 'acc2',
          },
          datasourceStates: {
            textBased: {
              layers: {
                layer1: {
                  index: 'layer1',
                  query: {
                    esql: 'FROM index1 | keep field1, field2',
                  },
                  columns: [
                    {
                      columnId: 'field2',
                      fieldName: 'field2',
                      meta: {
                        type: 'string',
                      },
                    },
                    {
                      columnId: 'field1',
                      fieldName: 'field1',
                      meta: {
                        type: 'number',
                      },
                    },
                  ],
                  timeField: 'timestamp',
                },
              },
            },
          },
        },
      } as unknown as TypedLensByValueInput['attributes'];
      const updatedSuggestion = mergeSuggestionWithVisContext({
        suggestion,
        visAttributes,
        context,
      });
      expect(updatedSuggestion.visualizationState).toStrictEqual(visAttributes.state.visualization);
    });
  });
});
