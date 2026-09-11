/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { FrequencyHelpPopover } from './frequency_help_popover';

const renderPopover = (groupingMode: 'per_episode' | 'per_field' | 'all' = 'per_episode') =>
  render(
    <I18nProvider>
      <FrequencyHelpPopover groupingMode={groupingMode} />
    </I18nProvider>
  );

describe('FrequencyHelpPopover', () => {
  it('opens on click and lists per-episode frequency options', async () => {
    const user = userEvent.setup();
    renderPopover('per_episode');

    await user.click(screen.getByTestId('frequencyHelpButton'));

    expect(await screen.findByTestId('frequencyHelpPanel')).toBeInTheDocument();
    expect(screen.getByText('On status change')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Notifies once when an episode opens and once when it recovers. No repeat notifications while it remains active.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('On status change + repeat at interval')).toBeInTheDocument();
    expect(screen.getByText('Every evaluation')).toBeInTheDocument();
  });

  it('lists aggregate frequency options for digest mode', async () => {
    const user = userEvent.setup();
    renderPopover('all');

    await user.click(screen.getByTestId('frequencyHelpButton'));

    expect(await screen.findByTestId('frequencyHelpPanel')).toBeInTheDocument();
    expect(screen.getByText('At most once every...')).toBeInTheDocument();
    expect(screen.getByText('Every evaluation')).toBeInTheDocument();
    expect(screen.queryByText('On status change')).not.toBeInTheDocument();
  });
});
