/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CategoryFieldSelector } from './category_field_selector';

const fields = [{ label: 'message' }, { label: 'error.message' }];

const renderSelector = (onChange = jest.fn()) => {
  render(
    <>
      <CategoryFieldSelector
        fields={fields}
        selectedField={undefined}
        isDisabled={false}
        onChange={onChange}
      />
      <button type="button">next</button>
    </>
  );
  return screen.getByRole('combobox', { name: 'Category field' });
};

describe('CategoryFieldSelector', () => {
  it('announces an error linked to the input when unselected text is left on blur', async () => {
    const user = userEvent.setup();
    const input = renderSelector();

    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText(/is not a valid category field/)).not.toBeInTheDocument();

    await user.type(input, 'messa');
    await user.click(screen.getByRole('button', { name: 'next' }));

    const error = screen.getByText(
      'messa is not a valid category field. Select a field from the list.'
    );
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
    expect(error.closest('[aria-live="polite"]')).not.toBeNull();
  });

  it('clears the error once the text is removed', async () => {
    const user = userEvent.setup();
    const input = renderSelector();

    await user.type(input, 'foo');
    fireEvent.blur(input);
    expect(screen.getByText(/is not a valid category field/)).toBeInTheDocument();

    await user.clear(input);
    expect(screen.queryByText(/is not a valid category field/)).not.toBeInTheDocument();
  });

  it('clears the error and notifies the parent when a field is selected', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const input = renderSelector(onChange);

    await user.type(input, 'mess');
    fireEvent.blur(input);
    expect(screen.getByText(/is not a valid category field/)).toBeInTheDocument();

    await user.click(input);
    await user.click(await screen.findByRole('option', { name: 'message' }));

    expect(onChange).toHaveBeenCalledWith([{ label: 'message' }]);
    expect(screen.queryByText(/is not a valid category field/)).not.toBeInTheDocument();
  });
});
