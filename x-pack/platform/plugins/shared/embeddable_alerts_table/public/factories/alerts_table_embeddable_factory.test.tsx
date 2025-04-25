/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Write a test that verifies that the `AlertsTableEmbeddable` component renders the `AlertsTable` component with the correct props.

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { EmbeddableAlertsTablePublicStartDependencies } from '../types';
import { coreMock } from '@kbn/core/public/mocks';
import { getAlertsTableEmbeddableFactory } from './alerts_table_embeddable_factory';
import { LOCAL_STORAGE_KEY_PREFIX } from '../constants';

const core = coreMock.createStart();
jest.mock('@kbn/response-ops-alerts-table', () => ({
  AlertsTable: jest.fn(() => <div data-test-subj="alertsTable" />),
}));
const { AlertsTable: mockAlertsTable } = jest.requireMock('@kbn/response-ops-alerts-table');

const uuid = 'test-uuid';

describe('getEmbeddableAlertsTableFactory', () => {
  const factory = getAlertsTableEmbeddableFactory(
    core,
    {} as EmbeddableAlertsTablePublicStartDependencies
  );

  it('renders AlertsTable with correct props', async () => {
    const { Component } = await factory.buildEmbeddable({
      initialState: {
        rawState: {
          timeRange: {
            from: '2025-01-01T00:00:00.000Z',
            to: '2025-01-01T01:00:00.000Z',
          },
          title: 'Test embeddable alerts table',
        },
      },
      finalizeApi: (apiRegistration) => apiRegistration as any,
      uuid,
      // parentApi is unused by our factory
      parentApi: {} as any,
    });

    render(<Component />);

    expect(screen.getByTestId('alertsTable')).toBeInTheDocument();
    expect(mockAlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `${LOCAL_STORAGE_KEY_PREFIX}-${uuid}`,
        // Hard-coded for now
        ruleTypeIds: ['.es-query'],
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                range: {
                  'kibana.alert.time_range': {
                    format: 'strict_date_optional_time',
                    gte: '2025-01-01T00:00:00.000Z',
                    lte: '2025-01-01T01:00:00.000Z',
                  },
                },
              },
              {
                range: {
                  '@timestamp': {
                    format: 'strict_date_optional_time',
                    gte: '2025-01-01T00:00:00.000Z',
                    lte: '2025-01-01T01:00:00.000Z',
                  },
                },
              },
            ],
          },
        },
        showAlertStatusWithFlapping: true,
        toolbarVisibility: {
          showFullScreenSelector: false,
        },
      }),
      {}
    );
  });
});
