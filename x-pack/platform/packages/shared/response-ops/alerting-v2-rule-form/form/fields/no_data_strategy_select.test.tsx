/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoDataStrategySelect } from './no_data_strategy_select';

describe('NoDataStrategySelect', () => {
  it('renders the label and the selected value', () => {
    render(<NoDataStrategySelect value="last_known_status" onChange={jest.fn()} />);

    expect(screen.getByText('No data behavior')).toBeInTheDocument();
    expect(screen.getByTestId('ruleV2NoDataStrategySelect')).toHaveTextContent(
      'Keep last known status'
    );
  });

  it('displays the correct text for each strategy value', () => {
    const { rerender } = render(<NoDataStrategySelect value="recover" onChange={jest.fn()} />);
    expect(screen.getByTestId('ruleV2NoDataStrategySelect')).toHaveTextContent('Recover');

    rerender(<NoDataStrategySelect value="none" onChange={jest.fn()} />);
    expect(screen.getByTestId('ruleV2NoDataStrategySelect')).toHaveTextContent('Do nothing');
  });

  it('does not include the emit option', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<NoDataStrategySelect value="last_known_status" onChange={jest.fn()} />);

    await user.click(screen.getByTestId('ruleV2NoDataStrategySelect'));

    expect(screen.queryByText('Use no data status')).not.toBeInTheDocument();
  });

  it('calls onChange with the selected strategy', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = jest.fn();
    render(<NoDataStrategySelect value="last_known_status" onChange={onChange} />);

    await user.click(screen.getByTestId('ruleV2NoDataStrategySelect'));
    await user.click(screen.getByText('Recover'));

    expect(onChange).toHaveBeenCalledWith('recover');
  });

  it('honors a custom data-test-subj', () => {
    render(
      <NoDataStrategySelect
        value="last_known_status"
        onChange={jest.fn()}
        data-test-subj="customNoData"
      />
    );

    expect(screen.getByTestId('customNoData')).toHaveTextContent('Keep last known status');
  });

  it('disables the select when disabled', () => {
    render(<NoDataStrategySelect value="last_known_status" onChange={jest.fn()} disabled />);

    expect(screen.getByTestId('ruleV2NoDataStrategySelect')).toBeDisabled();
  });
});
