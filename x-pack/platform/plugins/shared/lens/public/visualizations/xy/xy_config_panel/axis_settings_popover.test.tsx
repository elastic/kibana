/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps } from 'react';
import { EuiButtonGroupTestHarness } from '@kbn/test-eui-helpers';
import { AxisSettingsPopover } from './axis_settings_popover';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

type Props = ComponentProps<typeof AxisSettingsPopover>;

jest.useFakeTimers();
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: jest.fn((fn) => fn),
}));

describe('AxesSettingsPopover', () => {
  let defaultProps: Props;
  beforeEach(() => {
    defaultProps = {
      layers: [
        {
          seriesType: 'bar',
          layerType: LayerTypes.DATA,
          layerId: 'first',
          splitAccessor: 'baz',
          xAccessor: 'foo',
          accessors: ['bar'],
        },
      ],
      updateTitleState: jest.fn(),
      axisTitle: 'My custom X axis title',
      axis: 'x',
      areTickLabelsVisible: true,
      areGridlinesVisible: true,
      isTitleVisible: true,
      toggleTickLabelsVisibility: jest.fn(),
      toggleGridlinesVisibility: jest.fn(),
      hasBarOrAreaOnAxis: false,
      hasPercentageAxis: false,
      orientation: 0,
      setOrientation: jest.fn(),
      setScaleWithExtent: jest.fn(),
      setExtent: jest.fn(),
      setScale: jest.fn(),
      scale: 'linear',
    };
  });

  const renderAxisSettingsPopover = async (props: Partial<Props> = {}) => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const renderResult = render(<AxisSettingsPopover {...defaultProps} {...props} />);

    await user.click(screen.getByRole('button'));

    return {
      renderer: renderResult,
      bounds: new EuiButtonGroupTestHarness('lnsXY_axisBounds_groups'),
    };
  };

  it('should disable the popover if the isDisabled property is true', async () => {
    await renderAxisSettingsPopover({ axis: 'x', isDisabled: true });
    const toolbarBtn = screen.getByTestId('lnsBottomAxisButton');
    expect(toolbarBtn).toBeDisabled();
  });

  it('should have the gridlines switch on by default', async () => {
    await renderAxisSettingsPopover();
    const gridlinesSwitch = screen.getByTestId('lnsshowxAxisGridlines');
    expect(gridlinesSwitch).toBeChecked();
  });

  it('should have the gridlines switch off when gridlinesVisibilitySettings for this axes are false', async () => {
    await renderAxisSettingsPopover({ areGridlinesVisible: false });
    const gridlinesSwitch = screen.getByTestId('lnsshowxAxisGridlines');
    expect(gridlinesSwitch).not.toBeChecked();
  });

  it('should have selected the horizontal option on the orientation group', async () => {
    await renderAxisSettingsPopover({
      useMultilayerTimeAxis: false,
      areTickLabelsVisible: true,
    });
    const orientationGroup = screen.getByRole('group', { name: /orientation/i });
    const pressedButton = within(orientationGroup).getByRole('button', { pressed: true });
    expect(pressedButton.title).toBe('Horizontal');
  });

  it('should have called the setOrientation function on orientation button group change', async () => {
    await renderAxisSettingsPopover({
      useMultilayerTimeAxis: false,
      areTickLabelsVisible: true,
    });
    const orientationGroup = screen.getByRole('group', { name: /orientation/i });
    fireEvent.click(within(orientationGroup).getByRole('button', { name: /angled/i }));
    expect(defaultProps.setOrientation).toBeCalledTimes(1);
    expect(defaultProps.setOrientation).toBeCalledWith(defaultProps.axis, -45);
  });

  it('should hide the orientation group if the tickLabels are set to not visible', async () => {
    await renderAxisSettingsPopover({
      useMultilayerTimeAxis: false,
      areTickLabelsVisible: false,
    });
    const orientationGroup = screen.queryByRole('group', { name: /orientation/i });
    expect(orientationGroup).not.toBeInTheDocument();
  });

  it('hides the endzone visibility switch if no setter is passed in', async () => {
    await renderAxisSettingsPopover({
      endzonesVisible: true,
      setEndzoneVisibility: undefined,
    });
    expect(screen.queryByTestId('lnsshowEndzones')).not.toBeInTheDocument();
  });

  it('shows the endzone visibility switch if setter is passed in', async () => {
    await renderAxisSettingsPopover({
      endzonesVisible: true,
      setEndzoneVisibility: jest.fn(),
    });
    expect(screen.getByTestId('lnsshowEndzones')).toBeChecked();
  });

  it('hides the current time marker visibility flag if no setter is passed in', async () => {
    await renderAxisSettingsPopover({
      currentTimeMarkerVisible: true,
      setCurrentTimeMarkerVisibility: undefined,
    });
    expect(screen.queryByTestId('lnsshowCurrentTimeMarker')).not.toBeInTheDocument();
  });

  it('shows the current time marker switch if setter is present', async () => {
    const setCurrentTimeMarkerVisibilityMock = jest.fn();

    await renderAxisSettingsPopover({
      currentTimeMarkerVisible: false,
      setCurrentTimeMarkerVisibility: setCurrentTimeMarkerVisibilityMock,
    });
    const switchElement = screen.getByTestId('lnsshowCurrentTimeMarker');
    expect(switchElement).not.toBeChecked();

    fireEvent.click(switchElement);

    expect(setCurrentTimeMarkerVisibilityMock).toHaveBeenCalledWith(true);
  });

  describe('axis extent', () => {
    it('hides the extent section if no extent is passed in', async () => {
      const result = await renderAxisSettingsPopover({
        extent: undefined,
      });
      expect(result.bounds.self).not.toBeInTheDocument();
    });

    it('renders 3 options for metric bound inputs', async () => {
      const result = await renderAxisSettingsPopover({
        axis: 'yLeft',
        extent: { mode: 'custom', lowerBound: 123, upperBound: 456 },
      });
      expect(result.bounds.options).toHaveLength(3);
    });

    it('renders nice values enabled by default if mode is full for metric', async () => {
      await renderAxisSettingsPopover({
        axis: 'yLeft',
        extent: { mode: 'full' },
      });
      expect(screen.getByTestId('lnsXY_axisExtent_niceValues')).toBeChecked();
    });

    it('should render nice values if mode is custom for metric', async () => {
      await renderAxisSettingsPopover({
        axis: 'yLeft',
        extent: { mode: 'custom', lowerBound: 123, upperBound: 456 },
      });
      expect(screen.getByTestId('lnsXY_axisExtent_niceValues')).toBeChecked();
    });

    it('renders metric (y) bound inputs if mode is custom', async () => {
      await renderAxisSettingsPopover({
        axis: 'yLeft',
        extent: { mode: 'custom', lowerBound: 123, upperBound: 456 },
      });
      const rangeInput = screen.getByTestId('lnsXY_axisExtent_customBounds');
      const lower = within(rangeInput).getByTestId('lnsXY_axisExtent_lowerBound');
      const upper = within(rangeInput).getByTestId('lnsXY_axisExtent_upperBound');
      expect(lower).toHaveValue(123);
      expect(upper).toHaveValue(456);
    });

    it('renders 2 options for bucket bound inputs', async () => {
      const result = await renderAxisSettingsPopover({
        axis: 'x',
        extent: { mode: 'custom', lowerBound: 123, upperBound: 456 },
      });
      expect(result.bounds.options).toHaveLength(2);
    });

    it('should render nice values enabled by default if mode is dataBounds for bucket', async () => {
      await renderAxisSettingsPopover({
        axis: 'x',
        extent: { mode: 'dataBounds' },
      });
      expect(screen.getByTestId('lnsXY_axisExtent_niceValues')).toBeChecked();
    });

    it('should renders nice values if mode is custom for bucket', async () => {
      await renderAxisSettingsPopover({
        axis: 'x',
        extent: { mode: 'custom', lowerBound: 123, upperBound: 456 },
      });
      expect(screen.getByTestId('lnsXY_axisExtent_niceValues')).toBeChecked();
    });

    it('renders bucket (x) bound inputs if mode is custom', async () => {
      await renderAxisSettingsPopover({
        axis: 'x',
        extent: { mode: 'custom', lowerBound: 123, upperBound: 456 },
      });
      const rangeInput = screen.getByTestId('lnsXY_axisExtent_customBounds');
      const lower = within(rangeInput).getByTestId('lnsXY_axisExtent_lowerBound');
      const upper = within(rangeInput).getByTestId('lnsXY_axisExtent_upperBound');
      expect(lower).toHaveValue(123);
      expect(upper).toHaveValue(456);
    });

    describe('Custom bounds', () => {
      describe('changing scales', () => {
        it('should update extents when scale changes from linear to log scale', async () => {
          await renderAxisSettingsPopover({
            axis: 'yLeft',
            scale: 'linear',
            dataBounds: { min: 0, max: 1000 },
            extent: { mode: 'custom', lowerBound: 0, upperBound: 1000 },
          });

          const scaleSelect = screen.getByTestId('lnsScaleSelect');
          fireEvent.change(scaleSelect, { target: { value: 'log' } });

          expect(defaultProps.setScaleWithExtent).toBeCalledWith(
            {
              mode: 'custom',
              lowerBound: 0.01,
              upperBound: 1000,
            },
            'log'
          );
        });

        it('should update extent and scale when scale changes from log to linear scale', async () => {
          await renderAxisSettingsPopover({
            axis: 'yLeft',
            scale: 'log',
            dataBounds: { min: 0, max: 1000 },
            extent: { mode: 'custom', lowerBound: 0.01, upperBound: 1000 },
          });

          const scaleSelect = screen.getByTestId('lnsScaleSelect');
          fireEvent.change(scaleSelect, { target: { value: 'linear' } });

          expect(defaultProps.setScaleWithExtent).toBeCalledWith(
            {
              mode: 'custom',
              lowerBound: 0,
              upperBound: 1000,
            },
            'linear'
          );
        });
      });
    });

    describe('Changing bound type', () => {
      it('should reset y extent when mode changes from custom to full', async () => {
        const result = await renderAxisSettingsPopover({
          axis: 'yLeft',
          scale: 'log',
          dataBounds: { min: 0, max: 1000 },
          extent: { mode: 'custom', lowerBound: 10, upperBound: 1000 },
        });

        result.bounds.select('Full');

        expect(defaultProps.setExtent).toBeCalledWith({
          mode: 'full',
          lowerBound: undefined,
          upperBound: undefined,
        });

        (defaultProps.setExtent as jest.Mock).mockClear();
        result.bounds.select('Custom');
        expect(defaultProps.setExtent).toBeCalledWith({
          mode: 'custom',
          lowerBound: 0.01,
          upperBound: 1000,
        });
      });

      it('should reset y extent when mode changes from custom to data', async () => {
        const result = await renderAxisSettingsPopover({
          layers: [
            {
              seriesType: 'line',
              layerType: LayerTypes.DATA,
              layerId: 'first',
              splitAccessor: 'baz',
              xAccessor: 'foo',
              accessors: ['bar'],
            },
          ],
          scale: 'linear',
          dataBounds: { min: 0, max: 1000 },
          extent: { mode: 'custom', lowerBound: -10, upperBound: 1000 },
          axis: 'yRight',
        });

        result.bounds.select('Data');

        expect(defaultProps.setExtent).toBeCalledWith({
          mode: 'dataBounds',
          lowerBound: undefined,
          upperBound: undefined,
        });

        (defaultProps.setExtent as jest.Mock).mockClear();
        result.bounds.select('Custom');
        expect(defaultProps.setExtent).toBeCalledWith({
          mode: 'custom',
          lowerBound: 0,
          upperBound: 1000,
        });
      });

      it('should reset x extent when mode changes from custom to data', async () => {
        const result = await renderAxisSettingsPopover({
          axis: 'x',
          scale: 'linear',
          dataBounds: { min: 100, max: 1000 },
          extent: { mode: 'custom', lowerBound: -100, upperBound: 1000 },
        });

        result.bounds.select('Data');
        expect(defaultProps.setExtent).toBeCalledWith({
          mode: 'dataBounds',
          lowerBound: undefined,
          upperBound: undefined,
        });

        (defaultProps.setExtent as jest.Mock).mockClear();
        result.bounds.select('Custom');
        expect(defaultProps.setExtent).toBeCalledWith({
          mode: 'custom',
          lowerBound: 100,
          upperBound: 1000,
        });
      });
    });
  });
});
