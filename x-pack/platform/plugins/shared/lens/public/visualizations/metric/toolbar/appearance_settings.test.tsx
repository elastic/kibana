/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Alignment, MetricVisualizationState, PrimaryMetricPosition } from '@kbn/lens-common';
import { LENS_METRIC_LAYOUT_BY_POSITION } from '@kbn/lens-common';
import { EuiButtonGroupTestHarness } from '@kbn/test-eui-helpers';
import { MetricAppearanceSettings } from './appearance_settings';

const palette: PaletteOutput<CustomPaletteParams> = {
  type: 'palette',
  name: 'foo',
  params: {
    rangeType: 'percent',
  },
};

// Remove legacy state properties as they should be removed in the initialize method
const fullState: Required<Omit<MetricVisualizationState, 'secondaryPrefix' | 'valuesTextAlign'>> = {
  layerId: 'first',
  layerType: 'data',
  metricAccessor: 'metric-col-id',
  secondaryMetricAccessor: 'secondary-metric-col-id',
  maxAccessor: 'max-metric-col-id',
  breakdownByAccessor: 'breakdown-col-id',
  collapseFn: 'sum',
  subtitle: 'subtitle',
  secondaryLabel: 'extra-text',
  progressDirection: 'vertical',
  maxCols: 5,
  color: 'static-color',
  icon: 'compute',
  palette,
  showBar: true,
  trendlineLayerId: 'second',
  trendlineLayerType: 'metricTrendline',
  trendlineMetricAccessor: 'trendline-metric-col-id',
  trendlineSecondaryMetricAccessor: 'trendline-secondary-metric-col-id',
  trendlineTimeAccessor: 'trendline-time-col-id',
  trendlineBreakdownByAccessor: 'trendline-breakdown-col-id',
  titlesTextAlign: 'left',
  primaryAlign: 'right',
  secondaryAlign: 'right',
  primaryPosition: 'bottom',
  titleWeight: 'bold',
  iconAlign: 'left',
  valueFontMode: 'default',
  secondaryTrend: { type: 'none' },
  secondaryLabelPosition: 'before',
  applyColorTo: 'background',
};

const mockSetState = jest.fn();

const alignmentTransitions: [Alignment, string, Alignment, string][] = [
  ['left', 'Left', 'center', 'Center'],
  ['left', 'Left', 'right', 'Right'],
  ['center', 'Center', 'left', 'Left'],
  ['center', 'Center', 'right', 'Right'],
  ['right', 'Right', 'left', 'Left'],
  ['right', 'Right', 'center', 'Center'],
];

