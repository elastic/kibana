/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { render, screen } from '@testing-library/react';
import React, { ComponentProps } from 'react';

import { EMPTY_STAT } from '../../../constants';
import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../../../mock/test_providers/test_providers';
import { Pattern } from '.';
import { getCheckState } from '../../../stub/get_check_state';

const indexName = 'auditbeat-custom-index-1';
const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

jest.mock('./hooks/use_stats', () => ({
  useStats: jest.fn(() => ({
    stats: {},
    error: null,
    loading: false,
  })),
}));

jest.mock('./hooks/use_ilm_explain', () => ({
  useIlmExplain: jest.fn(() => ({
    error: null,
    ilmExplain: {},
    loading: false,
  })),
}));

const ilmPhases = ['hot', 'warm', 'unmanaged'];

const defaultProps: ComponentProps<typeof Pattern> = {
  pattern: '',
  patternRollup: undefined,
  chartSelectedIndex: null,
  setChartSelectedIndex: jest.fn(),
  indexNames: undefined,
};

describe('pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders the remote clusters callout when the pattern includes a colon', () => {
    const pattern = 'remote:*'; // <-- a colon in the pattern indicates the use of cross cluster search

    render(
      <TestExternalProviders>
        <TestDataQualityProviders
          dataQualityContextProps={{
            ilmPhases,
            formatBytes,
            formatNumber,
          }}
          indicesCheckContextProps={{
            checkState: getCheckState(indexName),
          }}
        >
          <Pattern {...defaultProps} pattern={pattern} />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    expect(screen.getByTestId('remoteClustersCallout')).toBeInTheDocument();
  });

  test('it does NOT render the remote clusters callout when the pattern does NOT include a colon', () => {
    const pattern = 'auditbeat-*'; // <-- no colon in the pattern

    render(
      <TestExternalProviders>
        <TestDataQualityProviders
          dataQualityContextProps={{
            ilmPhases,
            formatBytes,
            formatNumber,
          }}
          indicesCheckContextProps={{
            checkState: getCheckState(indexName),
          }}
        >
          <Pattern {...defaultProps} pattern={pattern} />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    expect(screen.queryByTestId('remoteClustersCallout')).not.toBeInTheDocument();
  });
});
