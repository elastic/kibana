/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ValuesInput } from './values_input';
import { RenderOptions, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('react-use/lib/useDebounce', () => (fn: () => void) => fn());

const renderValuesInput = (
  {
    value = 5,
    onChange = jest.fn(),
  }: {
    value?: number;
    onChange?: (value: number) => void;
  } = {
    value: 5,
    onChange: jest.fn(),
  },
  renderOptions?: RenderOptions
) => {
  return render(<ValuesInput value={value} onChange={onChange} />, renderOptions);
};

const getNumberInput = () => screen.getByLabelText(/number of values/i);

describe('Values', () => {
  it('should render EuiFieldNumber correctly', () => {
    renderValuesInput();
    expect(getNumberInput()).toHaveValue(5);
  });

  it('should not run onChange function on mount', () => {
    const onChangeSpy = jest.fn();
    renderValuesInput({ onChange: onChangeSpy });

    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it('should run onChange function on update', async () => {
    const onChangeSpy = jest.fn();
    renderValuesInput({ onChange: onChangeSpy });
    await userEvent.type(getNumberInput(), '{backspace}7');

    expect(getNumberInput()).toHaveValue(7);
    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith(7);
  });

  it('should not run onChange function on update when value is out of 1-10000 range', async () => {
    const onChangeSpy = jest.fn();
    renderValuesInput({ onChange: onChangeSpy });
    await userEvent.type(getNumberInput(), '{backspace}10007');

    expect(getNumberInput()).toHaveValue(10007);
    expect(onChangeSpy).toHaveBeenCalledWith(10000);
  });

  it('should show an error message when the value is out of bounds', async () => {
    renderValuesInput({ value: -5 });

    expect(getNumberInput()).toBeInvalid();
    expect(
      screen.getByText('Value is lower than the minimum 1, the minimum value is used instead.')
    ).toBeInTheDocument();
    await userEvent.type(getNumberInput(), '{backspace}{backspace}10007');
    expect(getNumberInput()).toBeInvalid();
    expect(
      screen.getByText('Value is higher than the maximum 10000, the maximum value is used instead.')
    ).toBeInTheDocument();
  });

  it('should fallback to last valid value on input blur', async () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <div>
        <button>testing blur by clicking outside button</button>
        {children}
      </div>
    );

    renderValuesInput({ value: 123 }, { wrapper: Wrapper });

    async function changeAndBlur(newValue: string) {
      await userEvent.type(getNumberInput(), newValue);
      await userEvent.click(
        screen.getByRole('button', { name: /testing blur by clicking outside button/i })
      );
    }

    await changeAndBlur('{backspace}{backspace}{backspace}-5');

    expect(getNumberInput()).not.toBeInvalid();
    expect(getNumberInput()).toHaveValue(1);

    await changeAndBlur('{backspace}{backspace}50000');

    expect(getNumberInput()).not.toBeInvalid();
    expect(getNumberInput()).toHaveValue(10000);

    await changeAndBlur('{backspace}{backspace}{backspace}{backspace}{backspace}');

    // as we're not handling the onChange state, it fallbacks to the value prop
    expect(getNumberInput()).not.toBeInvalid();
    expect(getNumberInput()).toHaveValue(123);
  });
});
