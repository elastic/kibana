/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AxisLabelOrientationSelectorProps } from './axis_label_orientation_selector';
import { AxisLabelOrientationSelector } from './axis_label_orientation_selector';

const renderComponent = (propsOverrides?: Partial<AxisLabelOrientationSelectorProps>) => {
  return render(
    <AxisLabelOrientationSelector
      axis="x"
      selectedLabelOrientation={0}
      setLabelOrientation={jest.fn()}
      {...propsOverrides}
    />
  );
};

describe('AxisLabelOrientationSelector', () => {
  it('should render all buttons', () => {
    renderComponent();

    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent(/horizontal/i);
    expect(screen.getByRole('button', { name: /vertical/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /angled/i })).toBeEnabled();
  });

  it('should call setOrientation when changing the orientation', () => {
    const setLabelOrientation = jest.fn();
    renderComponent({ setLabelOrientation });

    fireEvent.click(screen.getByRole('button', { name: /vertical/i }));

    expect(setLabelOrientation).toBeCalledTimes(1);
    expect(setLabelOrientation).toBeCalledWith(-90);
  });
});
