/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PointVisibilityOption, PointVisibilityOptionProps } from './point_visibility_option';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const renderComponent = (propsOverrides?: Partial<PointVisibilityOptionProps>) => {
  return render(<PointVisibilityOption enabled={true} onChange={jest.fn()} {...propsOverrides} />);
};

describe('Point visibility option', () => {
  it(`should render all buttons and 'Auto' should be pressed by default`, () => {
    renderComponent();
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent(/auto/i);
    expect(screen.getByRole('button', { name: /show/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /hide/i })).toBeEnabled();
  });

  it(`should call the onChange function on point visibility button group change`, async () => {
    const onChange = jest.fn();
    renderComponent({ onChange });

    const button = screen.getByRole('button', { name: /show/i });
    await userEvent.click(button);

    expect(onChange).toBeCalledTimes(1);
    expect(onChange).toBeCalledWith('always');
  });

  it(`should be hidden when not enabled`, async () => {
    renderComponent({ enabled: false });
    expect(screen.queryByTestId('lnsPointVisibilityOption')).not.toBeInTheDocument();
  });
});
