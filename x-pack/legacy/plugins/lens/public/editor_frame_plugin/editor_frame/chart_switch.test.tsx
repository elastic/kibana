/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createMockVisualization, createMockFramePublicAPI, createMockDatasource } from '../mocks';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { ReactWrapper } from 'enzyme';
import { ChartSwitch } from './chart_switch';
import { Visualization, FramePublicAPI, DatasourcePublicAPI } from '../../types';
import { EuiKeyPadMenuItemButton } from '@elastic/eui';
import { Action } from './state_management';

describe('chart_switch', () => {
  function generateVisualization(id: string): jest.Mocked<Visualization> {
    return {
      ...createMockVisualization(),
      id,
      visualizationTypes: [
        {
          icon: 'empty',
          id: `sub${id}`,
          label: `Label ${id}`,
        },
      ],
      initialize: jest.fn((_frame, state?: unknown) => {
        return state || `${id} initial state`;
      }),
      getSuggestions: jest.fn(options => {
        return [
          {
            score: 1,
            title: '',
            state: `suggestion ${id}`,
            previewIcon: 'empty',
          },
        ];
      }),
    };
  }

  function mockVisualizations() {
    return {
      visA: generateVisualization('visA'),
      visB: generateVisualization('visB'),
      visC: {
        ...generateVisualization('visC'),
        visualizationTypes: [
          {
            icon: 'empty',
            id: 'subvisC1',
            label: 'C1',
          },
          {
            icon: 'empty',
            id: 'subvisC2',
            label: 'C2',
          },
        ],
      },
    };
  }

  function mockFrame(layers: string[]) {
    return {
      ...createMockFramePublicAPI(),
      datasourceLayers: layers.reduce(
        (acc, layerId) => ({
          ...acc,
          [layerId]: ({
            getTableSpec: jest.fn(() => {
              return [{ columnId: 2 }];
            }),
            getOperationForColumnId() {
              return {};
            },
          } as unknown) as DatasourcePublicAPI,
        }),
        {} as Record<string, unknown>
      ),
    } as FramePublicAPI;
  }

  function mockDatasourceMap() {
    const datasource = createMockDatasource();
    datasource.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      {
        state: {},
        table: {
          columns: [],
          isMultiRow: true,
          layerId: 'a',
          changeType: 'unchanged',
        },
      },
    ]);
    return {
      testDatasource: datasource,
    };
  }

  function mockDatasourceStates() {
    return {
      testDatasource: {
        state: {},
        isLoading: false,
      },
    };
  }

  function showFlyout(component: ReactWrapper) {
    component
      .find('[data-test-subj="lnsChartSwitchPopover"]')
      .first()
      .simulate('click');
  }

  function switchTo(subType: string, component: ReactWrapper) {
    showFlyout(component);
    component
      .find(`[data-test-subj="lnsChartSwitchPopover_${subType}"]`)
      .first()
      .simulate('click');
  }

  function getMenuItem(subType: string, component: ReactWrapper) {
    showFlyout(component);
    return component
      .find(EuiKeyPadMenuItemButton)
      .find(`[data-test-subj="lnsChartSwitchPopover_${subType}"]`)
      .first();
  }

  it('should use suggested state if there is a suggestion from the target visualization', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={mockFrame(['a'])}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    switchTo('subvisB', component);

    expect(dispatch).toHaveBeenCalledWith({
      initialState: 'suggestion visB',
      newVisualizationId: 'visB',
      type: 'SWITCH_VISUALIZATION',
      datasourceId: 'testDatasource',
      datasourceState: {},
    });
  });

  it('should use initial state if there is no suggestion from the target visualization', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    visualizations.visB.getSuggestions.mockReturnValueOnce([]);
    const frame = mockFrame(['a']);
    (frame.datasourceLayers.a.getTableSpec as jest.Mock).mockReturnValue([]);

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    switchTo('subvisB', component);

    expect(dispatch).toHaveBeenCalledWith({
      initialState: 'visB initial state',
      newVisualizationId: 'visB',
      type: 'SWITCH_VISUALIZATION',
    });
  });

  it('should indicate data loss if not all columns will be used', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    const frame = mockFrame(['a']);

    const datasourceMap = mockDatasourceMap();
    datasourceMap.testDatasource.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      {
        state: {},
        table: {
          columns: [
            {
              columnId: 'col1',
              operation: {
                label: '',
                dataType: 'string',
                isBucketed: true,
              },
            },
            {
              columnId: 'col2',
              operation: {
                label: '',
                dataType: 'number',
                isBucketed: false,
              },
            },
          ],
          layerId: 'first',
          isMultiRow: true,
          changeType: 'unchanged',
        },
      },
    ]);
    datasourceMap.testDatasource.publicAPIMock.getTableSpec.mockReturnValue([
      { columnId: 'col1' },
      { columnId: 'col2' },
      { columnId: 'col3' },
    ]);

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    expect(getMenuItem('subvisB', component).prop('betaBadgeIconType')).toEqual('alert');
  });

  it('should indicate data loss if not all layers will be used', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    const frame = mockFrame(['a', 'b']);

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    expect(getMenuItem('subvisB', component).prop('betaBadgeIconType')).toEqual('alert');
  });

  it('should indicate data loss if no data will be used', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    visualizations.visB.getSuggestions.mockReturnValueOnce([]);
    const frame = mockFrame(['a']);

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    expect(getMenuItem('subvisB', component).prop('betaBadgeIconType')).toEqual('alert');
  });

  it('should not indicate data loss if there is no data', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    visualizations.visB.getSuggestions.mockReturnValueOnce([]);
    const frame = mockFrame(['a']);
    (frame.datasourceLayers.a.getTableSpec as jest.Mock).mockReturnValue([]);

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    expect(getMenuItem('subvisB', component).prop('betaBadgeIconType')).toBeUndefined();
  });

  it('should not indicate data loss if visualization is not changed', () => {
    const dispatch = jest.fn();
    const removeLayers = jest.fn();
    const frame = {
      ...mockFrame(['a', 'b', 'c']),
      removeLayers,
    };
    const visualizations = mockVisualizations();
    const switchVisualizationType = jest.fn(() => 'therebedragons');

    visualizations.visC.switchVisualizationType = switchVisualizationType;

    const component = mount(
      <ChartSwitch
        visualizationId="visC"
        visualizationState={'therebegriffins'}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    expect(getMenuItem('subvisC2', component).prop('betaBadgeIconType')).toBeUndefined();
  });

  it('should remove unused layers', () => {
    const removeLayers = jest.fn();
    const frame = {
      ...mockFrame(['a', 'b', 'c']),
      removeLayers,
    };
    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={mockVisualizations()}
        dispatch={jest.fn()}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    switchTo('subvisB', component);

    expect(removeLayers).toHaveBeenCalledTimes(1);
    expect(removeLayers).toHaveBeenCalledWith(['b', 'c']);
  });

  it('should remove all layers if there is no suggestion', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    visualizations.visB.getSuggestions.mockReturnValueOnce([]);
    const frame = mockFrame(['a', 'b', 'c']);

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    switchTo('subvisB', component);

    expect(frame.removeLayers).toHaveBeenCalledTimes(1);
    expect(frame.removeLayers).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  it('should not remove layers if the visualization is not changing', () => {
    const dispatch = jest.fn();
    const removeLayers = jest.fn();
    const frame = {
      ...mockFrame(['a', 'b', 'c']),
      removeLayers,
    };
    const visualizations = mockVisualizations();
    const switchVisualizationType = jest.fn(() => 'therebedragons');

    visualizations.visC.switchVisualizationType = switchVisualizationType;

    const component = mount(
      <ChartSwitch
        visualizationId="visC"
        visualizationState={'therebegriffins'}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    switchTo('subvisC2', component);
    expect(removeLayers).not.toHaveBeenCalled();
    expect(switchVisualizationType).toHaveBeenCalledWith('subvisC2', 'therebegriffins');
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SWITCH_VISUALIZATION',
        initialState: 'therebedragons',
      })
    );
  });

  it('should switch to the updated datasource state', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    const frame = mockFrame(['a', 'b']);

    const datasourceMap = mockDatasourceMap();
    datasourceMap.testDatasource.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      {
        state: 'testDatasource suggestion',
        table: {
          columns: [
            {
              columnId: 'col1',
              operation: {
                label: '',
                dataType: 'string',
                isBucketed: true,
              },
            },
            {
              columnId: 'col2',
              operation: {
                label: '',
                dataType: 'number',
                isBucketed: false,
              },
            },
          ],
          layerId: 'a',
          isMultiRow: true,
          changeType: 'unchanged',
        },
      },
    ]);

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={datasourceMap}
        datasourceStates={mockDatasourceStates()}
      />
    );

    switchTo('subvisB', component);

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SWITCH_VISUALIZATION',
      newVisualizationId: 'visB',
      datasourceId: 'testDatasource',
      datasourceState: 'testDatasource suggestion',
      initialState: 'suggestion visB',
    } as Action);
  });

  it('should ensure the new visualization has the proper subtype', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    const switchVisualizationType = jest.fn(
      (visualizationType, state) => `${state} ${visualizationType}`
    );

    visualizations.visB.switchVisualizationType = switchVisualizationType;

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={mockFrame(['a'])}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    switchTo('subvisB', component);

    expect(dispatch).toHaveBeenCalledWith({
      initialState: 'suggestion visB subvisB',
      newVisualizationId: 'visB',
      type: 'SWITCH_VISUALIZATION',
      datasourceId: 'testDatasource',
      datasourceState: {},
    });
  });

  it('should show all visualization types', () => {
    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={mockVisualizations()}
        dispatch={jest.fn()}
        framePublicAPI={mockFrame(['a', 'b'])}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    showFlyout(component);

    const allDisplayed = ['subvisA', 'subvisB', 'subvisC1', 'subvisC2'].every(
      subType => component.find(`[data-test-subj="lnsChartSwitchPopover_${subType}"]`).length > 0
    );

    expect(allDisplayed).toBeTruthy();
  });
});
