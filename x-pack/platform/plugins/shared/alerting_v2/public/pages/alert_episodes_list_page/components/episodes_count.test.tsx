/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EpisodesCount } from './episodes_count';

const renderCount = (count: number) =>
  render(
    <I18nProvider>
      <EpisodesCount count={count} />
    </I18nProvider>
  );

describe('EpisodesCount', () => {
  it('renders the count with the plural label for multiple episodes', () => {
    renderCount(3);
    const el = screen.getByTestId('alertingV2EpisodesCount');
    expect(el).toHaveTextContent('3 episodes');
  });

  it('renders the singular label for exactly one episode', () => {
    renderCount(1);
    expect(screen.getByTestId('alertingV2EpisodesCount')).toHaveTextContent('1 episode');
  });

  it('renders zero with the plural label', () => {
    renderCount(0);
    expect(screen.getByTestId('alertingV2EpisodesCount')).toHaveTextContent('0 episodes');
  });
});
