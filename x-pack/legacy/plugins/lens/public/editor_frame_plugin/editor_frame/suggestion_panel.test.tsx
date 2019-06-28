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
} from '../mocks';
import { ExpressionRenderer } from 'src/legacy/core_plugins/data/public';
import { SuggestionPanel, SuggestionPanelProps } from './suggestion_panel';
import { getSuggestions, Suggestion } from './suggestion_helpers';
import { fromExpression } from '@kbn/interpreter/target/common';
import { EuiIcon } from '@elastic/eui';

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
        state: suggestion1State,
        visualizationId: 'vis',
        title: 'Suggestion1',
      },
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        state: suggestion2State,
        visualizationId: 'vis',
        title: 'Suggestion2',
      },
    ] as Suggestion[]);

    defaultProps = {
      activeDatasource: mockDatasource,
      datasourceState: {},
      activeVisualizationId: 'vis',
      visualizationMap: {
        vis: mockVisualization,
      },
      visualizationState: {},
      dispatch: dispatchMock,
      ExpressionRenderer: expressionRendererMock,
    };
  });

  it('should list passed in suggestions', () => {
    const wrapper = mount(<SuggestionPanel {...defaultProps} />);

    expect(wrapper.find('[data-test-subj="suggestion-title"]').map(el => el.text())).toEqual([
      'Suggestion1',
      'Suggestion2',
    ]);
  });

  it('should dispatch visualization switch action if suggestion is clicked', () => {
    const wrapper = mount(<SuggestionPanel {...defaultProps} />);

    wrapper
      .find('[data-test-subj="suggestion-title"]')
      .first()
      .simulate('click');

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SWITCH_VISUALIZATION',
        initialState: suggestion1State,
      })
    );
  });

  it('should render preview expression if there is one', () => {
    (getSuggestions as jest.Mock).mockReturnValue([
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        state: suggestion1State,
        visualizationId: 'vis',
        title: 'Suggestion1',
      },
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        state: suggestion2State,
        visualizationId: 'vis',
        title: 'Suggestion2',
        previewExpression: 'test | expression',
      },
    ] as Suggestion[]);

    mockDatasource.toExpression.mockReturnValue('datasource_expression');

    mount(<SuggestionPanel {...defaultProps} />);

    expect(expressionRendererMock).toHaveBeenCalledTimes(1);
    const passedExpression = fromExpression(
      (expressionRendererMock as jest.Mock).mock.calls[0][0].expression
    );
    expect(passedExpression).toMatchInlineSnapshot(`
Object {
  "chain": Array [
    Object {
      "arguments": Object {},
      "function": "datasource_expression",
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
    (getSuggestions as jest.Mock).mockReturnValue([
      {
        datasourceState: {},
        previewIcon: 'visTable',
        score: 0.5,
        state: suggestion1State,
        visualizationId: 'vis',
        title: 'Suggestion1',
      },
      {
        datasourceState: {},
        previewIcon: 'empty',
        score: 0.5,
        state: suggestion2State,
        visualizationId: 'vis',
        title: 'Suggestion2',
        previewExpression: 'test | expression',
      },
    ] as Suggestion[]);

    mockDatasource.toExpression.mockReturnValue('datasource_expression');

    const wrapper = mount(<SuggestionPanel {...defaultProps} />);

    expect(wrapper.find(EuiIcon)).toHaveLength(1);
    expect(wrapper.find(EuiIcon).prop('type')).toEqual('visTable');
  });
});
