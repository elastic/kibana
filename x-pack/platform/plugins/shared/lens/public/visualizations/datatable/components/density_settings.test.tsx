/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGridDensity } from '@kbn/unified-data-table';
import { DensitySettings, type DensitySettingsProps } from './density_settings';

describe('DensitySettings', () => {
  const defaultProps: DensitySettingsProps = {
    dataGridDensity: DataGridDensity.NORMAL,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderDensitySettingsComponent = (propsOverrides: Partial<DensitySettingsProps> = {}) => {
    const rtlRender = render(<DensitySettings {...defaultProps} {...propsOverrides} />);
    return {
      ...rtlRender,
      rerender: (newProps: Partial<DensitySettingsProps>) =>
        rtlRender.rerender(<DensitySettings {...defaultProps} {...newProps} />),
    };
  };

  it('renders the density settings component with label', () => {
    renderDensitySettingsComponent();
    expect(screen.getByTestId('lnsDensitySettings')).toBeInTheDocument();
    expect(screen.getByText('Density', { selector: 'label' })).toBeInTheDocument();
  });

  it('displays all three density options and selects the provided option', () => {
    renderDensitySettingsComponent();

    expect(screen.getByRole('button', { name: 'Compact', pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Normal', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expanded', pressed: false })).toBeInTheDocument();
  });

  it('calls onChange with compact density when compact option is clicked', () => {
    renderDensitySettingsComponent();

    fireEvent.click(screen.getByRole('button', { name: 'Compact' }));

    expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
    expect(defaultProps.onChange).toHaveBeenCalledWith(DataGridDensity.COMPACT);
  });

  it('calls onChange with expanded density when expanded option is clicked', () => {
    renderDensitySettingsComponent();

    fireEvent.click(screen.getByRole('button', { name: 'Expanded' }));

    expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
    expect(defaultProps.onChange).toHaveBeenCalledWith(DataGridDensity.EXPANDED);
  });

  it('falls back to NORMAL density when an invalid density is provided', () => {
    renderDensitySettingsComponent({
      dataGridDensity: 'invalid' as DataGridDensity,
    });

    // The component should still render without errors
    expect(screen.getByLabelText('Density')).toBeInTheDocument();

    // The Normal button should be pressed
    expect(screen.getByRole('button', { name: 'Normal', pressed: true })).toBeInTheDocument();
  });

  it('updates selection when props change', () => {
    const { rerender } = renderDensitySettingsComponent();

    // Initial render should have Normal selected
    expect(screen.getByRole('button', { name: 'Normal', pressed: true }));

    // Update props to Compact
    rerender({ dataGridDensity: DataGridDensity.COMPACT });

    // Now Compact should be pressed
    expect(screen.getByRole('button', { name: 'Compact', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Normal', pressed: false })).toBeInTheDocument();
  });
});
