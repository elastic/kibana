/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  AxisLabelOrientationSelector,
  AxisLabelOrientationSelectorProps,
} from './axis_label_orientation_selector';
import userEvent from '@testing-library/user-event';

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

  it('should call setOrientation when changing the orientation', async () => {
    const setLabelOrientation = jest.fn();
    renderComponent({ setLabelOrientation });

    const button = screen.getByRole('button', { name: /vertical/i });
    await userEvent.click(button);

    expect(setLabelOrientation).toBeCalledTimes(1);
    expect(setLabelOrientation).toBeCalledWith(-90);
  });
});
