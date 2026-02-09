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
import { screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import type { ReactExpressionRendererType } from '@kbn/expressions-plugin/public';
import type { SuggestionPanelProps } from './suggestion_panel';
import { SuggestionPanel, SuggestionPanelWrapper } from './suggestion_panel';
import { getSuggestions } from './suggestion_helpers';
import { EuiIcon, EuiPanel, EuiToolTip, EuiAccordion } from '@elastic/eui';
import { IconChartDatatable } from '@kbn/chart-icons';
import { mountWithReduxStore } from '../../mocks';
import { coreMock } from '@kbn/core/public/mocks';

import { applyChanges, setState, setToggleFullscreen } from '../../state_management';
import { setChangesApplied } from '../../state_management/lens_slice';
import { userEvent } from '@testing-library/user-event';
import { EditorFrameServiceProvider } from '../editor_frame_service_context';

const SELECTORS = {
  APPLY_CHANGES_BUTTON: 'button[data-test-subj="lnsApplyChanges__suggestions"]',
  SUGGESTIONS_PANEL: '[data-test-subj="lnsSuggestionsPanel"]',
  SUGGESTION_TILE_BUTTON: 'button[data-test-subj="lnsSuggestion"]',
};

jest.mock('./suggestion_helpers');

const getSuggestionsMock = getSuggestions as jest.Mock;

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

  it('should avoid completely to render SuggestionPanel when in fullscreen mode', async () => {
    const { instance, lensStore } = mountWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <SuggestionPanelWrapper {...defaultProps} />
      </EditorFrameServiceProvider>
    );
    expect(instance.find(SuggestionPanel).exists()).toBe(true);

    lensStore.dispatch(setToggleFullscreen());
    instance.update();
    expect(instance.find(SuggestionPanel).exists()).toBe(false);

    lensStore.dispatch(setToggleFullscreen());
    instance.update();
    expect(instance.find(SuggestionPanel).exists()).toBe(true);
  });

  it('should display apply-changes prompt when changes not applied', async () => {
    const { instance, lensStore } = mountWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <SuggestionPanelWrapper {...defaultProps} />
      </EditorFrameServiceProvider>,
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

    expect(instance.exists(SELECTORS.APPLY_CHANGES_BUTTON)).toBeTruthy();
    expect(instance.exists(SELECTORS.SUGGESTION_TILE_BUTTON)).toBeFalsy();

    instance.find(SELECTORS.APPLY_CHANGES_BUTTON).simulate('click');

    // check changes applied
    expect(lensStore.dispatch).toHaveBeenCalledWith(applyChanges());

    // simulate workspace panel behavior
    lensStore.dispatch(setChangesApplied(true));
    instance.update();

    // check UI updated
    expect(instance.exists(SELECTORS.APPLY_CHANGES_BUTTON)).toBeFalsy();
    expect(instance.exists(SELECTORS.SUGGESTION_TILE_BUTTON)).toBeTruthy();
  });

  it('should list passed in suggestions', async () => {
    const { instance } = mountWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <SuggestionPanelWrapper {...defaultProps} />
      </EditorFrameServiceProvider>,
      {
        preloadedState,
      }
    );

    expect(
      instance
        .find('[data-test-subj="lnsSuggestion"]')
        .find(EuiPanel)
        .map((el) => el.parents(EuiToolTip).prop('content'))
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
      const { instance, lensStore } = mountWithReduxStore(
        <EditorFrameServiceProvider
          visualizationMap={defaultVisualizationMap}
          datasourceMap={defaultDatasourceMap}
        >
          <SuggestionPanelWrapper {...defaultProps} />
        </EditorFrameServiceProvider>,
        {
          preloadedState,
        }
      );
      getSuggestionsMock.mockClear();
      lensStore.dispatch(setState({ stagedPreview }));
      instance.update();
      expect(getSuggestionsMock).not.toHaveBeenCalled();
    });

    it('should update suggestions if staged preview is removed', async () => {
      const { instance, lensStore } = mountWithReduxStore(
        <EditorFrameServiceProvider
          visualizationMap={defaultVisualizationMap}
          datasourceMap={defaultDatasourceMap}
        >
          <SuggestionPanelWrapper {...defaultProps} />
        </EditorFrameServiceProvider>,
        {
          preloadedState,
        }
      );
      getSuggestionsMock.mockClear();
      lensStore.dispatch(setState({ stagedPreview, ...suggestionState }));
      instance.update();
      lensStore.dispatch(setState({ stagedPreview: undefined, ...suggestionState }));
      instance.update();
      expect(getSuggestionsMock).toHaveBeenCalledTimes(1);
    });

    it('should select currently active suggestion', async () => {
      const getSuggestionByName = (name: string) => screen.getByRole('listitem', { name });

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
      const { instance, lensStore } = mountWithReduxStore(
        <EditorFrameServiceProvider
          visualizationMap={defaultVisualizationMap}
          datasourceMap={defaultDatasourceMap}
        >
          <SuggestionPanelWrapper {...defaultProps} />
        </EditorFrameServiceProvider>
      );

      act(() => {
        instance.find(SELECTORS.SUGGESTION_TILE_BUTTON).at(2).simulate('click');
      });

      instance.update();

      act(() => {
        instance.find(SELECTORS.SUGGESTION_TILE_BUTTON).at(0).simulate('click');
      });

      instance.update();

      expect(lensStore.dispatch).toHaveBeenCalledWith({
        type: 'lens/rollbackSuggestion',
      });
      // check that it immediately applied any state changes in case auto-apply disabled
      expect(lensStore.dispatch).toHaveBeenLastCalledWith({
        type: applyChanges.type,
      });
    });
  });

  it('should dispatch visualization switch action if suggestion is clicked', async () => {
    const { instance, lensStore } = mountWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <SuggestionPanelWrapper {...defaultProps} />
      </EditorFrameServiceProvider>,
      {
        preloadedState,
      }
    );

    act(() => {
      instance.find(SELECTORS.SUGGESTION_TILE_BUTTON).at(1).simulate('click');
    });

    expect(lensStore.dispatch).toHaveBeenCalledWith(
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
    expect(lensStore.dispatch).toHaveBeenLastCalledWith({ type: applyChanges.type });
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

    const { instance } = mountWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <SuggestionPanelWrapper {...defaultProps} />
      </EditorFrameServiceProvider>,
      {
        preloadedState,
      }
    );

    expect(instance.find(SELECTORS.SUGGESTIONS_PANEL).find(EuiIcon)).toHaveLength(1);
    expect(instance.find(SELECTORS.SUGGESTIONS_PANEL).find(EuiIcon).prop('type')).toEqual(
      IconChartDatatable
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

    const { instance } = mountWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <SuggestionPanelWrapper {...defaultProps} />
      </EditorFrameServiceProvider>,
      {
        preloadedState: newPreloadedState,
      }
    );
    expect(instance.isEmptyRender()).toEqual(true);
  });

  it('should hide the selections when the accordion is hidden', async () => {
    const { instance } = mountWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={defaultVisualizationMap}
        datasourceMap={defaultDatasourceMap}
      >
        <SuggestionPanelWrapper {...defaultProps} />
      </EditorFrameServiceProvider>
    );
    expect(instance.find(EuiAccordion)).toHaveLength(1);
    act(() => {
      instance.find(EuiAccordion).at(0).simulate('change');
    });

    expect(instance.find(SELECTORS.SUGGESTIONS_PANEL)).toEqual({});
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

    mountWithReduxStore(
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
