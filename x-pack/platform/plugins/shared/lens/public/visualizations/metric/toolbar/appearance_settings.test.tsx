/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Alignment, MetricVisualizationState } from '@kbn/lens-common';
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
const fullState: Required<
  Omit<MetricVisualizationState, 'secondaryPrefix' | 'valuesTextAlign' | 'titleWeight'>
> = {
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
  icon: 'processor',
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
  iconAlign: 'right',
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

  it('shows custom template when layout fields do not match any preset', () => {
    // 'left'/'center'/'right' combination does not match any preset
    renderComponent({ primaryPosition: 'bottom', titlesTextAlign: 'center', primaryAlign: 'left' });

    expect(screen.getByTestId('lens-metric-style-template-custom')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('shows custom template after custom card is clicked even if layout still matches a preset', () => {
    // State matches the 'bottom' preset
    renderComponent({
      primaryPosition: 'bottom',
      titlesTextAlign: 'left',
      primaryAlign: 'right',
    });

    // Before click: 'bottom' preset is inferred and selected
    expect(screen.getByTestId('lens-metric-style-template-bottom')).toHaveAttribute(
      'aria-checked',
      'true'
    );

    fireEvent.click(screen.getByTestId('lens-metric-style-template-custom'));

    // After click: custom is selected via local React state, no state write needed
    expect(screen.getByTestId('lens-metric-style-template-custom')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('shows bottom template when layout fields match the bottom preset', () => {
    renderComponent({
      primaryPosition: 'bottom',
      titlesTextAlign: 'left',
      primaryAlign: 'right',
    });

    expect(screen.getByTestId('lens-metric-style-template-bottom')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('shows custom template when font size differs from defaults', () => {
    renderComponent({
      primaryPosition: 'bottom',
      titlesTextAlign: 'left',
      primaryAlign: 'right',
      valueFontMode: 'fit',
    });

    expect(screen.getByTestId('lens-metric-style-template-custom')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('shows custom template when icon position differs from defaults', () => {
    renderComponent({
      primaryPosition: 'bottom',
      titlesTextAlign: 'left',
      primaryAlign: 'right',
      icon: 'sortUp',
      iconAlign: 'left',
    });

    expect(screen.getByTestId('lens-metric-style-template-custom')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('infers bottom preset when secondaryAlign is absent without secondary metric', () => {
    renderComponent({
      primaryPosition: 'bottom',
      titlesTextAlign: 'left',
      primaryAlign: 'right',
      secondaryAlign: undefined,
      secondaryMetricAccessor: undefined,
    });

    expect(screen.getByTestId('lens-metric-style-template-bottom')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('infers custom template when secondaryAlign is set but mismatches preset without secondary metric', () => {
    renderComponent({
      primaryPosition: 'bottom',
      titlesTextAlign: 'left',
      primaryAlign: 'right',
      secondaryAlign: 'left',
      secondaryMetricAccessor: undefined,
    });

    expect(screen.getByTestId('lens-metric-style-template-custom')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('applies full appearance defaults when a template card is selected', () => {
    renderComponent({
      primaryPosition: 'bottom',
      titlesTextAlign: 'left',
      primaryAlign: 'right',
      secondaryAlign: 'right',
      valueFontMode: 'fit',
      iconAlign: 'left',
    });

    fireEvent.click(screen.getByTestId('lens-metric-style-template-top'));

    expect(mockSetState).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryPosition: 'top',
        titlesTextAlign: 'left',
        primaryAlign: 'left',
        secondaryAlign: 'left',
        valueFontMode: 'default',
        iconAlign: 'right',
      })
    );
  });

  it('applies secondary and icon defaults even when controls are disabled', () => {
    renderComponent({
      secondaryMetricAccessor: undefined,
      icon: undefined,
      secondaryAlign: undefined,
      iconAlign: undefined,
      valueFontMode: 'fit',
    });

    fireEvent.click(screen.getByTestId('lens-metric-style-template-middle'));

    expect(mockSetState).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryPosition: 'middle',
        titlesTextAlign: 'center',
        primaryAlign: 'center',
        secondaryAlign: 'center',
        valueFontMode: 'default',
        iconAlign: 'right',
      })
    );
  });

  it('opens details accordion when custom card is selected without writing to saved state', () => {
    // Start with a preset layout (bottom matches)
    renderComponent({
      primaryPosition: 'bottom',
      titlesTextAlign: 'left',
      primaryAlign: 'right',
    });

    const detailsAccordion = screen.getByTestId('lens-metric-appearance-details-accordion');
    const detailsButton = detailsAccordion.querySelector('button');

    expect(detailsButton).not.toBeNull();
    expect(detailsButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(screen.getByTestId('lens-metric-style-template-custom'));

    expect(detailsButton).toHaveAttribute('aria-expanded', 'true');
    expect(mockSetState).not.toHaveBeenCalled();
  });

  it('infers template from new field values after editing a layout option', () => {
    // Start with all four layout fields matching the 'top' preset exactly.
    // icon/iconAlign are cleared so the legacy iconAlign fallback doesn't interfere.
    const { rerender } = renderComponent({
      primaryPosition: 'top',
      titlesTextAlign: 'left',
      primaryAlign: 'left',
      secondaryAlign: 'left',
      icon: undefined,
      iconAlign: undefined,
    });

    expect(screen.getByTestId('lens-metric-style-template-top')).toHaveAttribute(
      'aria-checked',
      'true'
    );

    const btnGroup = new EuiButtonGroupTestHarness(
      'lens-metric-appearance-primary-metric-alignment-btn'
    );
    btnGroup.select('Right');

    expect(mockSetState).toHaveBeenCalledWith(expect.objectContaining({ primaryAlign: 'right' }));

    // Re-render with the updated state to verify inference recalculates to 'custom'
    const newState = mockSetState.mock.calls[0][0] as MetricVisualizationState;
    rerender(<MetricAppearanceSettings state={newState} setState={mockSetState} />);

    expect(screen.getByTestId('lens-metric-style-template-custom')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });
});
