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
import { getMockPresentationContainer } from '@kbn/presentation-publishing/interfaces/containers/mocks';
import { EmbeddableAlertsTable } from '../components/embeddable_alerts_table';
import { getAlertsTableEmbeddableFactory } from './alerts_table_embeddable_factory';
import { PERSISTED_TABLE_CONFIG_KEY_PREFIX } from '../constants';
import type { InternalRuleType } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';
import { getInternalRuleTypes } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';

const core = coreMock.createStart();
const mockPresentationContainer = getMockPresentationContainer();
jest.mock('../components/embeddable_alerts_table');
const mockEmbeddableAlertsTable = jest.mocked(EmbeddableAlertsTable).mockReturnValue(<div />);
const mockGetInternalRuleTypes = jest.mocked(getInternalRuleTypes);
jest.mock('@kbn/response-ops-rules-apis/apis/get_internal_rule_types');
mockGetInternalRuleTypes.mockResolvedValue([
  { solution: 'observability' } as unknown as InternalRuleType,
]);
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
  const embeddableParams: Parameters<typeof factory.buildEmbeddable>[0] = {
    initialState: {
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
    finalizeApi: (apiRegistration) => ({
      ...(apiRegistration as any),
      parentApi: mockPresentationContainer,
    }),
    uuid: UUID,
    parentApi: {} as any,
  };

  it('should render AlertsTable with the correct props', async () => {
    const { Component, api } = await factory.buildEmbeddable(embeddableParams);

    expect(api.isEditingEnabled()).toBeTruthy();
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

  it("should disable editing when the user cannot access any rule type from the panel's solution", async () => {
    mockGetInternalRuleTypes.mockResolvedValueOnce([]);
    const { api } = await factory.buildEmbeddable(embeddableParams);

    expect(api.isEditingEnabled()).toBeFalsy();
  });
});
