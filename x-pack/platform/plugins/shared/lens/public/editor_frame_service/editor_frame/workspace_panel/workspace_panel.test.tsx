/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DatasourceMap, UserMessage, VisualizationMap } from '@kbn/lens-common';
import { fireEvent, screen, act, waitFor, within } from '@testing-library/react';
import {
  createMockVisualization,
  createMockDatasource,
  createExpressionRendererMock,
  createMockFramePublicAPI,
  createMockedDragDropContext,
  renderWithReduxStore,
} from '../../../mocks';

import { mockDataPlugin } from '../../../mocks';

import { WorkspacePanel } from './workspace_panel';

import { ChildDragDropProvider } from '@kbn/dom-drag-drop';
import { buildExistsFilter } from '@kbn/es-query';
import { coreMock } from '@kbn/core/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { FieldSpec } from '@kbn/data-plugin/common';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public/embeddable/events';
import type { Trigger } from '@kbn/ui-actions-plugin/public';
import {
  applyChanges,
  setState,
  updateDatasourceState,
  updateVisualizationState,
} from '../../../state_management';
import { getLensInspectorService } from '../../../lens_inspector_service';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { disableAutoApply, enableAutoApply } from '../../../state_management/lens_slice';
import type { Ast } from '@kbn/interpreter';
import { toExpression } from '@kbn/interpreter';
import { faker } from '@faker-js/faker';
import { EditorFrameServiceProvider } from '../../editor_frame_service_context';

const defaultPermissions: Record<string, Record<string, boolean | Record<string, boolean>>> = {
  navLinks: { management: true },
  management: { kibana: { indexPatterns: true } },
};

function createCoreStartWithPermissions(newCapabilities = defaultPermissions) {
  const core = coreMock.createStart();
  (core.application.capabilities as unknown as Record<
    string,
    Record<string, boolean | Record<string, boolean>>
  >) = newCapabilities;
  return core;
}

let mockVisualization: ReturnType<typeof createMockVisualization>;
let mockVisualization2: ReturnType<typeof createMockVisualization>;
let mockDatasource: ReturnType<typeof createMockDatasource>;

let expressionRendererMock: ReturnType<typeof createExpressionRendererMock>;
const trigger = { exec: jest.fn() } as unknown as jest.Mocked<Trigger>;
const uiActionsMock = uiActionsPluginMock.createStartContract();
uiActionsMock.getTrigger.mockReturnValue(trigger);

let defaultDatasourceMap: DatasourceMap;
let defaultVisualizationMap: VisualizationMap;

const defaultProps = {
  framePublicAPI: createMockFramePublicAPI(),
  ExpressionRenderer: createExpressionRendererMock(),
  core: createCoreStartWithPermissions(),
  plugins: {
    uiActions: uiActionsPluginMock.createStartContract(),
    data: mockDataPlugin(),
  },
  getSuggestionForField: () => undefined,
  lensInspector: getLensInspectorService(inspectorPluginMock.createStartContract()),
  toggleFullscreen: jest.fn(),
  getUserMessages: jest.fn(() => []),
  addUserMessages: jest.fn(() => () => {}),
};

const toExpr = (
  datasourceExpressionsByLayers: Record<string, Ast>,
  fn: string = 'testVis',
  layerId: string = 'first'
) =>
  toExpression({
    type: 'expression',
    chain: [
      ...(datasourceExpressionsByLayers[layerId]?.chain ?? []),
      { type: 'function', function: fn, arguments: {} },
    ],
  });

