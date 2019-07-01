/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ExpressionRendererProps } from '../../../../../../../src/legacy/core_plugins/data/public';
import { Visualization } from '../../types';
import {
  createMockVisualization,
  createMockDatasource,
  createExpressionRendererMock,
  DatasourceMock,
} from '../mocks';
import { WorkspacePanel, WorkspacePanelProps } from './workspace_panel';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { ReactWrapper } from 'enzyme';
import { DragDrop } from '../../drag_drop';

const waitForPromises = () => new Promise(resolve => setTimeout(resolve));

describe('workspace_panel', () => {
  let mockVisualization: jest.Mocked<Visualization>;
  let mockDatasource: DatasourceMock;

  let expressionRendererMock: jest.Mock<React.ReactElement, [ExpressionRendererProps]>;

  let instance: ReactWrapper<WorkspacePanelProps>;

  beforeEach(() => {
    mockVisualization = createMockVisualization();

    mockDatasource = createMockDatasource();

    expressionRendererMock = createExpressionRendererMock();
  });

  afterEach(() => {
    instance.unmount();
  });

  it('should render an explanatory text if no visualization is active', () => {
    instance = mount(
      <WorkspacePanel
        activeDatasource={mockDatasource}
        datasourceState={{}}
        activeVisualizationId={null}
        visualizationMap={{
          vis: mockVisualization,
        }}
        visualizationState={{}}
        datasourcePublicAPI={mockDatasource.publicAPIMock}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
      />
    );

    expect(instance.find('[data-test-subj="empty-workspace"]')).toHaveLength(1);
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should render an explanatory text if the visualization does not produce an expression', () => {
    instance = mount(
      <WorkspacePanel
        activeDatasource={{ ...mockDatasource, toExpression: () => 'datasource' }}
        datasourceState={{}}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => null },
        }}
        visualizationState={{}}
        datasourcePublicAPI={mockDatasource.publicAPIMock}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
      />
    );

    expect(instance.find('[data-test-subj="empty-workspace"]')).toHaveLength(1);
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should render an explanatory text if the datasource does not produce an expression', () => {
    instance = mount(
      <WorkspacePanel
        activeDatasource={{ ...mockDatasource, toExpression: () => null }}
        datasourceState={{}}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        visualizationState={{}}
        datasourcePublicAPI={mockDatasource.publicAPIMock}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
      />
    );

    expect(instance.find('[data-test-subj="empty-workspace"]')).toHaveLength(1);
    expect(instance.find(expressionRendererMock)).toHaveLength(0);
  });

  it('should render the resulting expression using the expression renderer', () => {
    instance = mount(
      <WorkspacePanel
        activeDatasource={{
          ...mockDatasource,
          toExpression: () => 'datasource',
        }}
        datasourceState={{}}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        visualizationState={{}}
        datasourcePublicAPI={mockDatasource.publicAPIMock}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
      />
    );

    expect(instance.find(expressionRendererMock).prop('expression')).toMatchInlineSnapshot(`
Object {
  "chain": Array [
    Object {
      "arguments": Object {},
      "function": "datasource",
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

  describe('expression failures', () => {
    it('should show an error message if the expression fails to parse', () => {
      instance = mount(
        <WorkspacePanel
          activeDatasource={{
            ...mockDatasource,
            toExpression: () => 'datasource ||',
          }}
          datasourceState={{}}
          activeVisualizationId="vis"
          visualizationMap={{
            vis: { ...mockVisualization, toExpression: () => 'vis' },
          }}
          visualizationState={{}}
          datasourcePublicAPI={mockDatasource.publicAPIMock}
          dispatch={() => {}}
          ExpressionRenderer={expressionRendererMock}
        />
      );

      expect(instance.find('[data-test-subj="expression-failure"]')).toHaveLength(1);
      expect(instance.find(expressionRendererMock)).toHaveLength(0);
    });

    it('should show an error message if the expression fails to render', async () => {
      expressionRendererMock = jest.fn(({ onRenderFailure }) => {
        Promise.resolve().then(() => onRenderFailure!({ type: 'error' }));
        return <span />;
      });

      instance = mount(
        <WorkspacePanel
          activeDatasource={{
            ...mockDatasource,
            toExpression: () => 'datasource',
          }}
          datasourceState={{}}
          activeVisualizationId="vis"
          visualizationMap={{
            vis: { ...mockVisualization, toExpression: () => 'vis' },
          }}
          visualizationState={{}}
          datasourcePublicAPI={mockDatasource.publicAPIMock}
          dispatch={() => {}}
          ExpressionRenderer={expressionRendererMock}
        />
      );

      // "wait" for the expression to execute
      await waitForPromises();

      instance.update();

      expect(instance.find('[data-test-subj="expression-failure"]')).toHaveLength(1);
      expect(instance.find(expressionRendererMock)).toHaveLength(0);
    });

    it('should not attempt to run the expression again if it does not change', async () => {
      expressionRendererMock = jest.fn(({ onRenderFailure }) => {
        Promise.resolve().then(() => onRenderFailure!({ type: 'error' }));
        return <span />;
      });

      instance = mount(
        <WorkspacePanel
          activeDatasource={{
            ...mockDatasource,
            toExpression: () => 'datasource',
          }}
          datasourceState={{}}
          activeVisualizationId="vis"
          visualizationMap={{
            vis: { ...mockVisualization, toExpression: () => 'vis' },
          }}
          visualizationState={{}}
          datasourcePublicAPI={mockDatasource.publicAPIMock}
          dispatch={() => {}}
          ExpressionRenderer={expressionRendererMock}
        />
      );

      // "wait" for the expression to execute
      await waitForPromises();

      instance.update();

      expect(expressionRendererMock).toHaveBeenCalledTimes(1);

      instance.update();

      expect(expressionRendererMock).toHaveBeenCalledTimes(1);
    });

    it('should attempt to run the expression again if changes after an error', async () => {
      expressionRendererMock = jest.fn(({ onRenderFailure }) => {
        Promise.resolve().then(() => onRenderFailure!({ type: 'error' }));
        return <span />;
      });

      instance = mount(
        <WorkspacePanel
          activeDatasource={{
            ...mockDatasource,
            toExpression: () => 'datasource',
          }}
          datasourceState={{}}
          activeVisualizationId="vis"
          visualizationMap={{
            vis: { ...mockVisualization, toExpression: () => 'vis' },
          }}
          visualizationState={{}}
          datasourcePublicAPI={mockDatasource.publicAPIMock}
          dispatch={() => {}}
          ExpressionRenderer={expressionRendererMock}
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
  });

  describe('suggestions from dropping in workspace panel', () => {
    let mockDispatch: jest.Mock;

    beforeEach(() => {
      mockDispatch = jest.fn();
      instance = mount(
        <WorkspacePanel
          activeDatasource={mockDatasource}
          datasourceState={{}}
          activeVisualizationId={null}
          visualizationMap={{
            vis: mockVisualization,
          }}
          visualizationState={{}}
          datasourcePublicAPI={mockDatasource.publicAPIMock}
          dispatch={mockDispatch}
          ExpressionRenderer={expressionRendererMock}
        />
      );
    });

    it('should immediately transition if exactly one suggestion is returned', () => {
      const expectedTable = {
        datasourceSuggestionId: 0,
        isMultiRow: true,
        columns: [],
      };
      mockDatasource.getDatasourceSuggestionsForField.mockReturnValueOnce([
        {
          state: {},
          table: expectedTable,
        },
      ]);
      mockVisualization.getSuggestions.mockReturnValueOnce([
        {
          score: 0.5,
          title: 'my title',
          state: {},
          datasourceSuggestionId: 0,
          previewIcon: 'empty',
        },
      ]);

      instance.find(DragDrop).prop('onDrop')!({
        name: '@timestamp',
        type: 'date',
        searchable: false,
        aggregatable: false,
      });

      expect(mockDatasource.getDatasourceSuggestionsForField).toHaveBeenCalledTimes(1);
      expect(mockVisualization.getSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({
          tables: [expectedTable],
        })
      );
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SWITCH_VISUALIZATION',
        newVisualizationId: 'vis',
        initialState: {},
        datasourceState: {},
      });
    });

    it('should immediately transition to the first suggestion if there are multiple', () => {
      mockDatasource.getDatasourceSuggestionsForField.mockReturnValueOnce([
        {
          state: {},
          table: {
            datasourceSuggestionId: 0,
            isMultiRow: true,
            columns: [],
          },
        },
        {
          state: {},
          table: {
            datasourceSuggestionId: 1,
            isMultiRow: true,
            columns: [],
          },
        },
      ]);
      mockVisualization.getSuggestions.mockReturnValueOnce([
        {
          score: 0.8,
          title: 'first suggestion',
          state: {
            isFirst: true,
          },
          datasourceSuggestionId: 1,
          previewIcon: 'empty',
        },
        {
          score: 0.5,
          title: 'second suggestion',
          state: {},
          datasourceSuggestionId: 0,
          previewIcon: 'empty',
        },
      ]);

      instance.find(DragDrop).prop('onDrop')!({
        name: '@timestamp',
        type: 'date',
        searchable: false,
        aggregatable: false,
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SWITCH_VISUALIZATION',
        newVisualizationId: 'vis',
        initialState: {
          isFirst: true,
        },
        datasourceState: {},
      });
    });

    it("should do nothing when the visualization can't use the suggestions", () => {
      instance.find(DragDrop).prop('onDrop')!({
        name: '@timestamp',
        type: 'date',
        searchable: false,
        aggregatable: false,
      });

      expect(mockDatasource.getDatasourceSuggestionsForField).toHaveBeenCalledTimes(1);
      expect(mockVisualization.getSuggestions).toHaveBeenCalledTimes(1);
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});
