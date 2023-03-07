/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DARK_THEME } from '@elastic/charts';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../mock/test_providers';
import { Pattern } from '.';

jest.mock('../../use_stats', () => ({
  useStats: jest.fn(() => ({
    stats: {},
    error: null,
    loading: false,
  })),
}));

jest.mock('../../use_ilm_explain', () => ({
  useIlmExplain: jest.fn(() => ({
    error: null,
    ilmExplain: {},
    loading: false,
  })),
}));

const defaultProps = {
  addSuccessToast: jest.fn(),
  canUserCreateAndReadCases: jest.fn(),
  defaultNumberFormat: '0,0.[000]',
  getGroupByFieldsOnClick: jest.fn(),
  ilmPhases: ['hot', 'warm', 'unmanaged'],
  indexNames: undefined,
  openCreateCaseFlyout: jest.fn(),
  patternRollup: undefined,
  theme: DARK_THEME,
  updatePatternIndexNames: jest.fn(),
  updatePatternRollup: jest.fn(),
};

describe('pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders the remote clusters callout when the pattern includes a colon', () => {
    const pattern = 'remote:*'; // <-- a colon in the pattern indicates the use of cross cluster search

    render(
      <TestProviders>
        <Pattern {...defaultProps} pattern={pattern} />
      </TestProviders>
    );

    expect(screen.getByTestId('remoteClustersCallout')).toBeInTheDocument();
  });

  test('it does NOT render the remote clusters callout when the pattern does NOT include a colon', () => {
    const pattern = 'auditbeat-*'; // <-- no colon in the pattern

    render(
      <TestProviders>
        <Pattern {...defaultProps} pattern={pattern} />
      </TestProviders>
    );

    expect(screen.queryByTestId('remoteClustersCallout')).not.toBeInTheDocument();
  });
});
