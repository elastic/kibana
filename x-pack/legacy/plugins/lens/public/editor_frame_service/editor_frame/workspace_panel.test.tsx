/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactExpressionRendererProps } from '../../../../../../../src/plugins/expressions/public';
import { FramePublicAPI, TableSuggestion, Visualization } from '../../types';
import {
  createMockVisualization,
  createMockDatasource,
  createExpressionRendererMock,
  DatasourceMock,
  createMockFramePublicAPI,
} from '../mocks';
import { InnerWorkspacePanel, WorkspacePanelProps } from './workspace_panel';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { ReactWrapper } from 'enzyme';
import { DragDrop, ChildDragDropProvider } from '../../drag_drop';
import { Ast } from '@kbn/interpreter/common';
import { coreMock } from 'src/core/public/mocks';
import { esFilters, IFieldType, IIndexPattern } from '../../../../../../../src/plugins/data/public';

const waitForPromises = () => new Promise(resolve => setTimeout(resolve));

describe('workspace_panel', () => {
  let mockVisualization: jest.Mocked<Visualization>;
  let mockVisualization2: jest.Mocked<Visualization>;
  let mockDatasource: DatasourceMock;

  let expressionRendererMock: jest.Mock<React.ReactElement, [ReactExpressionRendererProps]>;

  let instance: ReactWrapper<WorkspacePanelProps>;

  beforeEach(() => {
    mockVisualization = createMockVisualization();
    mockVisualization2 = createMockVisualization();

    mockDatasource = createMockDatasource();

    expressionRendererMock = createExpressionRendererMock();
  });

  afterEach(() => {
    instance.unmount();
  });

  it('should render an explanatory text if no visualization is active', () => {
    instance = mount(
      <InnerWorkspacePanel
        activeDatasourceId={'mock'}
        datasourceStates={{}}
        datasourceMap={{}}
        framePublicAPI={createMockFramePublicAPI()}
        activeVisualizationId={null}
        visualizationMap={{
          vis: mockVisualization,
        }}
        visualizationState={{}}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
        core={coreMock.createSetup()}
      />
    );

    expect(instance.find('[data-test-subj="empty-workspace"]')).toHaveLength(2);
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should render an explanatory text if the visualization does not produce an expression', () => {
    instance = mount(
      <InnerWorkspacePanel
        activeDatasourceId={'mock'}
        datasourceStates={{}}
        datasourceMap={{}}
        framePublicAPI={createMockFramePublicAPI()}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => null },
        }}
        visualizationState={{}}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
        core={coreMock.createSetup()}
      />
    );

    expect(instance.find('[data-test-subj="empty-workspace"]')).toHaveLength(2);
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should render an explanatory text if the datasource does not produce an expression', () => {
    instance = mount(
      <InnerWorkspacePanel
        activeDatasourceId={'mock'}
        datasourceStates={{}}
        datasourceMap={{}}
        framePublicAPI={createMockFramePublicAPI()}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        visualizationState={{}}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
        core={coreMock.createSetup()}
      />
    );

    expect(instance.find('[data-test-subj="empty-workspace"]')).toHaveLength(2);
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should render the resulting expression using the expression renderer', () => {
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['first']);

    instance = mount(
      <InnerWorkspacePanel
        activeDatasourceId={'mock'}
        datasourceStates={{
          mock: {
            state: {},
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        visualizationState={{}}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
        core={coreMock.createSetup()}
      />
    );

    expect(instance.find(expressionRendererMock).prop('expression')).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {},
            "function": "kibana",
            "type": "function",
          },
          Object {
            "arguments": Object {
              "filters": Array [
                "[]",
              ],
              "query": Array [
                "{\\"query\\":\\"\\",\\"language\\":\\"lucene\\"}",
              ],
              "timeRange": Array [
                "{\\"from\\":\\"now-7d\\",\\"to\\":\\"now\\"}",
              ],
            },
            "function": "kibana_context",
            "type": "function",
          },
          Object {
            "arguments": Object {
              "layerIds": Array [
                "first",
              ],
              "tables": Array [
                Object {
                  "chain": Array [
                    Object {
                      "arguments": Object {},
                      "function": "datasource",
                      "type": "function",
                    },
                  ],
                  "type": "expression",
                },
              ],
            },
            "function": "lens_merge_tables",
            "type": "function",
          },
          Object {
            "arguments": Object {},
            "function": "vis",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });

  it('should include data fetching for each layer in the expression', () => {
    const mockDatasource2 = createMockDatasource();
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
      second: mockDatasource2.publicAPIMock,
    };
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['first']);

    mockDatasource2.toExpression.mockReturnValue('datasource2');
    mockDatasource2.getLayers.mockReturnValue(['second', 'third']);

    instance = mount(
      <InnerWorkspacePanel
        activeDatasourceId={'mock'}
        datasourceStates={{
          mock: {
            state: {},
            isLoading: false,
          },
          mock2: {
            state: {},
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
          mock2: mockDatasource2,
        }}
        framePublicAPI={framePublicAPI}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        visualizationState={{}}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
        core={coreMock.createSetup()}
      />
    );

    expect(
      (instance.find(expressionRendererMock).prop('expression') as Ast).chain[2].arguments.layerIds
    ).toEqual(['first', 'second', 'third']);
    expect(
      (instance.find(expressionRendererMock).prop('expression') as Ast).chain[2].arguments.tables
    ).toMatchInlineSnapshot(`
                                    Array [
                                      Object {
                                        "chain": Array [
                                          Object {
                                            "arguments": Object {},
                                            "function": "datasource",
                                            "type": "function",
                                          },
                                        ],
                                        "type": "expression",
                                      },
                                      Object {
                                        "chain": Array [
                                          Object {
                                            "arguments": Object {},
                                            "function": "datasource2",
                                            "type": "function",
                                          },
                                        ],
                                        "type": "expression",
                                      },
                                      Object {
                                        "chain": Array [
                                          Object {
                                            "arguments": Object {},
                                            "function": "datasource2",
                                            "type": "function",
                                          },
                                        ],
                                        "type": "expression",
                                      },
                                    ]
                        `);
  });

  it('should run the expression again if the date range changes', async () => {
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    mockDatasource.getLayers.mockReturnValue(['first']);

    mockDatasource.toExpression
      .mockReturnValueOnce('datasource')
      .mockReturnValueOnce('datasource second');

    expressionRendererMock = jest.fn(_arg => <span />);

    instance = mount(
      <InnerWorkspacePanel
        activeDatasourceId={'mock'}
        datasourceStates={{
          mock: {
            state: {},
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        visualizationState={{}}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
        core={coreMock.createSetup()}
      />
    );

    // "wait" for the expression to execute
    await waitForPromises();
    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(1);

    instance.setProps({
      framePublicAPI: { ...framePublicAPI, dateRange: { fromDate: 'now-90d', toDate: 'now-30d' } },
    });

    await waitForPromises();
    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(2);
  });

  it('should run the expression again if the filters change', async () => {
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    mockDatasource.getLayers.mockReturnValue(['first']);

    mockDatasource.toExpression
      .mockReturnValueOnce('datasource')
      .mockReturnValueOnce('datasource second');

    expressionRendererMock = jest.fn(_arg => <span />);

    instance = mount(
      <InnerWorkspacePanel
        activeDatasourceId={'mock'}
        datasourceStates={{
          mock: {
            state: {},
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        visualizationState={{}}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
        core={coreMock.createSetup()}
      />
    );

    // "wait" for the expression to execute
    await waitForPromises();
    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(1);

    const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
    const field = ({ name: 'myfield' } as unknown) as IFieldType;

    instance.setProps({
      framePublicAPI: {
        ...framePublicAPI,
        filters: [esFilters.buildExistsFilter(field, indexPattern)],
      },
    });

    await waitForPromises();
    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(2);
  });

  it('should show an error message if the expression fails to parse', () => {
    mockDatasource.toExpression.mockReturnValue('|||');
    mockDatasource.getLayers.mockReturnValue(['first']);
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };

    instance = mount(
      <InnerWorkspacePanel
        activeDatasourceId={'mock'}
        datasourceStates={{
          mock: {
            state: {},
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        visualizationState={{}}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
        core={coreMock.createSetup()}
      />
    );

    expect(instance.find('[data-test-subj="expression-failure"]').first()).toBeTruthy();
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should not attempt to run the expression again if it does not change', async () => {
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['first']);
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };

    instance = mount(
      <InnerWorkspacePanel
        activeDatasourceId={'mock'}
        datasourceStates={{
          mock: {
            state: {},
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        visualizationState={{}}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
        core={coreMock.createSetup()}
      />
    );

    // "wait" for the expression to execute
    await waitForPromises();

    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(1);

    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(1);
  });

  it('should attempt to run the expression again if it changes', async () => {
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['first']);
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };

    instance = mount(
      <InnerWorkspacePanel
        activeDatasourceId={'mock'}
        datasourceStates={{
          mock: {
            state: {},
            isLoading: false,
          },
        }}
        datasourceMap={{
          mock: mockDatasource,
        }}
        framePublicAPI={framePublicAPI}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        visualizationState={{}}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
        core={coreMock.createSetup()}
      />
    );

    // "wait" for the expression to execute
    await waitForPromises();

    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(1);

    expressionRendererMock.mockImplementation(_ => {
      return <span />;
    });

    instance.setProps({ visualizationState: {} });
    instance.update();

    expect(expressionRendererMock).toHaveBeenCalledTimes(2);

    expect(instance.find(expressionRendererMock)).toHaveLength(1);
  });

  describe('suggestions from dropping in workspace panel', () => {
    let mockDispatch: jest.Mock;
    let frame: jest.Mocked<FramePublicAPI>;

    const draggedField: unknown = {};

    beforeEach(() => {
      frame = createMockFramePublicAPI();
      mockDispatch = jest.fn();
    });

    function initComponent(draggingContext: unknown = draggedField) {
      instance = mount(
        <ChildDragDropProvider dragging={draggingContext} setDragging={() => {}}>
          <InnerWorkspacePanel
            activeDatasourceId={'mock'}
            datasourceStates={{
              mock: {
                state: {},
                isLoading: false,
              },
            }}
            datasourceMap={{
              mock: mockDatasource,
            }}
            framePublicAPI={frame}
            activeVisualizationId={'vis'}
            visualizationMap={{
              vis: mockVisualization,
              vis2: mockVisualization2,
            }}
            visualizationState={{}}
            dispatch={mockDispatch}
            ExpressionRenderer={expressionRendererMock}
            core={coreMock.createSetup()}
          />
        </ChildDragDropProvider>
      );
    }

    it('should immediately transition if exactly one suggestion is returned', () => {
      const expectedTable: TableSuggestion = {
        isMultiRow: true,
        layerId: '1',
        columns: [],
        changeType: 'unchanged',
      };
      mockDatasource.getDatasourceSuggestionsForField.mockReturnValueOnce([
        {
          state: {},
          table: expectedTable,
          keptLayerIds: [],
        },
      ]);
      mockVisualization.getSuggestions.mockReturnValueOnce([
        {
          score: 0.5,
          title: 'my title',
          state: {},
          previewIcon: 'empty',
        },
      ]);
      initComponent();

      instance.find(DragDrop).prop('onDrop')!(draggedField);

      expect(mockDatasource.getDatasourceSuggestionsForField).toHaveBeenCalledTimes(1);
      expect(mockVisualization.getSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({
          table: expectedTable,
        })
      );
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SWITCH_VISUALIZATION',
        newVisualizationId: 'vis',
        initialState: {},
        datasourceState: {},
        datasourceId: 'mock',
      });
    });

    it('should allow to drop if there are suggestions', () => {
      mockDatasource.getDatasourceSuggestionsForField.mockReturnValueOnce([
        {
          state: {},
          table: {
            isMultiRow: true,
            layerId: '1',
            columns: [],
            changeType: 'unchanged',
          },
          keptLayerIds: [],
        },
      ]);
      mockVisualization.getSuggestions.mockReturnValueOnce([
        {
          score: 0.5,
          title: 'my title',
          state: {},
          previewIcon: 'empty',
        },
      ]);
      initComponent();
      expect(instance.find(DragDrop).prop('droppable')).toBeTruthy();
    });

    it('should refuse to drop if there only suggestions from other visualizations if there are data tables', () => {
      frame.datasourceLayers.a = mockDatasource.publicAPIMock;
      mockDatasource.publicAPIMock.getTableSpec.mockReturnValue([{ columnId: 'a' }]);
      mockDatasource.getDatasourceSuggestionsForField.mockReturnValueOnce([
        {
          state: {},
          table: {
            isMultiRow: true,
            layerId: '1',
            columns: [],
            changeType: 'unchanged',
          },
          keptLayerIds: [],
        },
      ]);
      mockVisualization2.getSuggestions.mockReturnValueOnce([
        {
          score: 0.5,
          title: 'my title',
          state: {},
          previewIcon: 'empty',
        },
      ]);
      initComponent();
      expect(instance.find(DragDrop).prop('droppable')).toBeFalsy();
    });

    it('should allow to drop if there are suggestions from active visualization even if there are data tables', () => {
      frame.datasourceLayers.a = mockDatasource.publicAPIMock;
      mockDatasource.publicAPIMock.getTableSpec.mockReturnValue([{ columnId: 'a' }]);
      mockDatasource.getDatasourceSuggestionsForField.mockReturnValueOnce([
        {
          state: {},
          table: {
            isMultiRow: true,
            layerId: '1',
            columns: [],
            changeType: 'unchanged',
          },
          keptLayerIds: [],
        },
      ]);
      mockVisualization.getSuggestions.mockReturnValueOnce([
        {
          score: 0.5,
          title: 'my title',
          state: {},
          previewIcon: 'empty',
        },
      ]);
      initComponent();
      expect(instance.find(DragDrop).prop('droppable')).toBeTruthy();
    });

    it('should refuse to drop if there are no suggestions', () => {
      initComponent();
      expect(instance.find(DragDrop).prop('droppable')).toBeFalsy();
    });

    it('should immediately transition to the first suggestion if there are multiple', () => {
      mockDatasource.getDatasourceSuggestionsForField.mockReturnValueOnce([
        {
          state: {},
          table: {
            isMultiRow: true,
            columns: [],
            layerId: '1',
            changeType: 'unchanged',
          },
          keptLayerIds: [],
        },
        {
          state: {},
          table: {
            isMultiRow: true,
            columns: [],
            layerId: '1',
            changeType: 'unchanged',
          },
          keptLayerIds: [],
        },
      ]);
      mockVisualization.getSuggestions.mockReturnValueOnce([
        {
          score: 0.5,
          title: 'second suggestion',
          state: {},
          previewIcon: 'empty',
        },
      ]);
      mockVisualization.getSuggestions.mockReturnValueOnce([
        {
          score: 0.8,
          title: 'first suggestion',
          state: {
            isFirst: true,
          },
          previewIcon: 'empty',
        },
      ]);

      initComponent();
      instance.find(DragDrop).prop('onDrop')!(draggedField);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SWITCH_VISUALIZATION',
        newVisualizationId: 'vis',
        initialState: {
          isFirst: true,
        },
        datasourceState: {},
        datasourceId: 'mock',
      });
    });
  });
});
