/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { Visualization } from '../../types';
import {
  createMockVisualization,
  createMockDatasource,
  createExpressionRendererMock,
  DatasourceMock,
  createMockFramePublicAPI,
} from '../mocks';
import { act } from 'react-dom/test-utils';
import { ExpressionRenderer } from '../../../../../../../src/legacy/core_plugins/expressions/public';
import { SuggestionPanel, SuggestionPanelProps } from './suggestion_panel';
import { getSuggestions, Suggestion } from './suggestion_helpers';
import { EuiIcon, EuiPanel, EuiToolTip } from '@elastic/eui';

jest.mock('./suggestion_helpers');

describe('suggestion_panel', () => {
  let mockVisualization: Visualization;
  let mockDatasource: DatasourceMock;

  let expressionRendererMock: ExpressionRenderer;
  let dispatchMock: jest.Mock;

  const suggestion1State = { suggestion1: true };
  const suggestion2State = { suggestion2: true };

  let defaultProps: SuggestionPanelProps;

  beforeEach(() => {
    mockVisualization = createMockVisualization();
    mockDatasource = createMockDatasource();
    expressionRendererMock = createExpressionRendererMock();
    dispatchMock = jest.fn();

    (getSuggestions as jest.Mock).mockReturnValue([
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion1State,
        visualizationId: 'vis',
        title: 'Suggestion1',
        keptLayerIds: ['a'],
      },
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion2State,
        visualizationId: 'vis',
        title: 'Suggestion2',
        keptLayerIds: ['a'],
      },
    ] as Suggestion[]);

    defaultProps = {
      activeDatasourceId: 'mock',
      datasourceMap: {
        mock: mockDatasource,
      },
      datasourceStates: {
        mock: {
          isLoading: false,
          state: {},
        },
      },
      activeVisualizationId: 'vis',
      visualizationMap: {
        vis: mockVisualization,
        vis2: createMockVisualization(),
      },
      visualizationState: {},
      dispatch: dispatchMock,
      ExpressionRenderer: expressionRendererMock,
      frame: createMockFramePublicAPI(),
    };
  });

  it('should list passed in suggestions', () => {
    const wrapper = mount(<SuggestionPanel {...defaultProps} />);

    expect(
      wrapper
        .find('[data-test-subj="lnsSuggestion"]')
        .find(EuiPanel)
        .map(el => el.parents(EuiToolTip).prop('content'))
    ).toEqual(['Suggestion1', 'Suggestion2']);
  });

  it('should dispatch visualization switch action if suggestion is clicked', () => {
    const wrapper = mount(<SuggestionPanel {...defaultProps} />);

    wrapper
      .find('[data-test-subj="lnsSuggestion"]')
      .first()
      .simulate('click');

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SELECT_SUGGESTION',
        initialState: suggestion1State,
      })
    );
  });

  it('should remove unused layers if suggestion is clicked', () => {
    defaultProps.frame.datasourceLayers.a = mockDatasource.publicAPIMock;
    defaultProps.frame.datasourceLayers.b = mockDatasource.publicAPIMock;
    const wrapper = mount(
      <SuggestionPanel
        {...defaultProps}
        stagedPreview={{ visualization: { state: {}, activeId: 'vis' }, datasourceStates: {} }}
        activeVisualizationId="vis2"
      />
    );

    act(() => {
      wrapper
        .find('[data-test-subj="lnsSuggestion"]')
        .first()
        .simulate('click');
    });

    wrapper.update();

    act(() => {
      wrapper
        .find('[data-test-subj="lensSubmitSuggestion"]')
        .first()
        .simulate('click');
    });

    expect(defaultProps.frame.removeLayers).toHaveBeenCalledWith(['b']);
  });

  it('should render preview expression if there is one', () => {
    mockDatasource.getLayers.mockReturnValue(['first']);
    (getSuggestions as jest.Mock).mockReturnValue([
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion1State,
        visualizationId: 'vis',
        title: 'Suggestion1',
      },
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion2State,
        visualizationId: 'vis',
        title: 'Suggestion2',
      },
    ] as Suggestion[]);

    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce(undefined);
    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce('test | expression');
    mockDatasource.toExpression.mockReturnValue('datasource_expression');

    mount(<SuggestionPanel {...defaultProps} />);

    expect(expressionRendererMock).toHaveBeenCalledTimes(1);
    const passedExpression = (expressionRendererMock as jest.Mock).mock.calls[0][0].expression;

    expect(passedExpression).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {},
            "function": "kibana",
            "type": "function",
          },
          Object {
            "arguments": Object {
              "filters": Array [],
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
                      "function": "datasource_expression",
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
            "function": "test",
            "type": "function",
          },
          Object {
            "arguments": Object {},
            "function": "expression",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });

  it('should render render icon if there is no preview expression', () => {
    mockDatasource.getLayers.mockReturnValue(['first']);
    (getSuggestions as jest.Mock).mockReturnValue([
      {
        datasourceState: {},
        previewIcon: 'visTable',
        score: 0.5,
        visualizationState: suggestion1State,
        visualizationId: 'vis',
        title: 'Suggestion1',
      },
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        visualizationState: suggestion2State,
        visualizationId: 'vis',
        title: 'Suggestion2',
        previewExpression: 'test | expression',
      },
    ] as Suggestion[]);

    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce(undefined);
    (mockVisualization.toPreviewExpression as jest.Mock).mockReturnValueOnce('test | expression');
    mockDatasource.toExpression.mockReturnValue('datasource_expression');

    const wrapper = mount(<SuggestionPanel {...defaultProps} />);

    expect(wrapper.find(EuiIcon)).toHaveLength(1);
    expect(wrapper.find(EuiIcon).prop('type')).toEqual('visTable');
  });
});
