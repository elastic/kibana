/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { NumberField } from './number_field';

describe('NumberField', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    onChange.mockReset();
  });

  test('allows any value with no defined min or max', async () => {
    render(<NumberField onChange={onChange} />);
    const input = screen.getByRole('spinbutton');

    await userEvent.type(input, '3');
    expect(onChange).toHaveBeenCalledWith('3');

    await userEvent.tripleClick(input);
    await userEvent.paste('0');
    expect(onChange).toHaveBeenCalledWith('0');
  });

  test('constrains value to defined min', async () => {
    render(<NumberField min={0} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');

    await userEvent.type(input, '1');
    expect(onChange).toHaveBeenCalledWith('1');

    await userEvent.tripleClick(input);
    await userEvent.paste('-1');
    expect(onChange).not.toHaveBeenCalledWith('-1');
  });

  test('constrains value to defined max', async () => {
    render(<NumberField max={10} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');

    await userEvent.type(input, '-1');
    expect(onChange).toHaveBeenCalledWith('-1');

    await userEvent.tripleClick(input);
    await userEvent.paste('11');
    expect(onChange).not.toHaveBeenCalledWith('11');
  });
});
