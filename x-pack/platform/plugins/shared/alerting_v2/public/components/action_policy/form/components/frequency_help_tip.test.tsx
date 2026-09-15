/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { GroupingMode } from '@kbn/alerting-v2-schemas';
import { FrequencyHelpTip } from './frequency_help_tip';

const renderTip = (groupingMode: GroupingMode) =>
  render(
    <I18nProvider>
      <FrequencyHelpTip groupingMode={groupingMode} />
    </I18nProvider>
  );

describe('FrequencyHelpTip', () => {
  it('lists every per_episode frequency option with its explanation when opened', async () => {
    renderTip('per_episode');

    await userEvent.click(screen.getByTestId('frequencyHelpTip'));

    expect(await screen.findByText('On status change')).toBeInTheDocument();
    expect(screen.getByText('On status change + repeat at interval')).toBeInTheDocument();
    expect(screen.getByText('Every evaluation')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Notifies once when an episode opens and once when it recovers. No repeat notifications while it remains active.'
      )
    ).toBeInTheDocument();
  });

  it('lists the aggregate frequency options for group/digest modes when opened', async () => {
    renderTip('all');

    await userEvent.click(screen.getByTestId('frequencyHelpTip'));

    expect(await screen.findByText('At most once every...')).toBeInTheDocument();
    expect(screen.getByText('Every evaluation')).toBeInTheDocument();
    // The per_episode-only option must not appear in aggregate mode.
    expect(screen.queryByText('On status change + repeat at interval')).not.toBeInTheDocument();
  });

  it('shows a hover tooltip on the icon for sighted users', async () => {
    renderTip('per_episode');

    await userEvent.hover(screen.getByTestId('frequencyHelpTip'));

    expect(await screen.findByText('Frequency options explained')).toBeInTheDocument();
  });
});
