/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LifecycleMethodCard } from './lifecycle_method_card';

describe('LifecycleMethodCard', () => {
  const renderWithTheme = (node: React.ReactElement) =>
    render(node, {
      wrapper: EuiThemeProvider,
    });

  it('calls onChange with its method when selected', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    renderWithTheme(
      <LifecycleMethodCard method="dlm" selectedMethod="ilm" disabled={false} onChange={onChange} />
    );

    await user.click(screen.getByRole('radio'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('dlm');
  });

  it('is disabled and cannot be selected when disabled is true', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    renderWithTheme(
      <LifecycleMethodCard method="ilm" selectedMethod="dlm" disabled onChange={onChange} />
    );

    const radio = screen.getByRole('radio');
    expect(radio).toBeDisabled();

    await user.click(radio);
    expect(onChange).not.toHaveBeenCalled();
  });
});
