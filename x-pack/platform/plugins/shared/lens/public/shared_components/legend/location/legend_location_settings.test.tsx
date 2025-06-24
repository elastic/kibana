/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LegendLocationSettings, LegendLocationSettingsProps } from './legend_location_settings';
import { RenderOptions, fireEvent, render, screen } from '@testing-library/react';
import { getSelectedButtonInGroup } from '@kbn/test-eui-helpers';

describe('Legend Location Settings', () => {
  let defaultProps: LegendLocationSettingsProps;
  beforeEach(() => {
    defaultProps = {
      onLocationChange: jest.fn(),
      onPositionChange: jest.fn(),
      onAlignmentChange: jest.fn(),
      location: 'outside',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderLegendLocationSettings = (
    overrideProps?: Partial<LegendLocationSettingsProps>,
    renderOptions?: RenderOptions
  ) => {
    const rtlRender = render(
      <LegendLocationSettings {...defaultProps} {...overrideProps} />,
      renderOptions
    );

    return {
      ...rtlRender,
      getSelectedPositionOption: getSelectedButtonInGroup('lens-legend-position-btn'),
      getSelectedLocationOption: getSelectedButtonInGroup('lens-legend-location-btn'),
      getSelectedAlignmentOption: getSelectedButtonInGroup('lens-legend-inside-alignment-btn'),
    };
  };

  it('should have default the Position to right when no position is given', () => {
    const { getSelectedPositionOption } = renderLegendLocationSettings();
    expect(getSelectedPositionOption()).toHaveTextContent('Right');
  });

  it('should have called the onPositionChange function on ButtonGroup change', () => {
    renderLegendLocationSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Left' }));
    expect(defaultProps.onPositionChange).toHaveBeenCalled();
  });

  it('should hide the position button group if location inside is given', () => {
    renderLegendLocationSettings({ location: 'inside' });
    expect(screen.queryByTestId('lens-legend-position-btn')).toBeNull();
  });

  it('should render the location settings if location inside is given', () => {
    renderLegendLocationSettings({ location: 'inside' });
    expect(screen.queryByTestId('lens-legend-location-btn')).toBeInTheDocument();
  });

  it('should have selected the given location', () => {
    const { getSelectedLocationOption } = renderLegendLocationSettings({ location: 'inside' });
    expect(getSelectedLocationOption()).toHaveTextContent('Inside');
  });

  it('should have called the onLocationChange function on ButtonGroup change', () => {
    renderLegendLocationSettings({ location: 'inside' });
    fireEvent.click(screen.getByRole('button', { name: 'Outside' }));
    expect(defaultProps.onLocationChange).toHaveBeenCalled();
  });

  it('should default the alignment to top right when no value is given', () => {
    const { getSelectedAlignmentOption } = renderLegendLocationSettings({ location: 'inside' });
    expect(getSelectedAlignmentOption()).toHaveTextContent('Top right');
  });

  it('should have called the onAlignmentChange function on ButtonGroup change', () => {
    renderLegendLocationSettings({ location: 'inside' });
    fireEvent.click(screen.getByRole('button', { name: 'Top left' }));
    expect(defaultProps.onAlignmentChange).toHaveBeenCalled();
  });

  it('should hide the component if isDisabled prop is true', () => {
    const { container } = renderLegendLocationSettings({ isDisabled: true });
    expect(container).toBeEmptyDOMElement();
  });
});
