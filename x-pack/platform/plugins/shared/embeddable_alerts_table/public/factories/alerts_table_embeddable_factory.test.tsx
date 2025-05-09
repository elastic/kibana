/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Write a test that verifies that the `AlertsTableEmbeddable` component renders the `AlertsTable` component with the correct props.

import React from 'react';
import { render } from '@testing-library/react';
import type { EmbeddableAlertsTablePublicStartDependencies } from '../types';
import { coreMock } from '@kbn/core/public/mocks';
import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { EmbeddableAlertsTable } from '../components/embeddable_alerts_table';
import { getAlertsTableEmbeddableFactory } from './alerts_table_embeddable_factory';
import { PERSISTED_TABLE_CONFIG_KEY_PREFIX } from '../constants';

const core = coreMock.createStart();
const mockPresentationContainer = getMockPresentationContainer();
jest.mock('../components/embeddable_alerts_table');
const mockEmbeddableAlertsTable = jest.mocked(EmbeddableAlertsTable).mockReturnValue(<div />);
const mockRemoveLocalStorageItem = jest.fn();
Object.defineProperty(window, 'localStorage', {
  value: {
    removeItem: mockRemoveLocalStorageItem,
  },
  writable: true,
});

const UUID = 'test-uuid';
const TABLE_ID = `${PERSISTED_TABLE_CONFIG_KEY_PREFIX}-${UUID}`;

describe('getEmbeddableAlertsTableFactory', () => {
  const factory = getAlertsTableEmbeddableFactory(
    core,
    {} as EmbeddableAlertsTablePublicStartDependencies
  );

  it('should render AlertsTable with the correct props', async () => {
    const { Component } = await factory.buildEmbeddable({
      initialState: {
        rawState: {
          timeRange: {
            from: '2025-01-01T00:00:00.000Z',
            to: '2025-01-01T01:00:00.000Z',
          },
          title: 'Test embeddable alerts table',
          tableConfig: {
            solution: 'observability',
            query: {
              type: 'alertsFilters',
              filters: [{ filter: {} }],
            },
          },
        },
      },
      finalizeApi: (apiRegistration) => ({
        ...(apiRegistration as any),
        parentApi: mockPresentationContainer,
      }),
      uuid: UUID,
      // parentApi is unused by our factory
      parentApi: {} as any,
    });

    render(<Component />);
    expect(mockEmbeddableAlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: TABLE_ID,
        timeRange: {
          from: '2025-01-01T00:00:00.000Z',
          to: '2025-01-01T01:00:00.000Z',
        },
        solution: 'observability',
        query: { type: 'alertsFilters', filters: [{ filter: {} }] },
      }),
      {}
    );
  });
});
