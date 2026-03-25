/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { LegendSettingsProps } from './legend_settings';
import { LegendSettingsPopover } from './legend_settings';
import userEvent from '@testing-library/user-event';
import type { RenderOptions } from '@testing-library/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { getSelectedButtonInGroup } from '@kbn/test-eui-helpers';
import { LegendValue, Position } from '@elastic/charts';
import { LegendLayout } from '@kbn/chart-expressions-common';

describe('Legend Settings', () => {
  let defaultProps: LegendSettingsProps;
  beforeEach(() => {
    defaultProps = {
      legendOptions: [
        {
          id: `test_legend_auto`,
          value: 'auto',
          label: 'Auto',
        },
        {
          id: `test_legend_show`,
          value: 'show',
          label: 'Show',
        },
        {
          id: `test_legend_hide`,
          value: 'hide',
          label: 'Hide',
        },
      ],
      mode: 'auto',
      showAutoLegendSizeOption: true,
      onDisplayChange: jest.fn(),
      onPositionChange: jest.fn(),
      onLegendSizeChange: jest.fn(),
    };
  });

  const renderLegendSettingsPopover = async (
    overrideProps?: Partial<LegendSettingsProps>,
    renderOptions?: RenderOptions
  ) => {
    const rtlRender = render(
      <LegendSettingsPopover {...defaultProps} {...overrideProps} />,
      renderOptions
    );
    const openLegendPopover = async () =>
      await userEvent.click(screen.getByRole('button', { name: 'Legend' }));
    await openLegendPopover();

    return {
      ...rtlRender,
      getSelectedDisplayOption: getSelectedButtonInGroup('lens-legend-display-btn'),
    };
  };

  it('should have selected the given mode as Display value', async () => {
    const { getSelectedDisplayOption } = await renderLegendSettingsPopover();
    expect(getSelectedDisplayOption()).toHaveTextContent('Auto');
  });

  it('should have called the onDisplayChange function on ButtonGroup change', async () => {
    await renderLegendSettingsPopover();
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(defaultProps.onDisplayChange).toHaveBeenCalled();
  });

  it('should have default line limit set to one and be enabled when it is on', async () => {
    await renderLegendSettingsPopover({ shouldTruncate: true });
    const lineLimit = screen.getByRole('spinbutton', { name: 'Line limit' });
    expect(lineLimit).toHaveValue(1);
    expect(lineLimit).not.toBeDisabled();
  });

  it('should have default line limit set to one and be disabled when it is off', async () => {
    await renderLegendSettingsPopover({ shouldTruncate: false });
    const lineLimit = screen.getByRole('spinbutton', { name: 'Line limit' });
    expect(lineLimit).toHaveValue(1);
    expect(lineLimit).toBeDisabled();
  });

  it('should have default width limit set to 250 and be enabled when it is on', async () => {
    await renderLegendSettingsPopover({
      shouldTruncate: true,
      position: Position.Bottom,
      location: 'outside',
      layout: LegendLayout.List,
      onLayoutChange: jest.fn(),
    });
    const widthLimit = screen.getByRole('spinbutton', { name: 'Width limit' });
    expect(widthLimit).toHaveValue(250);
    expect(widthLimit).not.toBeDisabled();
  });

  it('should have default width limit set to 250 and be disabled when it is off', async () => {
    await renderLegendSettingsPopover({
      shouldTruncate: false,
      position: Position.Bottom,
      location: 'outside',
      layout: LegendLayout.List,
      onLayoutChange: jest.fn(),
    });
    const widthLimit = screen.getByRole('spinbutton', { name: 'Width limit' });
    expect(widthLimit).toHaveValue(250);
    expect(widthLimit).toBeDisabled();
  });

  it('should have the `Label truncation` switch enabled by default', async () => {
    await renderLegendSettingsPopover();
    const switchElement = screen.getByRole('switch', { name: 'Label truncation' });
    expect(switchElement).toBeChecked();
  });

  it('should set the truncate switch state when truncate prop value is false', async () => {
    await renderLegendSettingsPopover({ shouldTruncate: false });
    const switchElement = screen.getByRole('switch', { name: 'Label truncation' });
    expect(switchElement).not.toBeChecked();
  });

  it('should have called the onTruncateLegendChange function on truncate switch change', async () => {
    const onTruncateLegendChange = jest.fn();
    await renderLegendSettingsPopover({ onTruncateLegendChange });
    const switchElement = screen.getByRole('switch', { name: 'Label truncation' });
    fireEvent.click(switchElement);
    expect(onTruncateLegendChange).toHaveBeenCalled();
  });

  it('should enable the Nested Legend Switch when renderNestedLegendSwitch prop is true', async () => {
    await renderLegendSettingsPopover({ renderNestedLegendSwitch: true });
    expect(screen.getByRole('switch', { name: 'Nested' })).toBeEnabled();
  });

  it('should set the switch state on nestedLegend prop value', async () => {
    await renderLegendSettingsPopover({ renderNestedLegendSwitch: true, nestedLegend: true });
    expect(screen.getByRole('switch', { name: 'Nested' })).toBeChecked();
  });

  it('should have called the onNestedLegendChange function on switch change', async () => {
    const onNestedLegendChange = jest.fn();
    await renderLegendSettingsPopover({ renderNestedLegendSwitch: true, onNestedLegendChange });
    const switchElement = screen.getByRole('switch', { name: 'Nested' });
    fireEvent.click(switchElement);
    expect(onNestedLegendChange).toHaveBeenCalled();
  });

  it('should hide switch group on hide mode', async () => {
    await renderLegendSettingsPopover({ mode: 'hide', renderNestedLegendSwitch: true });
    expect(screen.queryByRole('switch', { name: 'Nested' })).toBeNull();
  });

  it('should display allowed legend stats', async () => {
    const onLegendStatsChange = jest.fn();
    await renderLegendSettingsPopover({
      allowedLegendStats: [
        {
          label: 'Current and last value',
          value: LegendValue.CurrentAndLastValue,
          toolTipContent: 'Shows the current and last value',
        },
        {
          label: 'Average',
          value: LegendValue.Average,
          toolTipContent: 'Shows the average value',
        },
      ],
      legendStats: [LegendValue.Average],
      onLegendStatsChange,
    });
    fireEvent.click(screen.getByRole('combobox', { name: 'Statistics' }));
    fireEvent.click(screen.getByRole('option', { name: 'Current and last value' }));
    expect(onLegendStatsChange).toBeCalledWith(
      [LegendValue.Average, LegendValue.CurrentAndLastValue],
      false
    );
  });

  it('should show Layout setting for top/bottom outside legends and call onLayoutChange', async () => {
    const onLayoutChange = jest.fn();
    await renderLegendSettingsPopover({
      position: Position.Bottom,
      location: 'outside',
      layout: LegendLayout.List,
      onLayoutChange,
    });

    expect(screen.getByTestId('lens-legend-layout-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Grid' }));
    expect(onLayoutChange).toHaveBeenCalledWith(undefined);
  });

  it('should allow switching between Grid and List layouts', async () => {
    const onLayoutChange = jest.fn();

    const StatefulLayout = () => {
      const [layout, setLayout] = React.useState<LegendLayout | undefined>(undefined);
      return (
        <LegendSettingsPopover
          {...defaultProps}
          position={Position.Bottom}
          location="outside"
          layout={layout}
          onLayoutChange={(nextLayout) => {
            onLayoutChange(nextLayout);
            setLayout(nextLayout);
          }}
        />
      );
    };

    render(<StatefulLayout />);
    await userEvent.click(screen.getByRole('button', { name: 'Legend' }));

    const gridButton = screen.getByRole('button', { name: 'Grid' });
    expect(gridButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(onLayoutChange).toHaveBeenCalledWith(LegendLayout.List);
    expect(screen.getByRole('button', { name: 'Grid' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Grid' }));
    expect(onLayoutChange).toHaveBeenCalledWith(undefined);
  });

  it('should show pixel truncation input when list layout is selected', async () => {
    await renderLegendSettingsPopover({
      position: Position.Bottom,
      location: 'outside',
      layout: LegendLayout.List,
      onLayoutChange: jest.fn(),
    });

    expect(screen.getByRole('spinbutton', { name: 'Width limit' })).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: 'Line limit' })).toBeNull();
  });

  it('should show line truncation input when inside legend is selected', async () => {
    await renderLegendSettingsPopover({
      position: Position.Bottom,
      location: 'inside',
      layout: LegendLayout.List,
      onLayoutChange: jest.fn(),
    });

    expect(screen.getByRole('spinbutton', { name: 'Line limit' })).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: 'Pixel limit' })).toBeNull();
  });

  it('should not show Layout setting and should show line truncation input for vertical legends', async () => {
    await renderLegendSettingsPopover({
      position: Position.Right,
      location: 'outside',
      layout: LegendLayout.List,
      onLayoutChange: jest.fn(),
    });

    expect(screen.queryByTestId('lens-legend-layout-btn')).toBeNull();
    expect(screen.getByRole('spinbutton', { name: 'Line limit' })).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: 'Pixel limit' })).toBeNull();
  });
});
