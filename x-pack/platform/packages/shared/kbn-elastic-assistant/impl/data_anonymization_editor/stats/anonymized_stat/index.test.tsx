/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import * as i18n from './translations';
import { AnonymizedStat } from '.';
import { TestProviders } from '../../../mock/test_providers/test_providers';

const defaultProps = {
  anonymized: 0,
  isDataAnonymizable: false,
};

describe('AnonymizedStat', () => {
  it('renders the expected content when the data is NOT anonymizable', () => {
    render(
      <TestProviders>
        <AnonymizedStat {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('anonymizedFieldsStat')).toHaveTextContent('0Anonymized');
  });

  it('shows the correct tooltip content when anonymized is 0 and isDataAnonymizable is false', async () => {
    render(
      <TestProviders>
        <AnonymizedStat {...defaultProps} />
      </TestProviders>
    );

    await userEvent.hover(screen.getByTestId('anonymizedFieldsStat'));

    await waitFor(() => {
      expect(screen.getByText(i18n.NONE_OF_THE_DATA_WILL_BE_ANONYMIZED(false))).toBeInTheDocument();
    });
  });

  it('shows correct tooltip content when anonymized is positive and isDataAnonymizable is true', async () => {
    const anonymized = 3;
    const isDataAnonymizable = true;

    render(
      <TestProviders>
        <AnonymizedStat
          {...defaultProps}
          anonymized={anonymized}
          isDataAnonymizable={isDataAnonymizable}
        />
      </TestProviders>
    );

    await userEvent.hover(screen.getByTestId('anonymizedFieldsStat'));

    await waitFor(() => {
      expect(screen.getByText(i18n.FIELDS_WILL_BE_ANONYMIZED(anonymized))).toBeInTheDocument();
    });
  });
});
