/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEventLib from '@testing-library/user-event';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { SeverityPicker } from './severity_picker';

// EUI popovers animate in with `pointer-events: none`, which user-event refuses to click through.
const userEvent = userEventLib.setup({ pointerEventsCheck: 0 });

describe('SeverityPicker', () => {
  it('offers every severity and reports the one picked', async () => {
    const onChange = jest.fn();
    renderWithKibanaRenderContext(<SeverityPicker severity="high" onChange={onChange} />);

    expect(screen.getByTestId('severityPicker')).toHaveTextContent('High');
    await userEvent.click(screen.getByRole('button', { name: 'Change severity' }));
    for (const severity of ['critical', 'high', 'medium', 'low']) {
      expect(screen.getByTestId(`severityPickerOption-${severity}`)).toBeInTheDocument();
    }
    await userEvent.click(screen.getByTestId('severityPickerOption-low'));

    expect(onChange).toHaveBeenCalledWith('low');
  });

  it('does not report the current severity again', async () => {
    const onChange = jest.fn();
    renderWithKibanaRenderContext(<SeverityPicker severity="high" onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Change severity' }));
    await userEvent.click(screen.getByTestId('severityPickerOption-high'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('reads an unset severity as not set, and lets the user set one', async () => {
    const onChange = jest.fn();
    renderWithKibanaRenderContext(<SeverityPicker onChange={onChange} />);

    expect(screen.getByTestId('severityPicker')).toHaveTextContent('Not set');
    await userEvent.click(screen.getByRole('button', { name: 'Change severity' }));
    await userEvent.click(screen.getByTestId('severityPickerOption-critical'));

    expect(onChange).toHaveBeenCalledWith('critical');
  });

  it('renders a plain badge when disabled', () => {
    renderWithKibanaRenderContext(
      <SeverityPicker severity="critical" onChange={jest.fn()} isDisabled />
    );

    expect(screen.getByTestId('severityPicker')).toHaveTextContent('Critical');
    expect(screen.queryByRole('button', { name: 'Change severity' })).not.toBeInTheDocument();
  });
});
