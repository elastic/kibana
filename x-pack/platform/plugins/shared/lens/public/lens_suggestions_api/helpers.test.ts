/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import {
  mergeSuggestionWithVisContext,
  injectESQLQueryIntoLensLayers,
  switchVisualizationType,
} from './helpers';
import { mockAllSuggestions, createMockVisualization } from '../mocks';
import type {
  TypedLensByValueInput,
  TypedLensSerializedState,
  Suggestion,
  VisualizationMap,
  Visualization,
} from '@kbn/lens-common';

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
    it('should merge even if the visualization types do not match', async () => {
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
      expect(mergeSuggestionWithVisContext({ suggestion, visAttributes, context })).toStrictEqual({
        title: visAttributes.title,
        visualizationId: visAttributes.visualizationType,
        visualizationState: visAttributes.state.visualization,
        keptLayerIds: [],
        datasourceState: visAttributes.state.datasourceStates.textBased,
        datasourceId: 'textBased',
        columns: suggestion.columns,
        changeType: suggestion.changeType,
        score: suggestion.score,
        previewIcon: suggestion.previewIcon,
      });
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

    it('should return the suggestion as it is when some columns exist in context but others do not', async () => {
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
                    esql: 'FROM index1 | keep field1, field2, nonExistentField',
                  },
                  columns: [
                    {
                      columnId: 'colA',
                      fieldName: 'field1', // exists in context
                      meta: {
                        type: 'number',
                      },
                    },
                    {
                      columnId: 'colB',
                      fieldName: 'nonExistentField', // does not exist in context
                      meta: {
                        type: 'string',
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
      const newContext = {
        ...context,
        query: {
          esql: 'FROM kibana_sample_data_flights | keep field1, field2',
        },
      };
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
                    esql: 'FROM kibana_sample_data_flights | keep field1, field2',
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
          query: {
            esql: 'FROM kibana_sample_data_flights | keep field1, field2',
          },
        },
      } as unknown as TypedLensByValueInput['attributes'];
      const updatedSuggestion = mergeSuggestionWithVisContext({
        suggestion,
        visAttributes,
        context: newContext,
      });
      expect(updatedSuggestion.visualizationState).toStrictEqual(visAttributes.state.visualization);
    });
  });

  describe('injectESQLQueryIntoLensLayers', () => {
    const query = {
      esql: 'from index1 | limit 10 | stats average = avg(bytes)',
    };

    it('should inject the query correctly for ES|QL charts', async () => {
      const lensAttributes = {
        title: 'test',
        visualizationType: 'testVis',
        state: {
          datasourceStates: {
            textBased: { layers: { layer1: { query: { esql: 'from index1 | limit 10' } } } },
          },
          visualization: { preferredSeriesType: 'line' },
        },
        filters: [],
        query: {
          esql: 'from index1 | limit 10',
        },
        references: [],
      } as unknown as TypedLensSerializedState['attributes'];

      const expectedLensAttributes = {
        ...lensAttributes,
        state: {
          ...lensAttributes.state,
          datasourceStates: {
            ...lensAttributes.state.datasourceStates,
            textBased: {
              ...lensAttributes.state.datasourceStates.textBased,
              layers: {
                layer1: {
                  query: { esql: 'from index1 | limit 10 | stats average = avg(bytes)' },
                },
              },
            },
          },
        },
      };
      const suggestion = mockAllSuggestions[0];
      const newAttributes = injectESQLQueryIntoLensLayers(lensAttributes, query, suggestion);
      expect(newAttributes).toStrictEqual(expectedLensAttributes);
    });

    it('should return the Lens attributes as they are for unknown datasourceId', async () => {
      const attributes = {
        visualizationType: 'lnsXY',
        state: {
          visualization: { preferredSeriesType: 'line' },
          datasourceStates: { unknownId: { layers: {} } },
        },
      } as unknown as TypedLensSerializedState['attributes'];
      const suggestion = mockAllSuggestions[0];
      expect(
        injectESQLQueryIntoLensLayers(attributes, { esql: 'from foo' }, suggestion)
      ).toStrictEqual(attributes);
    });

    it('should return the Lens attributes as they are for form based charts', async () => {
      const attributes = {
        visualizationType: 'lnsXY',
        state: {
          visualization: { preferredSeriesType: 'line' },
          datasourceStates: { formBased: { layers: {} } },
        },
      } as TypedLensSerializedState['attributes'];
      const suggestion = mockAllSuggestions[0];
      expect(
        injectESQLQueryIntoLensLayers(attributes, { esql: 'from foo' }, suggestion)
      ).toStrictEqual(attributes);
    });

    it('should update the index pattern reference when suggestion has matching indexPatternRefs', async () => {
      const newQuery = {
        esql: 'from index2 | limit 15',
      };

      const lensAttributes = {
        title: 'test',
        visualizationType: 'testVis',
        state: {
          datasourceStates: {
            textBased: {
              layers: {
                layer1: {
                  query: { esql: 'from index1 | limit 10' },
                  index: 'old-index-id',
                },
              },
            },
          },
          visualization: { preferredSeriesType: 'line' },
        },
        filters: [],
        query: {
          esql: 'from index1 | limit 10',
        },
        references: [],
      } as unknown as TypedLensSerializedState['attributes'];

      const suggestionWithIndexRefs = {
        ...mockAllSuggestions[0],
        datasourceState: {
          indexPatternRefs: [
            { id: 'new-index-id', title: 'index2' },
            { id: 'other-index-id', title: 'index3' },
          ],
        },
      };

      const expectedLensAttributes = {
        ...lensAttributes,
        state: {
          ...lensAttributes.state,
          datasourceStates: {
            ...lensAttributes.state.datasourceStates,
            textBased: {
              ...lensAttributes.state.datasourceStates.textBased,
              layers: {
                layer1: {
                  query: { esql: 'from index2 | limit 15' },
                  index: 'new-index-id',
                },
              },
            },
          },
        },
      };

      const newAttributes = injectESQLQueryIntoLensLayers(
        lensAttributes,
        newQuery,
        suggestionWithIndexRefs
      );
      expect(newAttributes).toStrictEqual(expectedLensAttributes);
    });

    it('should keep original index when no matching indexPatternRef is found', async () => {
      const secondQuery = {
        esql: 'from nonexistent_index | limit 15',
      };

      const lensAttributes = {
        title: 'test',
        visualizationType: 'testVis',
        state: {
          datasourceStates: {
            textBased: {
              layers: {
                layer1: {
                  query: { esql: 'from index1 | limit 10' },
                  index: 'original-index-id',
                },
              },
            },
          },
          visualization: { preferredSeriesType: 'line' },
        },
        filters: [],
        query: {
          esql: 'from index1 | limit 10',
        },
        references: [],
      } as unknown as TypedLensSerializedState['attributes'];

      const suggestionWithIndexRefs = {
        ...mockAllSuggestions[0],
        datasourceState: {
          indexPatternRefs: [
            { id: 'other-index-id', title: 'index2' },
            { id: 'another-index-id', title: 'index3' },
          ],
        },
      };

      const expectedLensAttributes = {
        ...lensAttributes,
        state: {
          ...lensAttributes.state,
          datasourceStates: {
            ...lensAttributes.state.datasourceStates,
            textBased: {
              ...lensAttributes.state.datasourceStates.textBased,
              layers: {
                layer1: {
                  query: { esql: 'from nonexistent_index | limit 15' },
                  index: 'original-index-id',
                },
              },
            },
          },
        },
      };

      const newAttributes = injectESQLQueryIntoLensLayers(
        lensAttributes,
        secondQuery,
        suggestionWithIndexRefs
      );
      expect(newAttributes).toStrictEqual(expectedLensAttributes);
    });

    it('should not update layers when query is the same', async () => {
      const sameQuery = {
        esql: 'from index1 | limit 10',
      };

      const lensAttributes = {
        title: 'test',
        visualizationType: 'testVis',
        state: {
          datasourceStates: {
            textBased: {
              layers: {
                layer1: {
                  query: { esql: 'from index1 | limit 10' },
                  index: 'original-index-id',
                },
              },
            },
          },
          visualization: { preferredSeriesType: 'line' },
        },
        filters: [],
        query: {
          esql: 'from index1 | limit 10',
        },
        references: [],
      } as unknown as TypedLensSerializedState['attributes'];

      const suggestionWithIndexRefs = {
        ...mockAllSuggestions[0],
        datasourceState: {
          indexPatternRefs: [{ id: 'new-index-id', title: 'index1' }],
        },
      };

      // Should return the same structure since query hasn't changed
      const expectedLensAttributes = {
        ...lensAttributes,
        state: {
          ...lensAttributes.state,
          datasourceStates: {
            ...lensAttributes.state.datasourceStates,
            textBased: {
              ...lensAttributes.state.datasourceStates.textBased,
              layers: {
                layer1: {
                  query: { esql: 'from index1 | limit 10' },
                  index: 'original-index-id',
                },
              },
            },
          },
        },
      };

      const newAttributes = injectESQLQueryIntoLensLayers(
        lensAttributes,
        sameQuery,
        suggestionWithIndexRefs
      );
      expect(newAttributes).toStrictEqual(expectedLensAttributes);
    });

    it('should handle suggestion datasourceState without indexPatternRefs', async () => {
      const anotherQuery = {
        esql: 'from index2 | limit 15',
      };

      const lensAttributes = {
        title: 'test',
        visualizationType: 'testVis',
        state: {
          datasourceStates: {
            textBased: {
              layers: {
                layer1: {
                  query: { esql: 'from index1 | limit 10' },
                  index: 'original-index-id',
                },
              },
            },
          },
          visualization: { preferredSeriesType: 'line' },
        },
        filters: [],
        query: {
          esql: 'from index1 | limit 10',
        },
        references: [],
      } as unknown as TypedLensSerializedState['attributes'];

      const suggestionWithoutIndexRefs = {
        ...mockAllSuggestions[0],
        datasourceState: {
          // No indexPatternRefs property
          someOtherProperty: 'value',
        },
      };

      const expectedLensAttributes = {
        ...lensAttributes,
        state: {
          ...lensAttributes.state,
          datasourceStates: {
            ...lensAttributes.state.datasourceStates,
            textBased: {
              ...lensAttributes.state.datasourceStates.textBased,
              layers: {
                layer1: {
                  query: { esql: 'from index2 | limit 15' },
                  index: 'original-index-id',
                },
              },
            },
          },
        },
      };

      const newAttributes = injectESQLQueryIntoLensLayers(
        lensAttributes,
        anotherQuery,
        suggestionWithoutIndexRefs
      );
      expect(newAttributes).toStrictEqual(expectedLensAttributes);
    });
  });

  describe('switchVisualizationType', () => {
    const mockVisualizationState = { someState: 'value' };
    const mockSwitchedState = { someState: 'switchedValue' };

    const createMockSuggestion = (visualizationId: string): Suggestion => ({
      visualizationId,
      visualizationState: mockVisualizationState,
      datasourceState: {},
      datasourceId: 'formBased',
      columns: 1,
      score: 0.5,
      title: 'Mock Suggestion',
      changeType: 'initial',
      keptLayerIds: [],
      previewIcon: 'empty',
    });

    describe('supported subtype scenarios', () => {
      it('should switch visualization type when subtype is supported and different from current', () => {
        const mockVisualization: jest.Mocked<Visualization> = {
          ...createMockVisualization(),
          getVisualizationTypeId: jest.fn().mockReturnValue('bar'),
          isSubtypeSupported: jest.fn().mockReturnValue(true),
          switchVisualizationType: jest.fn().mockReturnValue(mockSwitchedState),
        };

        const visualizationMap: VisualizationMap = {
          lnsXY: mockVisualization,
        };

        const suggestions = [createMockSuggestion('lnsXY')];

        const result = switchVisualizationType({
          visualizationMap,
          suggestions,
          targetTypeId: 'line',
          familyType: 'lnsXY',
          forceSwitch: false,
        });

        expect(result).toEqual([
          {
            ...suggestions[0],
            visualizationState: mockSwitchedState,
          },
        ]);
        expect(mockVisualization.getVisualizationTypeId).toHaveBeenCalledWith(
          mockVisualizationState
        );
        expect(mockVisualization.isSubtypeSupported).toHaveBeenCalledWith('line');
        expect(mockVisualization.switchVisualizationType).toHaveBeenCalledWith(
          'line',
          mockVisualizationState
        );
      });

      it('should force switch even when current type matches target type', () => {
        const mockVisualization: jest.Mocked<Visualization> = {
          ...createMockVisualization(),
          getVisualizationTypeId: jest.fn().mockReturnValue('line'),
          isSubtypeSupported: jest.fn().mockReturnValue(true),
          switchVisualizationType: jest.fn().mockReturnValue(mockSwitchedState),
        };

        const visualizationMap: VisualizationMap = {
          lnsXY: mockVisualization,
        };

        const suggestions = [createMockSuggestion('lnsXY')];

        const result = switchVisualizationType({
          visualizationMap,
          suggestions,
          targetTypeId: 'line',
          familyType: 'lnsXY',
          forceSwitch: true,
        });

        expect(result).toEqual([
          {
            ...suggestions[0],
            visualizationState: mockSwitchedState,
          },
        ]);
        expect(mockVisualization.switchVisualizationType).toHaveBeenCalledWith(
          'line',
          mockVisualizationState
        );
      });
    });

    describe('unsupported subtype scenarios', () => {
      it('should return undefined when subtype is not supported', () => {
        const mockVisualization: jest.Mocked<Visualization> = {
          ...createMockVisualization(),
          getVisualizationTypeId: jest.fn().mockReturnValue('bar'),
          isSubtypeSupported: jest.fn().mockReturnValue(false),
          switchVisualizationType: jest.fn(),
        };

        const visualizationMap: VisualizationMap = {
          lnsXY: mockVisualization,
        };

        const suggestions = [createMockSuggestion('lnsXY')];

        const result = switchVisualizationType({
          visualizationMap,
          suggestions,
          targetTypeId: 'unsupportedType',
          familyType: 'lnsXY',
          forceSwitch: false,
        });

        expect(result).toBeUndefined();
        expect(mockVisualization.isSubtypeSupported).toHaveBeenCalledWith('unsupportedType');
        expect(mockVisualization.switchVisualizationType).not.toHaveBeenCalled();
      });

      it('should return undefined when isSubtypeSupported is not implemented', () => {
        const mockVisualization: jest.Mocked<Visualization> = {
          ...createMockVisualization(),
          getVisualizationTypeId: jest.fn().mockReturnValue('bar'),
          // isSubtypeSupported not defined
          isSubtypeSupported: undefined,
          switchVisualizationType: jest.fn(),
        };

        const visualizationMap: VisualizationMap = {
          lnsXY: mockVisualization,
        };

        const suggestions = [createMockSuggestion('lnsXY')];

        const result = switchVisualizationType({
          visualizationMap,
          suggestions,
          targetTypeId: 'line',
          familyType: 'lnsXY',
          forceSwitch: false,
        });

        expect(result).toBeUndefined();
        expect(mockVisualization.switchVisualizationType).not.toHaveBeenCalled();
      });
    });

    describe('non-existent family type scenarios', () => {
      it('should return undefined when family type does not exist in visualization map', () => {
        const visualizationMap: VisualizationMap = {
          lnsXY: createMockVisualization(),
        };

        const suggestions = [createMockSuggestion('lnsXY')];

        const result = switchVisualizationType({
          visualizationMap,
          suggestions,
          targetTypeId: 'donut',
          familyType: 'nonExistentFamily',
          forceSwitch: false,
        });

        expect(result).toBeUndefined();
      });

      it('should return undefined when suggestion for family type is not found', () => {
        const mockVisualization: jest.Mocked<Visualization> = {
          ...createMockVisualization(),
          isSubtypeSupported: jest.fn().mockReturnValue(true),
        };

        const visualizationMap: VisualizationMap = {
          lnsXY: mockVisualization,
        };

        // Suggestions only contain lnsPie, not lnsXY
        const suggestions = [createMockSuggestion('lnsPie')];

        const result = switchVisualizationType({
          visualizationMap,
          suggestions,
          targetTypeId: 'line',
          familyType: 'lnsXY',
          forceSwitch: false,
        });

        expect(result).toBeUndefined();
        expect(mockVisualization.getVisualizationTypeId).not.toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should return undefined when targetTypeId is not provided', () => {
        const mockVisualization: jest.Mocked<Visualization> = createMockVisualization();

        const visualizationMap: VisualizationMap = {
          lnsXY: mockVisualization,
        };

        const suggestions = [createMockSuggestion('lnsXY')];

        const result = switchVisualizationType({
          visualizationMap,
          suggestions,
          targetTypeId: undefined,
          familyType: 'lnsXY',
          forceSwitch: false,
        });

        expect(result).toBeUndefined();
        expect(mockVisualization.switchVisualizationType).not.toHaveBeenCalled();
      });

      it('should return undefined when suggestions array is empty', () => {
        const mockVisualization: jest.Mocked<Visualization> = createMockVisualization();

        const visualizationMap: VisualizationMap = {
          lnsXY: mockVisualization,
        };

        const result = switchVisualizationType({
          visualizationMap,
          suggestions: [],
          targetTypeId: 'line',
          familyType: 'lnsXY',
          forceSwitch: false,
        });

        expect(result).toBeUndefined();
      });

      it('should not switch when current type matches target type without force', () => {
        const mockVisualization: jest.Mocked<Visualization> = {
          ...createMockVisualization(),
          getVisualizationTypeId: jest.fn().mockReturnValue('line'),
          isSubtypeSupported: jest.fn().mockReturnValue(true),
        };

        const visualizationMap: VisualizationMap = {
          lnsXY: mockVisualization,
        };

        const suggestions = [createMockSuggestion('lnsXY')];

        const result = switchVisualizationType({
          visualizationMap,
          suggestions,
          targetTypeId: 'line',
          familyType: 'lnsXY',
          forceSwitch: false,
        });

        expect(result).toBeUndefined();
        expect(mockVisualization.switchVisualizationType).not.toHaveBeenCalled();
      });

      it('should handle switchVisualizationType returning undefined', () => {
        const mockVisualization: jest.Mocked<Visualization> = {
          ...createMockVisualization(),
          getVisualizationTypeId: jest.fn().mockReturnValue('bar'),
          isSubtypeSupported: jest.fn().mockReturnValue(true),
          switchVisualizationType: jest.fn().mockReturnValue(undefined),
        };

        const visualizationMap: VisualizationMap = {
          lnsXY: mockVisualization,
        };

        const suggestions = [createMockSuggestion('lnsXY')];

        const result = switchVisualizationType({
          visualizationMap,
          suggestions,
          targetTypeId: 'line',
          familyType: 'lnsXY',
          forceSwitch: false,
        });

        expect(result).toEqual([
          {
            ...suggestions[0],
            visualizationState: undefined,
          },
        ]);
      });

      it('should handle multiple suggestions and pick the correct one by familyType', () => {
        const mockXYVisualization: jest.Mocked<Visualization> = {
          ...createMockVisualization(),
          getVisualizationTypeId: jest.fn().mockReturnValue('bar'),
          isSubtypeSupported: jest.fn().mockReturnValue(true),
          switchVisualizationType: jest.fn().mockReturnValue(mockSwitchedState),
        };

        const mockPieVisualization: jest.Mocked<Visualization> = createMockVisualization();

        const visualizationMap: VisualizationMap = {
          lnsXY: mockXYVisualization,
          lnsPie: mockPieVisualization,
        };

        const suggestions = [
          createMockSuggestion('lnsPie'),
          createMockSuggestion('lnsXY'),
          createMockSuggestion('lnsMetric'),
        ];

        const result = switchVisualizationType({
          visualizationMap,
          suggestions,
          targetTypeId: 'line',
          familyType: 'lnsXY',
          forceSwitch: false,
        });

        expect(result).toEqual([
          {
            ...suggestions[1], // lnsXY suggestion
            visualizationState: mockSwitchedState,
          },
        ]);
        expect(mockXYVisualization.switchVisualizationType).toHaveBeenCalled();
        expect(mockPieVisualization.switchVisualizationType).not.toHaveBeenCalled();
      });
    });
  });
});
