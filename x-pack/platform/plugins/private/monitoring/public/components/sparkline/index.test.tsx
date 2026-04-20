/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { Sparkline } from '.';

type OnHoverCallback = (dataPoint?: {
  xValue: number;
  yValue: number;
  xPosition: number;
  yPosition: number;
  plotTop: number;
  plotLeft: number;
  plotHeight: number;
  plotWidth: number;
}) => void;

let capturedOnHover: OnHoverCallback | undefined;

jest.mock('./sparkline_flot_chart', () => ({
  SparklineFlotChart: class {
    constructor(
      _containerElem: HTMLElement,
      _series: number[][],
      _onBrush: unknown,
      onHover: OnHoverCallback
    ) {
      capturedOnHover = onHover;
    }
    update() {}
    shutdown() {}
  },
}));

const defaultProps = {
  series: [
    [1513814814, 20],
    [1513814914, 25],
    [1513815114, 10],
  ],
  tooltip: {
    enabled: true,
    xValueFormatter: (x: number) => x,
    yValueFormatter: (y: number) => y,
  },
  options: {
    xaxis: {
      min: 1513814800,
      max: 1513815200,
    },
  },
};

const mockDataPoint = {
  xValue: 25,
  yValue: 1513814914,
  xPosition: 200,
  yPosition: 45,
  plotTop: 40,
  plotLeft: 150,
  plotHeight: 30,
  plotWidth: 100,
};

const renderSparkline = (overrides?: Partial<typeof defaultProps>) =>
  render(
    <EuiThemeProvider>
      <Sparkline {...defaultProps} {...overrides} />
    </EuiThemeProvider>
  );

describe('Sparkline component', () => {
  beforeEach(() => {
    capturedOnHover = undefined;
  });

  test('does not show tooltip initially', () => {
    const { container } = renderSparkline();
    expect(container.querySelector('.monSparklineTooltip__container')).toBeNull();
  });

  test('shows tooltip when the chart triggers onHover', () => {
    const { container } = renderSparkline();
    expect(capturedOnHover).toBeDefined();

    act(() => {
      capturedOnHover!(mockDataPoint);
    });

    const tooltipContainer = container.querySelector('.monSparklineTooltip__container');
    expect(tooltipContainer).not.toBeNull();
    expect(tooltipContainer!.textContent).toContain('1513814914');
    expect(tooltipContainer!.textContent).toContain('25');
  });

  test('hides tooltip when tooltip.enabled is false', () => {
    const { container, rerender } = renderSparkline();

    act(() => {
      capturedOnHover!(mockDataPoint);
    });

    expect(container.querySelector('.monSparklineTooltip__container')).not.toBeNull();

    rerender(
      <EuiThemeProvider>
        <Sparkline {...defaultProps} tooltip={{ ...defaultProps.tooltip, enabled: false }} />
      </EuiThemeProvider>
    );

    expect(container.querySelector('.monSparklineTooltip__container')).toBeNull();
  });

  test('does not use Font Awesome classes', () => {
    const { container } = renderSparkline();

    act(() => {
      capturedOnHover!(mockDataPoint);
    });

    expect(container.querySelector('.fa')).toBeNull();
    expect(container.querySelector('[class*="fa-caret"]')).toBeNull();
  });
});
