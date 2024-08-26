/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../../mock/test_providers/test_providers';
import { Body } from '.';

describe('IndexInvalidValues', () => {
  test('it renders the data quality summary', async () => {
    render(
      <TestExternalProviders>
        <TestDataQualityProviders>
          <Body />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dataQualitySummary')).toBeInTheDocument();
    });
  });

  describe('patterns', () => {
    const patterns = ['.alerts-security.alerts-default', 'auditbeat-*', 'logs-*', 'packetbeat-*'];

    test(`it renders the '${patterns.join(', ')}' patterns`, async () => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders dataQualityContextProps={{ patterns }}>
            <Body />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      for (const pattern of patterns) {
        await waitFor(() => {
          expect(screen.getByTestId(`${pattern}PatternPanel`)).toBeInTheDocument();
        });
      }
    });
  });
});
