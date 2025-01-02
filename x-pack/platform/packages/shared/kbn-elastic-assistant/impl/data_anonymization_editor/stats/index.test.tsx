/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '../../mock/test_providers/test_providers';
import { Stats } from '.';

describe('Stats', () => {
  const anonymizationFields = [
    {
      id: 'field1',
      field: 'field1',
      anonymized: true,
      allowed: true,
    },
    {
      id: 'field2',
      field: 'field2',
      anonymized: false,
      allowed: true,
    },
  ];
  const rawData = {
    field1: ['value1', 'value2'],
    field2: ['value3, value4', 'value5'],
    field3: ['value6'],
  };

  it('renders the expected allowed stat content', () => {
    render(
      <TestProviders>
        <Stats
          isDataAnonymizable={true}
          anonymizationFields={anonymizationFields}
          rawData={rawData}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('allowedStat')).toHaveTextContent('2Allowed');
  });

  it('renders the expected anonymized stat content', () => {
    render(
      <TestProviders>
        <Stats
          isDataAnonymizable={true}
          anonymizationFields={anonymizationFields}
          rawData={rawData}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('anonymizedFieldsStat')).toHaveTextContent('1Anonymized');
  });

  it('renders the expected available stat content', () => {
    render(
      <TestProviders>
        <Stats
          isDataAnonymizable={true}
          anonymizationFields={anonymizationFields}
          rawData={rawData}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('availableStat')).toHaveTextContent('3Available');
  });

  it('should not display the allowed stat when isDataAnonymizable is false', () => {
    render(
      <TestProviders>
        <Stats
          isDataAnonymizable={false}
          anonymizationFields={anonymizationFields}
          rawData={rawData}
        />
      </TestProviders>
    );

    expect(screen.queryByTestId('allowedStat')).not.toBeInTheDocument();
  });

  it('should not display the available stat when isDataAnonymizable is false', () => {
    render(
      <TestProviders>
        <Stats
          isDataAnonymizable={false}
          anonymizationFields={anonymizationFields}
          rawData={rawData}
        />
      </TestProviders>
    );

    expect(screen.queryByTestId('availableStat')).not.toBeInTheDocument();
  });
});
