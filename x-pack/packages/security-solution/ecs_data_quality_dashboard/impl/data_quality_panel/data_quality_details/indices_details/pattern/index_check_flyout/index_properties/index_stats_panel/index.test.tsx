/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';

import { IndexStatsPanel } from '.';
import { TestExternalProviders } from '../../../../../../mock/test_providers/test_providers';

describe('IndexStatsPanel', () => {
  it('renders stats panel', () => {
    render(
      <TestExternalProviders>
        <IndexStatsPanel docsCount="123" ilmPhase="hot" sizeInBytes="789" />
      </TestExternalProviders>
    );

    const container = screen.getByTestId('indexStatsPanel');

    expect(container).toHaveTextContent('Docs123');
    expect(container).toHaveTextContent('ILM phasehot');
    expect(container).toHaveTextContent('Size789');
  });
});
