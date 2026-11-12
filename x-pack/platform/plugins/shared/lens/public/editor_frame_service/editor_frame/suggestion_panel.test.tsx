/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  Visualization,
  Suggestion,
  VisualizationMap,
  DatasourceMap,
  LensAppState,
  PreviewState,
  VisualizationState,
} from '@kbn/lens-common';
import type { DatasourceMock } from '../../mocks';
import {
  createMockVisualization,
  createMockDatasource,
  createExpressionRendererMock,
  createMockFramePublicAPI,
  renderWithReduxStore,
} from '../../mocks';
import { act, fireEvent, screen, within } from '@testing-library/react';
import type { ReactExpressionRendererType } from '@kbn/expressions-plugin/public';
import type { SuggestionPanelProps } from './suggestion_panel';
import { SuggestionPanel, SuggestionPanelWrapper } from './suggestion_panel';
import { getSuggestions } from './suggestion_helpers';
import { EuiIcon } from '@elastic/eui';
import { IconChartDatatable } from '@kbn/chart-icons';
import { coreMock } from '@kbn/core/public/mocks';

import { applyChanges, setState, setToggleFullscreen } from '../../state_management';
import { setChangesApplied } from '../../state_management/lens_slice';
import { userEvent } from '@testing-library/user-event';
import { EditorFrameServiceProvider } from '../editor_frame_service_context';

const SELECTORS = {
  APPLY_CHANGES_BUTTON: 'lnsApplyChanges__suggestions',
  SUGGESTIONS_PANEL: 'lnsSuggestionsPanel',
  SUGGESTION_TILE_BUTTON: 'lnsSuggestion',
};

jest.mock('./suggestion_helpers');

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual<typeof import('@elastic/eui')>('@elastic/eui');
  return {
    ...actual,
    EuiIcon: jest.fn((props: React.ComponentProps<typeof actual.EuiIcon>) => (
      <span data-test-subj="mock-eui-icon">
        <actual.EuiIcon {...props} />
      </span>
    )),
  };
});

const getSuggestionsMock = getSuggestions as jest.Mock;
const getSuggestionTile = (name: string) =>
  within(screen.getByTestId(SELECTORS.SUGGESTIONS_PANEL)).getByRole('listitem', { name });