describe('workspace_panel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVisualization = createMockVisualization();
    mockVisualization2 = createMockVisualization();
    mockDatasource = createMockDatasource();
    defaultDatasourceMap = {};
    defaultVisualizationMap = { testVis: mockVisualization };
    expressionRendererMock = createExpressionRendererMock();
  });

  it('should render an explanatory text if no visualization is active', async () => {
    renderWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <WorkspacePanel {...defaultProps} />,
      </EditorFrameServiceProvider>,
      {},
      {
        preloadedState: {
          visualization: { activeId: null, state: {}, selectedLayerId: null },
          datasourceStates: {},
        },
      }
    );
    expect(screen.getByText('Drop some fields here to start')).toBeInTheDocument();
    expect(screen.queryByText('Expression renderer mock')).not.toBeInTheDocument();
  });

  it('should render an explanatory text if the visualization does not produce an expression', async () => {
    renderWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={{
          testVis: { ...mockVisualization, toExpression: () => null },
        }}
        datasourceMap={defaultDatasourceMap}
      >
        <WorkspacePanel {...defaultProps} />
      </EditorFrameServiceProvider>,
      {},
      { preloadedState: { datasourceStates: {} } }
    );
    expect(screen.getByText('Drop some fields here to start')).toBeInTheDocument();
    expect(screen.queryByText('Expression renderer mock')).not.toBeInTheDocument();
  });

  it('should render an explanatory text if the datasource does not produce an expression', async () => {
    renderWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={{
          testVis: {
            ...mockVisualization,
            toExpression: (state, datasourceLayers, attrs, datasourceExpressionsByLayers = {}) =>
              toExpr(datasourceExpressionsByLayers),
          },
        }}
        datasourceMap={defaultDatasourceMap}
      >
        <WorkspacePanel {...defaultProps} />
      </EditorFrameServiceProvider>,
      {},
      { preloadedState: { datasourceStates: {} } }
    );
    expect(screen.getByText('Drop some fields here to start')).toBeInTheDocument();
    expect(screen.queryByText('Expression renderer mock')).not.toBeInTheDocument();
  });

  it('should render the resulting expression using the expression renderer', async () => {
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['first']);

    renderWithReduxStore(
      <EditorFrameServiceProvider
        datasourceMap={{
          formBased: mockDatasource,
        }}
        visualizationMap={{
          testVis: {
            ...mockVisualization,
            toExpression: (state, datasourceLayers, attrs, datasourceExpressionsByLayers = {}) =>
              toExpr(datasourceExpressionsByLayers),
          },
        }}
      >
        <WorkspacePanel
          {...defaultProps}
          ExpressionRenderer={expressionRendererMock}
          framePublicAPI={framePublicAPI}
        />
      </EditorFrameServiceProvider>
    );
    expect(screen.getByText('datasource | testVis')).toBeInTheDocument();
  });

  it.each([undefined, 3])(
    'should apply each request once when auto-apply disabled (initial counter: %s)',
    async (applyChangesCounter) => {
      const framePublicAPI = createMockFramePublicAPI();
      framePublicAPI.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
      mockDatasource.toExpression.mockReturnValue('datasource');
      mockDatasource.getLayers.mockReturnValue(['first']);

      const { rerender, store } = renderWithReduxStore(
        <EditorFrameServiceProvider
          datasourceMap={{
            formBased: mockDatasource,
          }}
          visualizationMap={{
            testVis: {
              ...mockVisualization,
              toExpression: (state, datasourceLayers, attrs, datasourceExpressionsByLayers = {}) =>
                toExpr(datasourceExpressionsByLayers),
            },
          }}
        >
          <WorkspacePanel
            {...defaultProps}
            framePublicAPI={framePublicAPI}
            ExpressionRenderer={expressionRendererMock}
          />
        </EditorFrameServiceProvider>,
        {},
        {
          preloadedState: {
            autoApplyDisabled: true,
            applyChangesCounter,
          },
        }
      );

      expect(screen.getByText('datasource | testVis')).toBeInTheDocument();

      mockDatasource.toExpression.mockReturnValue('new-datasource');
      rerender(
        <EditorFrameServiceProvider
          datasourceMap={{
            formBased: mockDatasource,
          }}
          visualizationMap={{
            testVis: {
              ...mockVisualization,
              toExpression: (state, datasourceLayers, attrs, datasourceExpressionsByLayers = {}) =>
                toExpr(datasourceExpressionsByLayers, 'new-vis'),
            },
          }}
        >
          <WorkspacePanel
            {...defaultProps}
            framePublicAPI={framePublicAPI}
            ExpressionRenderer={expressionRendererMock}
          />
        </EditorFrameServiceProvider>
      );

      expect(screen.getByText('datasource | testVis')).toBeInTheDocument();

      act(() => {
        store.dispatch(applyChanges());
      });

      expect(screen.getByText('new-datasource | new-vis')).toBeInTheDocument();

      mockDatasource.toExpression.mockReturnValue('other-new-datasource');

      act(() => {
        rerender(
          <EditorFrameServiceProvider
            datasourceMap={{
              formBased: mockDatasource,
            }}
            visualizationMap={{
              testVis: {
                ...mockVisualization,
                toExpression: (
                  state,
                  datasourceLayers,
                  attrs,
                  datasourceExpressionsByLayers = {}
                ) => toExpr(datasourceExpressionsByLayers, 'other-new-vis'),
              },
            }}
          >
            <WorkspacePanel
              {...defaultProps}
              framePublicAPI={framePublicAPI}
              ExpressionRenderer={expressionRendererMock}
            />
          </EditorFrameServiceProvider>
        );
      });

      expect(screen.getByText('new-datasource | new-vis')).toBeInTheDocument();

      act(() => {
        store.dispatch(applyChanges());
      });
      expect(screen.getByText('other-new-datasource | other-new-vis')).toBeInTheDocument();

      act(() => {
        store.dispatch(enableAutoApply());
      });
      expect(screen.getByText('other-new-datasource | other-new-vis')).toBeInTheDocument();
    }
  );

  it('should base saveability on working changes when auto-apply disabled', async () => {
    const framePublicAPI = createMockFramePublicAPI();
    framePublicAPI.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    mockDatasource.toExpression.mockReturnValue('datasource');
    mockDatasource.getLayers.mockReturnValue(['first']);

    let userMessages: UserMessage[] = [];

    const { store } = renderWithReduxStore(
      <EditorFrameServiceProvider
        datasourceMap={{
          formBased: mockDatasource,
        }}
        visualizationMap={{
          testVis: {
            ...mockVisualization,
            toExpression: (state, datasourceLayers, attrs, datasourceExpressionsByLayers = {}) =>
              toExpr(datasourceExpressionsByLayers),
          },
        }}
      >
        <WorkspacePanel
          {...defaultProps}
          getUserMessages={() => userMessages}
          framePublicAPI={framePublicAPI}
          ExpressionRenderer={expressionRendererMock}
        />
      </EditorFrameServiceProvider>
    );

    const isSaveable = () => store.getState().lens.isSaveable;

    // allows initial render
    expect(screen.getByText('datasource | testVis')).toBeInTheDocument();

    expect(isSaveable()).toBe(true);

    // note that populating the user messages and then dispatching a state update is true to
    // how Lens interacts with the workspace panel from its perspective. all the panel does is call
    // that getUserMessages function any time it gets re-rendered (aka state update)
    userMessages = [
      {
        severity: 'error',
        fixableInEditor: true,
        displayLocations: [{ id: 'visualization' }],
        shortMessage: 'hey there',
        longMessage: "i'm another error",
      },
    ] as UserMessage[];

    act(() => {
      store.dispatch(
        updateVisualizationState({
          visualizationId: 'testVis',
          newState: {},
        })
      );
    });

    expect(isSaveable()).toBe(false);
  });

  describe('enzyme tests', () => {
    it('should show proper workspace prompts when auto-apply disabled', async () => {
      const framePublicAPI = createMockFramePublicAPI();
      framePublicAPI.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };

      const renderWorkspace = (visualizationExpression: () => string | null) => (
        <EditorFrameServiceProvider
          datasourceMap={{ formBased: mockDatasource }}
          visualizationMap={{
            testVis: { ...mockVisualization, toExpression: visualizationExpression },
          }}
        >
          <WorkspacePanel
            {...defaultProps}
            framePublicAPI={framePublicAPI}
            ExpressionRenderer={expressionRendererMock}
          />
        </EditorFrameServiceProvider>
      );

      const configureValidVisualization = () => {
        mockVisualization.toExpression.mockReturnValue('testVis');
        mockDatasource.toExpression.mockReturnValue('datasource');
        mockDatasource.getLayers.mockReturnValue(['first']);
        mounted.rerender(renderWorkspace(() => 'new-vis'));
      };

      const deleteVisualization = () => {
        mounted.rerender(renderWorkspace(() => null));
      };

      const dragDropPromptShowing = () => screen.queryByTestId('workspace-drag-drop-prompt');
      const applyChangesPromptShowing = () =>
        screen.queryByTestId('workspace-apply-changes-prompt');
      const visualizationShowing = () => screen.queryByTestId('lnsExpressionRenderer');

      const mounted = renderWithReduxStore(
        renderWorkspace(() => null),
        {},
        {
          preloadedState: { autoApplyDisabled: true },
        }
      );

      expect(dragDropPromptShowing()).toBeTruthy();

      configureValidVisualization();

      expect(dragDropPromptShowing()).toBeFalsy();
      expect(applyChangesPromptShowing()).toBeTruthy();

      fireEvent.click(screen.getByTestId('lnsApplyChanges__toolbar'));

      expect(visualizationShowing()).toBeTruthy();

      deleteVisualization();

      expect(visualizationShowing()).toBeTruthy();

      act(() => {
        mounted.store.dispatch(applyChanges());
      });

      expect(visualizationShowing()).toBeFalsy();
      expect(dragDropPromptShowing()).toBeTruthy();

      configureValidVisualization();

      expect(dragDropPromptShowing()).toBeFalsy();
      expect(applyChangesPromptShowing()).toBeTruthy();
    });

    it('should execute a trigger on expression event', async () => {
      const framePublicAPI = createMockFramePublicAPI();
      framePublicAPI.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
      mockDatasource.toExpression.mockReturnValue('datasource');
      mockDatasource.getLayers.mockReturnValue(['first']);
      const props = defaultProps;

      renderWithReduxStore(
        <EditorFrameServiceProvider
          datasourceMap={{
            formBased: mockDatasource,
          }}
          visualizationMap={{
            testVis: { ...mockVisualization, toExpression: () => 'testVis' },
          }}
        >
          <WorkspacePanel
            {...props}
            framePublicAPI={framePublicAPI}
            ExpressionRenderer={expressionRendererMock}
            plugins={{ ...props.plugins, uiActions: uiActionsMock }}
          />
        </EditorFrameServiceProvider>
      );

      await waitFor(() => expect(expressionRendererMock).toHaveBeenCalled());
      const onEvent = expressionRendererMock.mock.calls[0][0].onEvent!;

      const eventData = { myData: true, table: { rows: [], columns: [] }, column: 0 };
      onEvent({ name: 'brush', data: eventData });

      expect(uiActionsMock.executeTriggerActions).toHaveBeenCalledWith(VIS_EVENT_TO_TRIGGER.brush, {
        data: { ...eventData, timeFieldName: undefined },
      });
    });

    it('should execute a multi value click trigger on expression event', async () => {
      const framePublicAPI = createMockFramePublicAPI();
      framePublicAPI.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
      mockDatasource.toExpression.mockReturnValue('datasource');
      mockDatasource.getLayers.mockReturnValue(['first']);
      const props = defaultProps;

      renderWithReduxStore(
        <EditorFrameServiceProvider
          datasourceMap={{
            formBased: mockDatasource,
          }}
          visualizationMap={{
            testVis: { ...mockVisualization, toExpression: () => 'testVis' },
          }}
        >
          <WorkspacePanel
            {...props}
            framePublicAPI={framePublicAPI}
            ExpressionRenderer={expressionRendererMock}
            plugins={{ ...props.plugins, uiActions: uiActionsMock }}
          />
        </EditorFrameServiceProvider>
      );

      await waitFor(() => expect(expressionRendererMock).toHaveBeenCalled());
      const onEvent = expressionRendererMock.mock.calls[0][0].onEvent!;

      const eventData = {
        data: [{ table: { rows: [], columns: [] }, cells: [{ column: 0, row: 0 }] }],
      };
      onEvent({ name: 'multiFilter', data: eventData });

      expect(uiActionsMock.executeTriggerActions).toHaveBeenCalledWith(
        VIS_EVENT_TO_TRIGGER.multiFilter,
        {
          data: { ...eventData, timeFieldName: undefined },
        }
      );
    });

    it('should call getTriggerCompatibleActions on hasCompatibleActions call from within renderer', async () => {
      const framePublicAPI = createMockFramePublicAPI();
      framePublicAPI.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
      mockDatasource.toExpression.mockReturnValue('datasource');
      mockDatasource.getLayers.mockReturnValue(['first']);
      const props = defaultProps;

      renderWithReduxStore(
        <EditorFrameServiceProvider
          datasourceMap={{
            formBased: mockDatasource,
          }}
          visualizationMap={{
            testVis: { ...mockVisualization, toExpression: () => 'testVis' },
          }}
        >
          <WorkspacePanel
            {...props}
            framePublicAPI={framePublicAPI}
            ExpressionRenderer={expressionRendererMock}
            plugins={{ ...props.plugins, uiActions: uiActionsMock }}
          />
        </EditorFrameServiceProvider>
      );

      await waitFor(() => expect(expressionRendererMock).toHaveBeenCalled());
      const hasCompatibleActions = expressionRendererMock.mock.calls[0][0].hasCompatibleActions!;

      const eventData = { myData: true, table: { rows: [], columns: [] }, column: 0 };
      hasCompatibleActions({ name: 'filter', data: eventData });

      expect(uiActionsMock.getTriggerCompatibleActions).toHaveBeenCalledWith(
        VIS_EVENT_TO_TRIGGER.filter,
        expect.objectContaining({ data: eventData })
      );
    });

    it('should push add current data table to state on data$ emitting value', async () => {
      const framePublicAPI = createMockFramePublicAPI();
      framePublicAPI.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
      mockDatasource.toExpression.mockReturnValue('datasource');
      mockDatasource.getLayers.mockReturnValue(['table1']);

      const mounted = renderWithReduxStore(
        <EditorFrameServiceProvider
          datasourceMap={{
            formBased: mockDatasource,
          }}
          visualizationMap={{
            testVis: { ...mockVisualization, toExpression: () => 'testVis' },
          }}
        >
          <WorkspacePanel
            {...defaultProps}
            framePublicAPI={framePublicAPI}
            ExpressionRenderer={expressionRendererMock}
          />
        </EditorFrameServiceProvider>
      );

      await waitFor(() => expect(expressionRendererMock).toHaveBeenCalled());
      const onData = expressionRendererMock.mock.calls[0][0].onData$!;

      const tablesData = {
        table1: { columns: [], rows: [] },
        table2: { columns: [], rows: [] },
      };
      act(() => {
        onData(undefined, { tables: { tables: tablesData } });
      });

      expect(mounted.store.dispatch).toHaveBeenCalledWith({
        type: 'lens/onActiveDataChange',
        payload: {
          activeData: tablesData,
        },
      });
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

      expressionRendererMock = jest.fn((_arg) => <span />);

      const mounted = renderWithReduxStore(
        <EditorFrameServiceProvider
          datasourceMap={{
            formBased: mockDatasource,
          }}
          visualizationMap={{
            testVis: { ...mockVisualization, toExpression: () => 'testVis' },
          }}
        >
          <WorkspacePanel
            {...defaultProps}
            framePublicAPI={framePublicAPI}
            ExpressionRenderer={expressionRendererMock}
          />
        </EditorFrameServiceProvider>
      );

      await waitFor(() => expect(expressionRendererMock).toHaveBeenCalledTimes(2));

      mounted.rerender(
        <EditorFrameServiceProvider
          datasourceMap={{ formBased: mockDatasource }}
          visualizationMap={{
            testVis: { ...mockVisualization, toExpression: () => 'testVis' },
          }}
        >
          <WorkspacePanel
            {...defaultProps}
            framePublicAPI={{
              ...framePublicAPI,
              dateRange: { fromDate: 'now-90d', toDate: 'now-30d' },
            }}
            ExpressionRenderer={expressionRendererMock}
          />
        </EditorFrameServiceProvider>
      );

      await waitFor(() => expect(expressionRendererMock).toHaveBeenCalledTimes(3));
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

      expressionRendererMock = jest.fn((_arg) => <span />);
      const mounted = renderWithReduxStore(
        <EditorFrameServiceProvider
          datasourceMap={{
            formBased: mockDatasource,
          }}
          visualizationMap={{
            testVis: { ...mockVisualization, toExpression: () => 'testVis' },
          }}
        >
          <WorkspacePanel
            {...defaultProps}
            framePublicAPI={framePublicAPI}
            ExpressionRenderer={expressionRendererMock}
          />
        </EditorFrameServiceProvider>
      );

      await waitFor(() => expect(expressionRendererMock).toHaveBeenCalledTimes(2));

      const indexPattern = { id: 'index1' } as unknown as DataView;
      const field = { name: 'myfield' } as unknown as FieldSpec;

      mounted.rerender(
        <EditorFrameServiceProvider
          datasourceMap={{ formBased: mockDatasource }}
          visualizationMap={{
            testVis: { ...mockVisualization, toExpression: () => 'testVis' },
          }}
        >
          <WorkspacePanel
            {...defaultProps}
            framePublicAPI={{
              ...framePublicAPI,
              filters: [buildExistsFilter(field, indexPattern)],
            }}
            ExpressionRenderer={expressionRendererMock}
          />
        </EditorFrameServiceProvider>
      );

      await waitFor(() => expect(expressionRendererMock).toHaveBeenCalledTimes(3));
    });

    it('should show configuration error messages if present', async () => {
      const messages: UserMessage[] = [
        {
          uniqueId: 'unique_id_1',
          severity: 'error',
          fixableInEditor: true,
          displayLocations: [{ id: 'visualization' }],
          shortMessage: 'hey there',
          longMessage: "i'm an error",
        },
        {
          uniqueId: 'unique_id_2',
          severity: 'error',
          fixableInEditor: true,
          displayLocations: [{ id: 'visualization' }],
          shortMessage: 'hey there',
          longMessage: "i'm another error",
        },
      ];

      const getUserMessages = jest.fn(() => messages);

      renderWithReduxStore(
        <EditorFrameServiceProvider
          datasourceMap={{
            formBased: mockDatasource,
          }}
          visualizationMap={defaultVisualizationMap}
        >
          <WorkspacePanel {...defaultProps} getUserMessages={getUserMessages} />
        </EditorFrameServiceProvider>
      );

      expect(
        within(screen.getByTestId('workspace-error-message')).getByText("i'm an error")
      ).toBeInTheDocument();
      expect(screen.getByTestId('workspace-error-message')).toHaveTextContent(
        /^hey there i'm an error$/
      );
      expect(screen.queryByTestId('lnsExpressionRenderer')).not.toBeInTheDocument();
      expect(getUserMessages).toHaveBeenCalledWith(['visualization', 'visualizationInEditor'], {
        severity: 'error',
      });
    });

    it('should NOT display config errors for unapplied changes', async () => {
      // this test is important since we don't want the workspace panel to
      // display errors if the user has disabled auto-apply, messed something up,
      // but not yet applied their changes

      let userMessages = [] as UserMessage[];
      const getUserMessageFn = jest.fn(() => userMessages);

      const mounted = renderWithReduxStore(
        <EditorFrameServiceProvider
          datasourceMap={{
            formBased: mockDatasource,
          }}
          visualizationMap={{
            testVis: mockVisualization,
          }}
        >
          <WorkspacePanel {...defaultProps} getUserMessages={getUserMessageFn} />
        </EditorFrameServiceProvider>
      );

      const lensStore = mounted.store;

      const showingErrors = () => screen.queryByTestId('workspace-error-message');

      expect(showingErrors()).toBeFalsy();

      act(() => {
        lensStore.dispatch(disableAutoApply());
      });

      expect(showingErrors()).toBeFalsy();

      // introduce some issues
      userMessages = [
        {
          severity: 'error',
          fixableInEditor: true,
          displayLocations: [{ id: 'visualization' }],
          shortMessage: 'hey there',
          longMessage: "i'm another error",
        },
      ] as UserMessage[];

      act(() => {
        lensStore.dispatch(
          updateDatasourceState({
            datasourceId: 'formBased',
            newDatasourceState: 'newState',
          })
        );
      });

      expect(showingErrors()).toBeFalsy();

      // errors should appear when problem changes are applied
      fireEvent.click(screen.getByTestId('lnsApplyChanges__toolbar'));

      expect(showingErrors()).toBeTruthy();
    });

    // TODO - test refresh after expression failure error
    it('should show an error message if the expression fails to parse', async () => {
      mockDatasource.toExpression.mockReturnValue('|||');
      mockDatasource.getLayers.mockReturnValue(['first']);
      const framePublicAPI = createMockFramePublicAPI();
      framePublicAPI.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };

      let userMessages: UserMessage[] = [];
      const mockRemoveUserMessages = jest.fn();
      const mockAddUserMessages = jest.fn((messages: UserMessage[]) => {
        userMessages = messages;
        return mockRemoveUserMessages;
      });
      const mockGetUserMessages = jest.fn(() => userMessages);

      renderWithReduxStore(
        <EditorFrameServiceProvider
          datasourceMap={{
            formBased: mockDatasource,
          }}
          visualizationMap={{
            testVis: { ...mockVisualization, toExpression: () => 'testVis' },
          }}
        >
          <WorkspacePanel
            {...defaultProps}
            framePublicAPI={framePublicAPI}
            addUserMessages={mockAddUserMessages}
            getUserMessages={mockGetUserMessages}
          />
        </EditorFrameServiceProvider>
      );

      expect(await screen.findByTestId('workspace-error-message')).toHaveTextContent(
        'An unexpected error occurred while preparing the chart'
      );
      expect(mockAddUserMessages.mock.lastCall).toMatchSnapshot();
      expect(screen.queryByTestId('lnsExpressionRenderer')).not.toBeInTheDocument();
    });

    it('should not attempt to run the expression again if it does not change', async () => {
      mockDatasource.toExpression.mockReturnValue('datasource');
      mockDatasource.getLayers.mockReturnValue(['first']);
      const framePublicAPI = createMockFramePublicAPI();
      framePublicAPI.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };

      const workspace = (
        <EditorFrameServiceProvider
          datasourceMap={{
            formBased: mockDatasource,
          }}
          visualizationMap={{
            testVis: { ...mockVisualization, toExpression: () => 'testVis' },
          }}
        >
          <WorkspacePanel
            {...defaultProps}
            framePublicAPI={framePublicAPI}
            ExpressionRenderer={expressionRendererMock}
          />
        </EditorFrameServiceProvider>
      );

      const { rerender } = renderWithReduxStore(workspace);
      await waitFor(() => expect(expressionRendererMock).toHaveBeenCalledTimes(2));

      rerender(workspace);

      await waitFor(() => expect(expressionRendererMock).toHaveBeenCalledTimes(2));
    });

    it('should attempt to run the expression again if it changes', async () => {
      mockDatasource.toExpression.mockReturnValue('datasource');
      mockDatasource.getLayers.mockReturnValue(['first']);
      const framePublicAPI = createMockFramePublicAPI();
      framePublicAPI.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
      const mounted = renderWithReduxStore(
        <EditorFrameServiceProvider
          datasourceMap={{
            formBased: mockDatasource,
          }}
          visualizationMap={{
            testVis: { ...mockVisualization, toExpression: () => 'testVis' },
          }}
        >
          <WorkspacePanel
            {...defaultProps}
            framePublicAPI={framePublicAPI}
            ExpressionRenderer={expressionRendererMock}
          />
        </EditorFrameServiceProvider>
      );
      const lensStore = mounted.store;

      await waitFor(() => expect(expressionRendererMock).toHaveBeenCalledTimes(2));

      expressionRendererMock.mockImplementation((_) => {
        return <span data-test-subj="lnsExpressionRenderer" />;
      });

      act(() => {
        lensStore.dispatch(
          setState({
            visualization: {
              activeId: 'testVis',
              state: {},
              selectedLayerId: null,
            },
          })
        );
      });

      await waitFor(() => expect(expressionRendererMock).toHaveBeenCalledTimes(3));

      expect(screen.getAllByTestId('lnsExpressionRenderer')).toHaveLength(1);
    });
  });

  describe('suggestions from dropping in workspace panel', () => {
    const draggedField = { id: faker.lorem.word(), humanData: { label: faker.lorem.word() } };

    function renderWithDndAndRedux(propsOverrides = {}, draggingContext = draggedField) {
      return renderWithReduxStore(
        <EditorFrameServiceProvider
          datasourceMap={{ formBased: mockDatasource }}
          visualizationMap={{
            testVis: mockVisualization,
            vis2: mockVisualization2,
          }}
        >
          <ChildDragDropProvider value={createMockedDragDropContext({ dragging: draggingContext })}>
            <WorkspacePanel
              {...defaultProps}
              framePublicAPI={createMockFramePublicAPI()}
              getSuggestionForField={jest.fn()}
              {...propsOverrides}
            />
          </ChildDragDropProvider>
        </EditorFrameServiceProvider>
      );
    }

    it('should immediately transition if exactly one suggestion is returned', () => {
      const { store } = renderWithDndAndRedux({
        getSuggestionForField: jest.fn().mockReturnValue({
          visualizationId: 'testVis',
          visualizationState: {},
          datasourceId: 'formBased',
          datasourceState: {},
        }),
      });
      fireEvent.drop(screen.getByTestId('lnsWorkspace'), { dataTransfer: draggedField });
      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'lens/switchVisualization',
        payload: {
          suggestion: {
            newVisualizationId: 'testVis',
            visualizationState: {},
            datasourceId: 'formBased',
            datasourceState: {},
          },
          clearStagedPreview: true,
        },
      });
    });

    it('should allow to drop if there are suggestions', () => {
      renderWithDndAndRedux({
        getSuggestionForField: jest.fn().mockReturnValue({
          visualizationId: 'testVis',
          visualizationState: {},
          datasourceId: 'formBased',
          datasourceState: {},
        }),
      });
      expect(screen.getByTestId('lnsWorkspace').classList).toContain('domDroppable--active');
    });

    it('should refuse to drop if there are no suggestions', () => {
      renderWithDndAndRedux();
      expect(screen.getByTestId('lnsWorkspace').classList).not.toContain('domDroppable--active');
    });
  });
});