describe('appearance settings', () => {
  const renderComponent = (stateOverrides: Partial<MetricVisualizationState> = {}) => {
    const state = { ...fullState, ...stateOverrides } as MetricVisualizationState;
    const { ...rtlRest } = render(
      <MetricAppearanceSettings state={state} setState={mockSetState} />,
      {
        // fails in concurrent mode
        legacyRoot: true,
      }
    );

    return {
      ...rtlRest,
    };
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    mockSetState.mockClear();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should set a subtitle', async () => {
    renderComponent({ breakdownByAccessor: undefined });

    const newSubtitle = 'new subtitle hey';
    const subtitleField = screen.getByDisplayValue('subtitle');
    // cannot use userEvent because the element cannot be clicked on
    fireEvent.change(subtitleField, { target: { value: newSubtitle + ' 1' } });
    jest.advanceTimersByTime(256);
    expect(mockSetState).toHaveBeenCalled();
    fireEvent.change(subtitleField, { target: { value: newSubtitle + ' 2' } });
    jest.advanceTimersByTime(256);
    expect(mockSetState).toHaveBeenCalledTimes(2);
    fireEvent.change(subtitleField, { target: { value: newSubtitle + ' 3' } });
    jest.advanceTimersByTime(256);
    expect(mockSetState).toHaveBeenCalledTimes(3);
    expect(mockSetState.mock.calls.map(([state]) => state.subtitle)).toMatchInlineSnapshot(`
      Array [
        "new subtitle hey 1",
        "new subtitle hey 2",
        "new subtitle hey 3",
      ]
    `);
  });

  it('should disable subtitle option when Metric has breakdown by', () => {
    renderComponent({ breakdownByAccessor: 'some-accessor' });

    const subtitleInput = screen.getByTestId('lens-metric-appearance-subtitle-field');
    expect(subtitleInput).toBeDisabled();
  });

  it.each<[Alignment, string, Alignment, string]>(alignmentTransitions)(
    'should set titlesTextAlign when changing from %j (%s) to %j (%s)',
    (newAlign, newLabel, prevAlign, prevLabel) => {
      renderComponent({ titlesTextAlign: prevAlign });

      const btnGroup = new EuiButtonGroupTestHarness(
        'lens-metric-appearance-title-and-subtitle-alignment-btn'
      );

      expect(btnGroup.getSelected()?.textContent).toBe(prevLabel);

      btnGroup.select(newLabel);

      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({ titlesTextAlign: newAlign })
      );
    }
  );

  it.each<[Alignment, string, Alignment, string]>(alignmentTransitions)(
    'should set primaryAlign when changing from %j (%s) to %j (%s)',
    (newAlign, newLabel, prevAlign, prevLabel) => {
      renderComponent({ primaryAlign: prevAlign });

      const btnGroup = new EuiButtonGroupTestHarness(
        'lens-metric-appearance-primary-metric-alignment-btn'
      );

      expect(btnGroup.getSelected()?.textContent).toBe(prevLabel);

      btnGroup.select(newLabel);

      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({ primaryAlign: newAlign })
      );
    }
  );

  it.each<[Alignment, string, Alignment, string]>(alignmentTransitions)(
    'should set secondaryAlign when changing from %j (%s) to %j (%s)',
    (newAlign, newLabel, prevAlign, prevLabel) => {
      renderComponent({ secondaryAlign: prevAlign });

      const btnGroup = new EuiButtonGroupTestHarness(
        'lens-metric-appearance-secondary-metric-alignment-btn'
      );

      expect(btnGroup.getSelected()?.textContent).toBe(prevLabel);

      btnGroup.select(newLabel);

      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({ secondaryAlign: newAlign })
      );
    }
  );

  it('should disable Secondary metric alignment setting when no secondary metric', async () => {
    renderComponent({ secondaryMetricAccessor: undefined });

    expect(
      screen.getByTestId('lens-metric-appearance-secondary-metric-alignment-btn')
    ).toBeDisabled();
  });

  it('should set valueFontMode to Fit', async () => {
    renderComponent({ valueFontMode: 'default' });

    const btnGroup = new EuiButtonGroupTestHarness(
      'lens-metric-appearance-primary-metric-font-size-btn'
    );

    expect(btnGroup.getSelected()?.textContent).toBe('Default');

    btnGroup.select('Fit');
    btnGroup.select('Default');

    expect(mockSetState.mock.calls.map(([s]) => s.valueFontMode)).toEqual(['fit']);
  });

  it('should set valueFontMode to Default', async () => {
    renderComponent({ valueFontMode: 'fit' });

    const btnGroup = new EuiButtonGroupTestHarness(
      'lens-metric-appearance-primary-metric-font-size-btn'
    );

    expect(btnGroup.getSelected()?.textContent).toBe('Fit');

    btnGroup.select('Fit');
    btnGroup.select('Default');

    expect(mockSetState.mock.calls.map(([s]) => s.valueFontMode)).toEqual(['default']);
  });

  it('should set iconAlign when Left position option is selected', async () => {
    renderComponent({ icon: 'sortUp', iconAlign: 'left' });

    const btnGroup = new EuiButtonGroupTestHarness(
      'lens-metric-appearance-other-icon-position-btn'
    );

    expect(btnGroup.getSelected()?.textContent).toBe('Left');

    btnGroup.select('Left');
    btnGroup.select('Right');

    expect(mockSetState.mock.calls.map(([s]) => s.iconAlign)).toEqual(['right']);
  });

  it('should set iconAlign when Right position option is selected', async () => {
    renderComponent({ icon: 'sortUp', iconAlign: 'right' });

    const iconPositionBtnGroup = new EuiButtonGroupTestHarness(
      'lens-metric-appearance-other-icon-position-btn'
    );

    expect(iconPositionBtnGroup.getSelected()?.textContent).toBe('Right');

    iconPositionBtnGroup.select('Right');
    iconPositionBtnGroup.select('Left');

    expect(mockSetState.mock.calls.map(([s]) => s.iconAlign)).toEqual(['left']);
  });

  it('should select legacy default Icon position option when no iconAlign', async () => {
    renderComponent({ icon: 'sortUp', iconAlign: undefined });

    const iconPositionBtnGroup = new EuiButtonGroupTestHarness(
      'lens-metric-appearance-other-icon-position-btn'
    );

    expect(iconPositionBtnGroup.getSelected()?.textContent).toBe('Left');
  });

  it.each([undefined, 'empty'])('should disable iconAlign option when icon is %j', async (icon) => {
    renderComponent({ icon });

    expect(screen.queryByTestId('lens-metric-appearance-other-icon-position-btn')).toBeDisabled();
  });

  it('should set Regular titleWeight', async () => {
    renderComponent({ titleWeight: 'bold' });

    const fontWeightBtnGroup = new EuiButtonGroupTestHarness(
      'lens-metric-appearance-title-and-subtitle-font-weight-btn'
    );

    expect(fontWeightBtnGroup.getSelected()?.textContent).toBe('Bold');

    fontWeightBtnGroup.select('Regular');
    fontWeightBtnGroup.select('Bold');

    expect(mockSetState.mock.calls.map(([s]) => s.titleWeight)).toEqual(['normal']);
  });

  it('should set Bold titleWeight', async () => {
    renderComponent({ titleWeight: 'normal' });

    const fontWeightBtnGroup = new EuiButtonGroupTestHarness(
      'lens-metric-appearance-title-and-subtitle-font-weight-btn'
    );

    expect(fontWeightBtnGroup.getSelected()?.textContent).toBe('Regular');

    fontWeightBtnGroup.select('Regular');
    fontWeightBtnGroup.select('Bold');

    expect(mockSetState.mock.calls.map(([s]) => s.titleWeight)).toEqual(['bold']);
  });

  it.each<[PrimaryMetricPosition, string, PrimaryMetricPosition, string]>([
    ['top', 'Top', 'bottom', 'Bottom'],
    ['bottom', 'Bottom', 'top', 'Top'],
  ])(
    'should set default config when changing from %j (%s) to %j (%s)',
    (newPosition, newLabel, prevPosition, prevLabel) => {
      renderComponent({ primaryPosition: prevPosition });

      const btnGroup = new EuiButtonGroupTestHarness(
        'lens-metric-appearance-primary-metric-position-btn'
      );

      expect(btnGroup.getSelected()?.textContent).toBe(prevLabel);

      btnGroup.select(newLabel);

      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryPosition: newPosition,
          ...LENS_METRIC_LAYOUT_BY_POSITION[newPosition],
        })
      );
    }
  );
});
