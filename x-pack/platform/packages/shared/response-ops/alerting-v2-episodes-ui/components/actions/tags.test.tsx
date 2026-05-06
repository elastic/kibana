/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertEpisodeTags } from './tags';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

describe('AlertEpisodeTags', () => {
  it('renders visible tags up to size', () => {
    render(
      <IntlProvider locale="en">
        <AlertEpisodeTags tags={['alpha', 'beta']} size={2} />
      </IntlProvider>
    );
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
  });

  it('renders overflow count badge when tags exceed size', () => {
    render(
      <IntlProvider locale="en">
        <AlertEpisodeTags tags={['a', 'b', 'c', 'd', 'e']} size={3} />
      </IntlProvider>
    );
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.getByText('c')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('opens popover with remaining tags when overflow badge is clicked', async () => {
    const user = userEvent.setup();

    render(
      <IntlProvider locale="en">
        <AlertEpisodeTags tags={['a', 'b', 'c', 'd']} size={2} />
      </IntlProvider>
    );
    await user.click(screen.getByText('+2'));
    expect(await screen.findByText('c')).toBeInTheDocument();
    expect(await screen.findByText('d')).toBeInTheDocument();
  });
});
