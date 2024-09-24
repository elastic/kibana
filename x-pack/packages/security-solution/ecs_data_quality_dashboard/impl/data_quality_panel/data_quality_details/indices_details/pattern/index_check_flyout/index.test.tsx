/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import moment from 'moment';
import userEvent from '@testing-library/user-event';

import { IndexCheckFlyout } from '.';
import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../../../../mock/test_providers/test_providers';
import { mockIlmExplain } from '../../../../mock/ilm_explain/mock_ilm_explain';
import { auditbeatWithAllResults } from '../../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { mockStats } from '../../../../mock/stats/mock_stats';

describe('IndexCheckFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    beforeEach(() => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <IndexCheckFlyout
              ilmExplain={mockIlmExplain}
              indexName="auditbeat-custom-index-1"
              onClose={jest.fn()}
              pattern="auditbeat-*"
              patternRollup={auditbeatWithAllResults}
              stats={mockStats}
            />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );
    });

    it('should render without crashing', () => {
      expect(screen.getByTestId('indexCheckFlyout')).toBeInTheDocument();
    });

    it('should render heading section correctly with formatted latest check time', () => {
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        'auditbeat-custom-index-1'
      );
      expect(screen.getByTestId('latestCheckedAt')).toHaveTextContent(
        moment(auditbeatWithAllResults.results!['auditbeat-custom-index-1'].checkedAt).format(
          'MMM DD, YYYY @ HH:mm:ss.SSS'
        )
      );
    });

    it('should render the correct index properties panel', () => {
      expect(screen.getByTestId('indexStatsPanel')).toBeInTheDocument();
      expect(screen.getByTestId('indexCheckFields')).toBeInTheDocument();
    });

    it('should render footer with check now button', () => {
      expect(screen.getByRole('button', { name: 'Check now' })).toBeInTheDocument();
    });
  });

  describe('when flyout close is clicked', () => {
    it('should call onClose', async () => {
      const onClose = jest.fn();
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <IndexCheckFlyout
              ilmExplain={mockIlmExplain}
              indexName="auditbeat-custom-index-1"
              onClose={onClose}
              pattern="auditbeat-*"
              patternRollup={auditbeatWithAllResults}
              stats={mockStats}
            />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const closeButton = screen.getByRole('button', { name: 'Close this dialog' });
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('when check now button is clicked', () => {
    it('should call checkIndex', async () => {
      const checkIndex = jest.fn();
      render(
        <TestExternalProviders>
          <TestDataQualityProviders
            indicesCheckContextProps={{
              checkIndex,
            }}
          >
            <IndexCheckFlyout
              ilmExplain={mockIlmExplain}
              indexName="auditbeat-custom-index-1"
              onClose={jest.fn()}
              pattern="auditbeat-*"
              patternRollup={auditbeatWithAllResults}
              stats={mockStats}
            />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const checkNowButton = screen.getByRole('button', { name: 'Check now' });
      await userEvent.click(checkNowButton);

      expect(checkIndex).toHaveBeenCalledWith({
        abortController: expect.any(AbortController),
        formatBytes: expect.any(Function),
        formatNumber: expect.any(Function),
        httpFetch: expect.any(Function),
        indexName: 'auditbeat-custom-index-1',
        pattern: 'auditbeat-*',
      });
    });
  });
});
