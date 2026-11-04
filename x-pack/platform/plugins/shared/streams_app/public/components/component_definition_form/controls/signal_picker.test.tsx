/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { SignalPicker } from './signal_picker';

const renderPicker = (selected: string[]) => {
  const onChange = jest.fn();
  render(
    <EuiProvider>
      <SignalPicker
        label="Signals"
        options={['logs', 'metrics', 'traces']}
        selected={selected}
        onChange={onChange}
        dataTestSubj="signalPicker"
      />
    </EuiProvider>
  );
  return { onChange };
};

describe('SignalPicker', () => {
  it('keeps the other signals when one is removed', async () => {
    const { onChange } = renderPicker(['logs', 'metrics', 'traces']);

    await userEvent.click(screen.getByLabelText('Remove metrics from selection in this group'));

    expect(onChange).toHaveBeenCalledWith(['logs', 'traces']);
  });

  it('adds a signal to the ones already selected', async () => {
    const { onChange } = renderPicker(['logs']);

    await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
    await userEvent.click(screen.getByRole('option', { name: 'traces' }));

    expect(onChange).toHaveBeenCalledWith(['logs', 'traces']);
  });
});
