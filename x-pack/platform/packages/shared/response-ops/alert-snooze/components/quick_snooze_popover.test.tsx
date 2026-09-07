/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QuickSnoozePopover } from './quick_snooze_popover';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('QuickSnoozePopover', () => {
  it('renders header, subtitle and apply button', () => {
    const onApplySnooze = jest.fn();

    render(<QuickSnoozePopover onApplySnooze={onApplySnooze} />, { wrapper });

    expect(screen.getByText('Snooze notifications')).toBeInTheDocument();
    expect(
      screen.getByText('Silence actions immediately or schedule downtime and conditions.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
  });

  it('applies selected quick snooze when clicking Apply', async () => {
    const user = userEvent.setup();
    const onApplySnooze = jest.fn();

    render(<QuickSnoozePopover onApplySnooze={onApplySnooze} />, { wrapper });

    await user.click(screen.getByRole('button', { name: '1h' }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApplySnooze).toHaveBeenCalledWith(expect.any(String));
  });
});
