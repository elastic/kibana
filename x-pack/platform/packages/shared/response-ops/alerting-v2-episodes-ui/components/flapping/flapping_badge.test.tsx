/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { FlappingBadge } from './flapping_badge';

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('FlappingBadge', () => {
  it('renders the flapping badge', () => {
    renderWithI18n(<FlappingBadge />);
    expect(screen.getByTestId('alertEpisodeFlappingBadge')).toBeInTheDocument();
  });

  it('opens a popover with the flapping explanation on click', async () => {
    const user = userEvent.setup();
    renderWithI18n(<FlappingBadge />);

    await user.click(screen.getByTestId('alertEpisodeFlappingBadge'));

    expect(await screen.findByTestId('alertEpisodeFlappingPopover')).toBeInTheDocument();
  });
});
