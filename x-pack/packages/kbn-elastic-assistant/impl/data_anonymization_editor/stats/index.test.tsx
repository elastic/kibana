/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { SelectedPromptContext } from '../../assistant/prompt_context/types';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { Stats } from '.';

describe('Stats', () => {
  const selectedPromptContext: SelectedPromptContext = {
    allow: ['field1', 'field2'],
    allowReplacement: ['field1'],
    promptContextId: 'abcd',
    rawData: {
      field1: ['value1', 'value2'],
      field2: ['value3, value4', 'value5'],
      field3: ['value6'],
    },
  };

  it('renders the expected allowed stat content', () => {
    render(
      <TestProviders>
        <Stats isDataAnonymizable={true} selectedPromptContext={selectedPromptContext} />
      </TestProviders>
    );

    expect(screen.getByTestId('allowedStat')).toHaveTextContent('2Allowed');
  });

  it('renders the expected anonymized stat content', () => {
    render(
      <TestProviders>
        <Stats isDataAnonymizable={true} selectedPromptContext={selectedPromptContext} />
      </TestProviders>
    );

    expect(screen.getByTestId('anonymizedFieldsStat')).toHaveTextContent('1Anonymized');
  });

  it('renders the expected available stat content', () => {
    render(
      <TestProviders>
        <Stats isDataAnonymizable={true} selectedPromptContext={selectedPromptContext} />
      </TestProviders>
    );

    expect(screen.getByTestId('availableStat')).toHaveTextContent('3Available');
  });

  it('should not display the allowed stat when isDataAnonymizable is false', () => {
    render(
      <TestProviders>
        <Stats isDataAnonymizable={false} selectedPromptContext={selectedPromptContext} />
      </TestProviders>
    );

    expect(screen.queryByTestId('allowedStat')).not.toBeInTheDocument();
  });

  it('should not display the available stat when isDataAnonymizable is false', () => {
    render(
      <TestProviders>
        <Stats isDataAnonymizable={false} selectedPromptContext={selectedPromptContext} />
      </TestProviders>
    );

    expect(screen.queryByTestId('availableStat')).not.toBeInTheDocument();
  });
});
