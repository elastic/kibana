/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import type {
  FramePublicAPI,
  DatasourcePublicAPI,
  VisualizationToolbarProps,
} from '@kbn/lens-common';
import type { XYState, XYDataLayerConfig } from '../types';
import { Position } from '@elastic/charts';
import { createMockFramePublicAPI, createMockDatasource } from '../../../mocks';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getSelectedButtonInGroup } from '@kbn/test-eui-helpers';
import { XyStyleSettings } from './style_settings';
import { XyAxisSettings } from './axis_settings';

describe('xy style settings', () => {
  let frame: FramePublicAPI;

  function testState(): XYState {
    return {
      legend: { isVisible: true, position: Position.Right },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      layers: [
        {
          seriesType: 'bar',
          layerType: LayerTypes.DATA,
          layerId: 'first',
          splitAccessors: ['baz'],
          xAccessor: 'foo',
          accessors: ['one'],
        },
      ],
    };
  }

  beforeEach(() => {
    frame = createMockFramePublicAPI();
    frame.datasourceLayers = {
      first: createMockDatasource('test').publicAPIMock,
    };
  });

  const renderComponent = (overrideProps?: Partial<VisualizationToolbarProps<XYState>>) => {
    const state = testState();
    const rtlRender = render(
      <XyStyleSettings frame={frame} setState={jest.fn()} state={state} {...overrideProps} />
    );
    return rtlRender;
  };

  const getRightAxisButton = () => screen.getByRole('button', { name: 'Right axis' });
  const getLeftAxisButton = () => screen.getByRole('button', { name: 'Left axis' });
  const getBottomAxisButton = () => screen.getByRole('button', { name: 'Bottom axis' });
  const queryTitlesAndTextButton = () => screen.queryByRole('button', { name: 'Titles and text' });

  describe('Titles and text settings', () => {
    it.each<{ seriesType: string[]; disallowed?: boolean }>([
      { seriesType: ['bar'] },
      { seriesType: ['bar_horizontal'] },
      { seriesType: ['bar_horizontal', 'line', 'area'] },
      { seriesType: ['bar_horizontal', 'bar'] },
      { seriesType: ['area'], disallowed: true },
      { seriesType: ['line'], disallowed: true },
      { seriesType: ['line', 'area'], disallowed: true },
    ])(
      `should show titles and text settings when seriesType is $seriesType when bar series exist`,
      ({ seriesType, disallowed = false }) => {
        const state = testState();
        seriesType.forEach((type, i) => {
          state.layers[i] = { ...state.layers[0], seriesType: type } as XYDataLayerConfig;
        });
        renderComponent({ state });

        if (disallowed) {
          expect(queryTitlesAndTextButton()).not.toBeInTheDocument();
        } else {
          expect(queryTitlesAndTextButton()).toBeInTheDocument();
        }
      }
    );
  });

  // FLAKY: https://github.com/elastic/kibana/issues/246652
  // FLAKY: https://github.com/elastic/kibana/issues/246653
  describe.skip('Axis settings', () => {
    it('should disable the popover if there is no right axis', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: 'Right axis' })).toBeDisabled();
    });

    it('should enable the popover if there is right axis', () => {
      const state = testState();
      renderComponent({
        state: {
          ...state,
          layers: [
            {
              ...state.layers[0],
              yConfig: [{ axisMode: 'right', forAccessor: 'one' }],
            } as XYDataLayerConfig,
          ],
        },
      });

      expect(getRightAxisButton()).toBeEnabled();
    });

    it('should render the settings for all 3 axes', () => {
      const state = testState();
      renderComponent({
        state: {
          ...state,
          layers: [
            {
              ...state.layers[0],
              accessors: ['one', 'two'],
              yConfig: [{ axisMode: 'right', forAccessor: 'bar' }],
            } as XYDataLayerConfig,
          ],
        },
      });

      expect(getLeftAxisButton()).toBeInTheDocument();
      expect(getBottomAxisButton()).toBeEnabled();
      expect(getRightAxisButton()).toBeEnabled();
    });

    it('should pass in endzone visibility setter and current sate for time chart', async () => {
      const datasourceLayers = frame.datasourceLayers as Record<string, DatasourcePublicAPI>;
      (datasourceLayers.first.getOperationForColumnId as jest.Mock).mockReturnValue({
        dataType: 'date',
      });
      const state = testState();
      renderComponent({
        frame,
        state: {
          ...state,
          layers: [
            {
              ...state.layers[0],
              accessors: ['one', 'two'],
              yConfig: [{ axisMode: 'right', forAccessor: 'one' }],
            } as XYDataLayerConfig,
          ],
        },
      });

      await userEvent.click(getRightAxisButton());
      expect(
        within(screen.getByTestId('yRight-axis')).queryByTestId('lnsshowEndzones')
      ).not.toBeInTheDocument();

      await userEvent.click(getBottomAxisButton());
      expect(
        within(screen.getByTestId('x-axis')).queryByTestId('lnsshowEndzones')
      ).toBeInTheDocument();
      await userEvent.click(getLeftAxisButton());
      expect(
        within(screen.getByTestId('yLeft-axis')).queryByTestId('lnsshowEndzones')
      ).not.toBeInTheDocument();
    });

    it.skip('should pass in current time marker visibility setter and current state for time chart', () => {
      const datasourceLayers = frame.datasourceLayers as Record<string, DatasourcePublicAPI>;
      (datasourceLayers.first.getOperationForColumnId as jest.Mock).mockReturnValue({
        dataType: 'date',
      });
      const mockSetState = jest.fn();
      const stateForTest = testState();
      const state = {
        ...stateForTest,
        showCurrentTimeMarker: true,
        layers: [
          {
            ...stateForTest.layers[0],
            yConfig: [{ axisMode: 'right', forAccessor: 'foo' }],
          } as XYDataLayerConfig,
        ],
      };
      const component = shallow(
        <XyStyleSettings frame={frame} state={state} setState={mockSetState} />
      );

      expect(
        component.find(XyAxisSettings).at(0).prop('setCurrentTimeMarkerVisibility')
      ).toBeFalsy();
      expect(
        component.find(XyAxisSettings).at(1).prop('setCurrentTimeMarkerVisibility')
      ).toBeTruthy();
      expect(component.find(XyAxisSettings).at(1).prop('currentTimeMarkerVisible')).toBe(true);
      expect(
        component.find(XyAxisSettings).at(2).prop('setCurrentTimeMarkerVisibility')
      ).toBeFalsy();
    });

    it('should pass in information about current data bounds', async () => {
      const state = testState();
      frame.activeData = {
        first: {
          type: 'datatable',
          rows: [{ one: -5 }, { one: 50 }],
          columns: [
            {
              id: 'one',
              meta: {
                type: 'number',
              },
              name: 'one',
            },
          ],
        },
      };

      render(
        <XyStyleSettings
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            preferredSeriesType: 'line',
            yLeftExtent: {
              mode: 'dataBounds',
            },
          }}
        />
      );

      fireEvent.click(
        within(screen.getByTestId('yLeft-axis')).getByTestId('lnsXY_axisExtent_groups_custom')
      );
      expect(screen.getByTestId('lnsXY_axisExtent_lowerBound')).toHaveValue(-5);
      expect(screen.getByTestId('lnsXY_axisExtent_upperBound')).toHaveValue(50);
    });

    it('should pass in extent information', async () => {
      const state = testState();
      render(
        <XyStyleSettings
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            preferredSeriesType: 'line',
            layers: [
              {
                ...state.layers[0],
                accessors: ['one', 'two'],
                yConfig: [
                  { axisMode: 'right', forAccessor: 'two' },
                  { axisMode: 'left', forAccessor: 'one' },
                ],
              } as XYDataLayerConfig,
            ],
            yLeftExtent: {
              mode: 'custom',
              lowerBound: 123,
              upperBound: 456,
            },
          }}
        />
      );
      await userEvent.click(getLeftAxisButton());
      expect(screen.getByTestId('lnsXY_axisExtent_lowerBound')).toHaveValue(123);
      expect(screen.getByTestId('lnsXY_axisExtent_upperBound')).toHaveValue(456);
      await userEvent.click(getRightAxisButton());
      const selectedButton = getSelectedButtonInGroup(
        'lnsXY_axisBounds_groups',
        within(screen.getByTestId('yRight-axis'))
      )();

      expect(selectedButton).toHaveTextContent('Full');
    });
  });
});
