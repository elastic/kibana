/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DARK_THEME } from '@elastic/charts';
import numeral from '@elastic/numeral';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { EMPTY_STAT } from '../../../../helpers';
import { alertIndexWithAllResults } from '../../../../mock/pattern_rollup/mock_alerts_pattern_rollup';
import { auditbeatWithAllResults } from '../../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { packetbeatNoResults } from '../../../../mock/pattern_rollup/mock_packetbeat_pattern_rollup';
import { TestProviders } from '../../../../mock/test_providers/test_providers';
import { PatternRollup } from '../../../../types';
import { Props, StorageDetails } from '.';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const ilmPhases = ['hot', 'warm', 'unmanaged'];
const patterns = ['.alerts-security.alerts-default', 'auditbeat-*', 'packetbeat-*'];

const patternRollups: Record<string, PatternRollup> = {
  '.alerts-security.alerts-default': alertIndexWithAllResults,
  'auditbeat-*': auditbeatWithAllResults,
  'packetbeat-*': packetbeatNoResults,
};

const onIndexSelected = jest.fn();

const defaultProps: Props = {
  formatBytes,
  ilmPhases,
  onIndexSelected,
  patternRollups,
  patterns,
  theme: DARK_THEME,
};

describe('StorageDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    render(
      <TestProviders>
        <StorageDetails {...defaultProps} />
      </TestProviders>
    );
  });

  test('it renders the treemap', () => {
    expect(screen.getByTestId('storageTreemap').querySelector('.echChart')).toBeInTheDocument();
  });
});
