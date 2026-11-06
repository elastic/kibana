/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AlertSnoozeBadge } from './alert_snooze_badge';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('AlertSnoozeBadge', () => {
  it('renders the badge with the default test subject and the bellSlash icon', () => {
    const { container } = render(<AlertSnoozeBadge summary="Snoozed indefinitely" />, { wrapper });

    expect(screen.getByTestId('alertSnoozedBadge')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="bellSlash"]')).toBeInTheDocument();
  });

  it('applies a custom data-test-subj', () => {
    render(<AlertSnoozeBadge summary="Snoozed until Jan 1" data-test-subj="customBadge" />, {
      wrapper,
    });

    expect(screen.getByTestId('customBadge')).toBeInTheDocument();
    expect(screen.queryByTestId('alertSnoozedBadge')).not.toBeInTheDocument();
  });

  it('shows the summary in a tooltip on hover', async () => {
    const summary = 'Snoozed until Jan 1, 2026';
    render(<AlertSnoozeBadge summary={summary} />, { wrapper });

    expect(screen.queryByText(summary)).not.toBeInTheDocument();

    fireEvent.mouseOver(screen.getByTestId('alertSnoozedBadge'));

    expect(await screen.findByText(summary)).toBeInTheDocument();
  });
});
