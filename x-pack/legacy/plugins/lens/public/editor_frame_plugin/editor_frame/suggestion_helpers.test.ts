/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSuggestions } from './suggestion_helpers';
import { createMockVisualization, createMockDatasource, DatasourceMock } from '../mocks';
import { TableSuggestion, DatasourceSuggestion, Datasource } from '../../types';

const generateSuggestion = (
  datasourceSuggestionId: number = 0,
  state = {},
  layerId: string = 'first'
): DatasourceSuggestion => ({
  state,
  table: { datasourceSuggestionId, columns: [], isMultiRow: false, layerId },
});

let datasourceMap: Record<string, DatasourceMock>;
let datasourceStates: Record<
  string,
  {
    isLoading: boolean;
    state: unknown;
  }
>;

beforeEach(() => {
  datasourceMap = {
    mock: createMockDatasource(),
  };

  datasourceStates = {
    mock: {
      isLoading: false,
      state: {},
    },
  };
});

describe('suggestion helpers', () => {
  it('should return suggestions array', () => {
    const mockVisualization = createMockVisualization();
    datasourceMap.mock.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      generateSuggestion(),
    ]);
    const suggestedState = {};
    const suggestions = getSuggestions({
      visualizationMap: {
        vis1: {
          ...mockVisualization,
          getSuggestions: () => [
            {
              datasourceSuggestionId: 0,
              score: 0.5,
              title: 'Test',
              state: suggestedState,
              previewIcon: 'empty',
            },
          ],
        },
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
    });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].visualizationState).toBe(suggestedState);
  });

  it('should concatenate suggestions from all visualizations', () => {
    const mockVisualization1 = createMockVisualization();
    const mockVisualization2 = createMockVisualization();
    datasourceMap.mock.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      generateSuggestion(),
    ]);
    const suggestions = getSuggestions({
      visualizationMap: {
        vis1: {
          ...mockVisualization1,
          getSuggestions: () => [
            {
              datasourceSuggestionId: 0,
              score: 0.5,
              title: 'Test',
              state: {},
              previewIcon: 'empty',
            },
            {
              datasourceSuggestionId: 0,
              score: 0.5,
              title: 'Test2',
              state: {},
              previewIcon: 'empty',
            },
          ],
        },
        vis2: {
          ...mockVisualization2,
          getSuggestions: () => [
            {
              datasourceSuggestionId: 0,
              score: 0.5,
              title: 'Test3',
              state: {},
              previewIcon: 'empty',
            },
          ],
        },
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
    });
    expect(suggestions).toHaveLength(3);
  });

  it('should rank the visualizations by score', () => {
    const mockVisualization1 = createMockVisualization();
    const mockVisualization2 = createMockVisualization();
    datasourceMap.mock.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      generateSuggestion(),
    ]);
    const suggestions = getSuggestions({
      visualizationMap: {
        vis1: {
          ...mockVisualization1,
          getSuggestions: () => [
            {
              datasourceSuggestionId: 0,
              score: 0.2,
              title: 'Test',
              state: {},
              previewIcon: 'empty',
            },
            {
              datasourceSuggestionId: 0,
              score: 0.8,
              title: 'Test2',
              state: {},
              previewIcon: 'empty',
            },
          ],
        },
        vis2: {
          ...mockVisualization2,
          getSuggestions: () => [
            {
              datasourceSuggestionId: 0,
              score: 0.6,
              title: 'Test3',
              state: {},
              previewIcon: 'empty',
            },
          ],
        },
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
    });
    expect(suggestions[0].score).toBe(0.8);
    expect(suggestions[1].score).toBe(0.6);
    expect(suggestions[2].score).toBe(0.2);
  });

  it('should call all suggestion getters with all available data tables', () => {
    const mockVisualization1 = createMockVisualization();
    const mockVisualization2 = createMockVisualization();
    const table1: TableSuggestion = {
      datasourceSuggestionId: 0,
      columns: [],
      isMultiRow: true,
      layerId: 'first',
    };
    const table2: TableSuggestion = {
      datasourceSuggestionId: 1,
      columns: [],
      isMultiRow: true,
      layerId: 'first',
    };
    datasourceMap.mock.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      { state: {}, table: table1 },
      { state: {}, table: table2 },
    ]);
    getSuggestions({
      visualizationMap: {
        vis1: mockVisualization1,
        vis2: mockVisualization2,
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
    });
    expect(mockVisualization1.getSuggestions.mock.calls[0][0].tables[0]).toEqual(table1);
    expect(mockVisualization1.getSuggestions.mock.calls[0][0].tables[1]).toEqual(table2);
    expect(mockVisualization2.getSuggestions.mock.calls[0][0].tables[0]).toEqual(table1);
    expect(mockVisualization2.getSuggestions.mock.calls[0][0].tables[1]).toEqual(table2);
  });

  it('should map the suggestion ids back to the correct datasource states', () => {
    const mockVisualization1 = createMockVisualization();
    const mockVisualization2 = createMockVisualization();
    const tableState1 = {};
    const tableState2 = {};
    datasourceMap.mock.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      generateSuggestion(0, tableState1),
      generateSuggestion(1, tableState2),
    ]);
    const suggestions = getSuggestions({
      visualizationMap: {
        vis1: {
          ...mockVisualization1,
          getSuggestions: () => [
            {
              datasourceSuggestionId: 0,
              score: 0.3,
              title: 'Test',
              state: {},
              previewIcon: 'empty',
            },
            {
              datasourceSuggestionId: 1,
              score: 0.2,
              title: 'Test2',
              state: {},
              previewIcon: 'empty',
            },
          ],
        },
        vis2: {
          ...mockVisualization2,
          getSuggestions: () => [
            {
              datasourceSuggestionId: 1,
              score: 0.1,
              title: 'Test3',
              state: {},
              previewIcon: 'empty',
            },
          ],
        },
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
    });
    expect(suggestions[0].datasourceState).toBe(tableState1);
    expect(suggestions[1].datasourceState).toBe(tableState2);
    expect(suggestions[2].datasourceState).toBe(tableState2);
  });

  it('should pass the state of the currently active visualization to getSuggestions', () => {
    const mockVisualization1 = createMockVisualization();
    const mockVisualization2 = createMockVisualization();
    const currentState = {};
    datasourceMap.mock.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      generateSuggestion(0),
      generateSuggestion(1),
    ]);
    getSuggestions({
      visualizationMap: {
        vis1: mockVisualization1,
        vis2: mockVisualization2,
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
    });
    expect(mockVisualization1.getSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        state: currentState,
      })
    );
    expect(mockVisualization2.getSuggestions).not.toHaveBeenCalledWith(
      expect.objectContaining({
        state: currentState,
      })
    );
  });
});
