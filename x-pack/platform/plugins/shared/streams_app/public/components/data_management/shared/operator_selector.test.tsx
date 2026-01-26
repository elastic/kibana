/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDefaultFormValueForOperator } from '@kbn/streamlang';

import { OperatorSelector, BooleanShorthandOperatorKeys } from './operator_selector';

describe('OperatorSelector', () => {
  const baseField = 'is_active';

  it('renders the boolean shorthand options', () => {
    const onChange = jest.fn();
    render(
      <OperatorSelector condition={{ field: baseField, eq: '' }} onConditionChange={onChange} />
    );

    const select = screen.getByRole('combobox');
    const optionTexts = within(select)
      .getAllByRole('option')
      .map((o) => o.textContent);

    expect(optionTexts).toEqual(
      expect.arrayContaining(['equals true', 'equals false', 'not equals true', 'not equals false'])
    );
  });

  it('displays shorthand value for eq true', () => {
    const onChange = jest.fn();
    render(
      <OperatorSelector condition={{ field: baseField, eq: true }} onConditionChange={onChange} />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe(BooleanShorthandOperatorKeys.EQ_TRUE);
  });

  it('displays shorthand value for neq false', () => {
    const onChange = jest.fn();
    render(
      <OperatorSelector condition={{ field: baseField, neq: false }} onConditionChange={onChange} />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe(BooleanShorthandOperatorKeys.NEQ_FALSE);
  });

  it('emits appropriate streamlang condition when shorthand operator is selected', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <OperatorSelector condition={{ field: baseField, eq: '' }} onConditionChange={onChange} />
    );

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, BooleanShorthandOperatorKeys.EQ_TRUE);

    expect(onChange).toHaveBeenCalledWith({ field: baseField, eq: true });
  });

  it('switching from boolean shorthand to base eq uses default value when types differ', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    // Start from a shorthand-representable condition (eq boolean)
    render(
      <OperatorSelector condition={{ field: baseField, eq: true }} onConditionChange={onChange} />
    );

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'eq');

    const expectedDefault = getDefaultFormValueForOperator('eq');
    expect(onChange).toHaveBeenCalledWith({ field: baseField, eq: expectedDefault });
  });

  it('keeps existing value when switching to an operator with same value type', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    // Existing string value, switching to eq (string default) preserves value
    render(
      <OperatorSelector
        condition={{ field: baseField, contains: 'abc' }}
        onConditionChange={onChange}
      />
    );

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'eq');

    expect(onChange).toHaveBeenCalledWith({ field: baseField, eq: 'abc' });
  });

  it('renders range operator option', () => {
    const onChange = jest.fn();
    render(
      <OperatorSelector condition={{ field: baseField, eq: '' }} onConditionChange={onChange} />
    );

    const select = screen.getByRole('combobox');
    const optionTexts = within(select)
      .getAllByRole('option')
      .map((o) => o.textContent);

    expect(optionTexts).toEqual(expect.arrayContaining(['in range']));
  });

  it('displays range operator when condition has range', () => {
    const onChange = jest.fn();
    render(
      <OperatorSelector
        condition={{ field: baseField, range: { gte: '0', lt: '100' } }}
        onConditionChange={onChange}
      />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('range');
  });

  it('emits appropriate condition when range operator is selected', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <OperatorSelector condition={{ field: baseField, eq: '' }} onConditionChange={onChange} />
    );

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'range');

    const expectedDefault = getDefaultFormValueForOperator('range');
    expect(onChange).toHaveBeenCalledWith({ field: baseField, range: expectedDefault });
  });
});
