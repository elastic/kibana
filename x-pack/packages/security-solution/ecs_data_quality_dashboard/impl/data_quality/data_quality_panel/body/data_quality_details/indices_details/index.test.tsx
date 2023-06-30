/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DARK_THEME } from '@elastic/charts';
import numeral from '@elastic/numeral';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { EMPTY_STAT } from '../../../../helpers';
import { alertIndexWithAllResults } from '../../../../mock/pattern_rollup/mock_alerts_pattern_rollup';
import { auditbeatWithAllResults } from '../../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { packetbeatNoResults } from '../../../../mock/pattern_rollup/mock_packetbeat_pattern_rollup';
import { TestProviders } from '../../../../mock/test_providers/test_providers';
import { PatternRollup } from '../../../../types';
import { Props, IndicesDetails } from '.';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

const ilmPhases = ['hot', 'warm', 'unmanaged'];
const patterns = ['.alerts-security.alerts-default', 'auditbeat-*', 'packetbeat-*'];

const patternRollups: Record<string, PatternRollup> = {
  '.alerts-security.alerts-default': alertIndexWithAllResults,
  'auditbeat-*': auditbeatWithAllResults,
  'packetbeat-*': packetbeatNoResults,
};

const patternIndexNames: Record<string, string[]> = {
  'auditbeat-*': [
    '.ds-auditbeat-8.6.1-2023.02.07-000001',
    'auditbeat-custom-empty-index-1',
    'auditbeat-custom-index-1',
  ],
  '.alerts-security.alerts-default': ['.internal.alerts-security.alerts-default-000001'],
  'packetbeat-*': [
    '.ds-packetbeat-8.5.3-2023.02.04-000001',
    '.ds-packetbeat-8.6.1-2023.02.04-000001',
  ],
};

const defaultProps: Props = {
  addSuccessToast: jest.fn(),
  canUserCreateAndReadCases: jest.fn(),
  formatBytes,
  formatNumber,
  getGroupByFieldsOnClick: jest.fn(),
  ilmPhases,
  isAssistantEnabled: true,
  openCreateCaseFlyout: jest.fn(),
  patternIndexNames,
  patternRollups,
  patterns,
  selectedIndex: null,
  setSelectedIndex: jest.fn(),
  baseTheme: DARK_THEME,
  updatePatternIndexNames: jest.fn(),
  updatePatternRollup: jest.fn(),
};

describe('IndicesDetails', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    render(
      <TestProviders>
        <IndicesDetails {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {});
  });

  describe('rendering patterns', () => {
    patterns.forEach((pattern) => {
      test(`it renders the ${pattern} pattern`, () => {
        expect(screen.getByTestId(`${pattern}PatternPanel`)).toBeInTheDocument();
      });
    });
  });

  describe('rendering spacers', () => {
    test('it renders the expected number of spacers', () => {
      expect(screen.getAllByTestId('bodyPatternSpacer')).toHaveLength(patterns.length - 1);
    });
  });
});
