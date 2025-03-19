/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LegendSizeSettings, LegendSizeSettingsProps } from './legend_size_settings';
import { LegendSize } from '@kbn/visualizations-plugin/public';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('legend size settings', () => {
  const renderLegendSizeSettings = (props?: Partial<LegendSizeSettingsProps>) => {
    const defaultProps: LegendSizeSettingsProps = {
      legendSize: undefined,
      onLegendSizeChange: () => {},
      isVerticalLegend: true,
      showAutoOption: false,
    };
    return render(<LegendSizeSettings {...defaultProps} {...props} />);
  };
  const openSelect = async () => await userEvent.click(screen.getByRole('button'));
  const chooseOption = async (option: string) => {
    await openSelect();
    fireEvent.click(screen.getByRole('option', { name: option }));
  };
  it('renders nothing if not vertical legend', () => {
    const { container } = renderLegendSizeSettings({ isVerticalLegend: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('defaults to correct value', () => {
    renderLegendSizeSettings();
    expect(screen.getByRole('button')).toHaveTextContent('Medium');
  });

  it('reflects current setting in select', () => {
    const CURRENT_SIZE = LegendSize.SMALL;
    renderLegendSizeSettings({ legendSize: CURRENT_SIZE });
    expect(screen.getByRole('button')).toHaveTextContent('Small');
  });

  it('allows user to select a new option', async () => {
    const onSizeChange = jest.fn();
    renderLegendSizeSettings({ onLegendSizeChange: onSizeChange });
    await chooseOption('Extra large');
    await chooseOption('Medium');
    expect(onSizeChange).toHaveBeenNthCalledWith(1, LegendSize.EXTRA_LARGE);
    expect(onSizeChange).toHaveBeenNthCalledWith(2, undefined);
  });

  it('hides "auto" option if visualization not using it', async () => {
    renderLegendSizeSettings({ showAutoOption: true });
    await openSelect();
    expect(
      screen.getAllByRole('option').filter((option) => option.textContent === 'Auto')
    ).toHaveLength(1);

    cleanup();

    renderLegendSizeSettings({ showAutoOption: false });
    await openSelect();
    expect(
      screen.getAllByRole('option').filter((option) => option.textContent === 'Auto')
    ).toHaveLength(0);
  });
});
