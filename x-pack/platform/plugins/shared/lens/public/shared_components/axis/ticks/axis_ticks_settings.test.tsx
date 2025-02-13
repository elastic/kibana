/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AxisTicksSettings, AxisTicksSettingsProps } from './axis_ticks_settings';
import { render, screen } from '@testing-library/react';

const renderAxisTicksSettings = (propsOverrides?: Partial<AxisTicksSettingsProps>) => {
  return render(
    <AxisTicksSettings
      isAxisLabelVisible={true}
      axis="x"
      updateTicksVisibilityState={jest.fn()}
      {...propsOverrides}
    />
  );
};

describe('Axes Ticks settings', () => {
  it('should show the ticks switch as on', () => {
    renderAxisTicksSettings();
    expect(screen.getByLabelText('Tick labels')).toBeChecked();
  });

  it('should show the ticks switch as off is the isAxisLabelVisible is set to false', () => {
    renderAxisTicksSettings({ isAxisLabelVisible: false });
    expect(screen.getByLabelText('Tick labels')).not.toBeChecked();
  });

  it('should call the updateTicksVisibilityState when changing the switch status', () => {
    const updateTicksVisibilityStateSpy = jest.fn();
    renderAxisTicksSettings({
      updateTicksVisibilityState: updateTicksVisibilityStateSpy,
    });
    screen.getByLabelText('Tick labels').click();
    expect(updateTicksVisibilityStateSpy.mock.calls.length).toBe(1);
  });
});