describe('suggestion_panel', () => {
  let mockVisualization: Visualization;
  let mockDatasource: DatasourceMock;

  let expressionRendererMock: ReactExpressionRendererType;

  const suggestion1State = { suggestion1: true };
  const suggestion2State = { suggestion2: true };

  let defaultProps: SuggestionPanelProps;
  let defaultVisualizationMap: VisualizationMap;
  let defaultDatasourceMap: DatasourceMap;

  let preloadedState: Partial<LensAppState>;

  beforeEach(() => {
    mockVisualization = createMockVisualization();
    mockDatasource = createMockDatasource('a');
    expressionRendererMock = createExpressionRendererMock();
    jest.mocked(EuiIcon).mockClear();

    getSuggestionsMock.mockReturnValue([
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion1State,
        visualizationId: 'testVis',
        title: 'Suggestion1',
        keptLayerIds: ['a'],
      },
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion2State,
        visualizationId: 'testVis',
        title: 'Suggestion2',
        keptLayerIds: ['a'],
      },
    ] as Suggestion[]);

    preloadedState = {
      datasourceStates: {
        formBased: {
          isLoading: false,
          state: '',
        },
      },
      visualization: {
        activeId: 'testVis',
        state: {},
        selectedLayerId: null,
      },
      activeDatasourceId: 'formBased',
    };

    defaultProps = {
      ExpressionRenderer: expressionRendererMock,
      frame: createMockFramePublicAPI(),
      getUserMessages: () => [],
      nowProvider: { get: jest.fn(() => new Date()) },
      core: coreMock.createStart(),
    };

    defaultVisualizationMap = {
      testVis: mockVisualization,
      vis2: createMockVisualization('vis2'),
    };

    defaultDatasourceMap = {
      formBased: mockDatasource,
    };
  });

  afterEach(() => {
    localStorage.removeItem('LENS_SUGGESTIONS_PANEL_HIDDEN');
  });

  it('should avoid completely to render SuggestionPanel when in fullscreen mode', async () => {
    const { store } = renderWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <SuggestionPanelWrapper {...defaultProps} />
      </EditorFrameServiceProvider>
    );
    expect(screen.getByTestId(SELECTORS.SUGGESTIONS_PANEL)).toBeInTheDocument();

    act(() => {
      store.dispatch(setToggleFullscreen());
    });
    expect(screen.queryByTestId(SELECTORS.SUGGESTIONS_PANEL)).not.toBeInTheDocument();

    act(() => {
      store.dispatch(setToggleFullscreen());
    });
    expect(screen.getByTestId(SELECTORS.SUGGESTIONS_PANEL)).toBeInTheDocument();
  });

  it('should display apply-changes prompt when changes not applied', async () => {
    const { store } = renderWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <SuggestionPanelWrapper {...defaultProps} />
      </EditorFrameServiceProvider>,
      undefined,
      {
        preloadedState: {
          ...preloadedState,
          visualization: {
            ...preloadedState.visualization,
            state: {
              something: 'changed',
            },
          } as VisualizationState,
          changesApplied: false,
          autoApplyDisabled: true,
        },
      }
    );

    expect(screen.getByTestId(SELECTORS.APPLY_CHANGES_BUTTON)).toBeInTheDocument();
    expect(screen.queryByTestId(SELECTORS.SUGGESTION_TILE_BUTTON)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId(SELECTORS.APPLY_CHANGES_BUTTON));

    // check changes applied
    expect(store.dispatch).toHaveBeenCalledWith(applyChanges());

    // simulate workspace panel behavior
    act(() => {
      store.dispatch(setChangesApplied(true));
    });

    // check UI updated
    expect(screen.queryByTestId(SELECTORS.APPLY_CHANGES_BUTTON)).not.toBeInTheDocument();
    expect(screen.getAllByTestId(SELECTORS.SUGGESTION_TILE_BUTTON).length).toBeGreaterThan(0);
  });

  it('should list passed in suggestions', async () => {
    renderWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <SuggestionPanelWrapper {...defaultProps} />
      </EditorFrameServiceProvider>,
      undefined,
      {
        preloadedState,
      }
    );

    expect(
      within(screen.getByTestId(SELECTORS.SUGGESTIONS_PANEL))
        .getAllByTestId(SELECTORS.SUGGESTION_TILE_BUTTON)
        .map((tile) => tile.getAttribute('aria-label'))
    ).toEqual(['Current visualization', 'Suggestion1', 'Suggestion2']);
  });

  describe('uncommitted suggestions', () => {
    let suggestionState: Pick<LensAppState, 'datasourceStates' | 'visualization'>;
    let stagedPreview: PreviewState;
    beforeEach(() => {
      suggestionState = {
        datasourceStates: {
          formBased: {
            isLoading: false,
            state: '',
          },
        },
        visualization: {
          activeId: 'vis2',
          state: {},
          selectedLayerId: null,
        },
      };

      stagedPreview = {
        datasourceStates: preloadedState.datasourceStates!,
        visualization: preloadedState.visualization!,
      };
    });

    it('should not update suggestions if current state is moved to staged preview', async () => {
      const { store } = renderWithReduxStore(
        <EditorFrameServiceProvider
          visualizationMap={defaultVisualizationMap}
          datasourceMap={defaultDatasourceMap}
        >
          <SuggestionPanelWrapper {...defaultProps} />
        </EditorFrameServiceProvider>,
        undefined,
        {
          preloadedState,
        }
      );
      getSuggestionsMock.mockClear();
      act(() => {
        store.dispatch(setState({ stagedPreview }));
      });
      expect(getSuggestionsMock).not.toHaveBeenCalled();
    });

    it('should update suggestions if staged preview is removed', async () => {
      const { store } = renderWithReduxStore(
        <EditorFrameServiceProvider
          visualizationMap={defaultVisualizationMap}
          datasourceMap={defaultDatasourceMap}
        >
          <SuggestionPanelWrapper {...defaultProps} />
        </EditorFrameServiceProvider>,
        undefined,
        {
          preloadedState,
        }
      );
      getSuggestionsMock.mockClear();
      act(() => {
        store.dispatch(setState({ stagedPreview, ...suggestionState }));
      });
      act(() => {
        store.dispatch(setState({ stagedPreview: undefined, ...suggestionState }));
      });
      expect(getSuggestionsMock).toHaveBeenCalledTimes(1);
    });

    it('should select currently active suggestion', async () => {
      const getSuggestionByName = getSuggestionTile;

      renderWithReduxStore(
        <EditorFrameServiceProvider
          visualizationMap={defaultVisualizationMap}
          datasourceMap={defaultDatasourceMap}
        >
          <SuggestionPanelWrapper {...defaultProps} />
        </EditorFrameServiceProvider>,
        undefined,
        {
          preloadedState,
        }
      );
      expect(getSuggestionByName('Current visualization')).toHaveAttribute('aria-current', 'true');
      await userEvent.click(getSuggestionByName('Suggestion1'));
      expect(getSuggestionByName('Suggestion1')).toHaveAttribute('aria-current', 'true');
    });

    it('should rollback suggestion if current panel is clicked', async () => {
      const { store } = renderWithReduxStore(
        <EditorFrameServiceProvider
          visualizationMap={defaultVisualizationMap}
          datasourceMap={defaultDatasourceMap}
        >
          <SuggestionPanelWrapper {...defaultProps} />
        </EditorFrameServiceProvider>
      );

      fireEvent.click(getSuggestionTile('Suggestion2'));
      fireEvent.click(getSuggestionTile('Current visualization'));

      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'lens/rollbackSuggestion',
      });
      // check that it immediately applied any state changes in case auto-apply disabled
      expect(store.dispatch).toHaveBeenLastCalledWith({
        type: applyChanges.type,
      });
    });
  });

  it('should dispatch visualization switch action if suggestion is clicked', async () => {
    const { store } = renderWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <SuggestionPanelWrapper {...defaultProps} />
      </EditorFrameServiceProvider>,
      undefined,
      {
        preloadedState,
      }
    );

    fireEvent.click(getSuggestionTile('Suggestion1'));

    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'lens/switchVisualization',
        payload: {
          suggestion: {
            datasourceId: undefined,
            datasourceState: {},
            visualizationState: { suggestion1: true },
            newVisualizationId: 'testVis',
          },
        },
      })
    );
    expect(store.dispatch).toHaveBeenLastCalledWith({ type: applyChanges.type });
  });

  it('should render render icon if there is no preview expression', async () => {
    mockDatasource.getLayers.mockReturnValue(['first']);
    getSuggestionsMock.mockReturnValue([
      {
        datasourceState: {},
        previewIcon: IconChartDatatable,
        score: 0.5,
        visualizationState: suggestion1State,
        visualizationId: 'testVis',
        title: 'Suggestion1',
      },
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion2State,
        visualizationId: 'testVis',
        title: 'Suggestion2',
        previewExpression: 'test | expression',
      },
    ] as Suggestion[]);

    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce(undefined);
    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce('test | expression');

    // this call will go to the currently active visualization
    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce('current | preview');

    mockDatasource.toExpression.mockReturnValue('datasource_expression');

    renderWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <SuggestionPanelWrapper {...defaultProps} />
      </EditorFrameServiceProvider>,
      undefined,
      {
        preloadedState,
      }
    );

    expect(
      within(screen.getByTestId(SELECTORS.SUGGESTIONS_PANEL)).getAllByTestId('mock-eui-icon')
    ).toHaveLength(1);
    expect(jest.mocked(EuiIcon)).toHaveBeenCalledWith(
      expect.objectContaining({ type: IconChartDatatable }),
      expect.anything()
    );
  });

  it('should return no suggestion if visualization has missing index-patterns', async () => {
    // create a layer that is referencing an indexPatterns not retrieved by the datasource
    const missingIndexPatternsState = {
      layers: { indexPatternId: 'a' },
      indexPatterns: {},
    };
    mockDatasource.checkIntegrity.mockReturnValue(['a']);

    const newPreloadedState = {
      ...preloadedState,
      datasourceStates: {
        formBased: {
          ...preloadedState.datasourceStates!.formBased,
          state: missingIndexPatternsState,
        },
      },
    };

    const { container } = renderWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <SuggestionPanelWrapper {...defaultProps} />
      </EditorFrameServiceProvider>,
      undefined,
      {
        preloadedState: newPreloadedState,
      }
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should hide the selections when the accordion is hidden', async () => {
    renderWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <SuggestionPanelWrapper {...defaultProps} />
      </EditorFrameServiceProvider>
    );
    const toggle = screen.getByTestId('lensSuggestionsPanelToggleButton');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId(SELECTORS.SUGGESTIONS_PANEL)).toBeEmptyDOMElement();
  });

  it('should render preview expression if there is one', () => {
    mockDatasource.getLayers.mockReturnValue(['first']);
    (getSuggestions as jest.Mock).mockReturnValue([
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion1State,
        visualizationId: 'testVis',
        title: 'Suggestion1',
      },
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion2State,
        visualizationId: 'testVis',
        title: 'Suggestion2',
      },
    ] as Suggestion[]);

    (mockVisualization.toPreviewExpression as jest.Mock)
      .mockReturnValue(undefined)
      .mockReturnValueOnce('test | expression');
    mockDatasource.toExpression.mockReturnValue('datasource_expression');

    renderWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <SuggestionPanel {...defaultProps} frame={createMockFramePublicAPI()} />
      </EditorFrameServiceProvider>
    );

    expect(expressionRendererMock).toHaveBeenCalledTimes(1);
    const passedExpression = (expressionRendererMock as jest.Mock).mock.calls[0][0].expression;

    expect(passedExpression).toMatchInlineSnapshot(`
      "test
      | expression"
    `);
  });
});
