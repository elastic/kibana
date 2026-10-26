/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
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

  it('shows the correct tooltip content when anonymized is 0 and isDataAnonymizable is false', () => {
    render(
      <TestProviders>
        <AnonymizedStat {...defaultProps} />
      </TestProviders>
    );

    fireEvent.mouseOver(screen.getByTestId('anonymizedFieldsStat'));

    expect(screen.getByText(i18n.NONE_OF_THE_DATA_WILL_BE_ANONYMIZED(false))).toBeInTheDocument();
  });

  it('shows correct tooltip content when anonymized is positive and isDataAnonymizable is true', () => {
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

    fireEvent.mouseOver(screen.getByTestId('anonymizedFieldsStat'));

    expect(screen.getByText(i18n.FIELDS_WILL_BE_ANONYMIZED(anonymized))).toBeInTheDocument();
  });
});
