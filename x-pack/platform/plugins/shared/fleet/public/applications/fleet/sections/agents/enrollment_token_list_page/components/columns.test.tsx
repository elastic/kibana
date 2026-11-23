/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiTableFieldDataColumnType } from '@elastic/eui';

import { createFleetTestRendererMock } from '../../../../../../mock';
import type { EnrollmentAPIKey } from '../../../../types';

import { getColumns } from './columns';

const MOCK_API_KEY: EnrollmentAPIKey = {
  id: 'key-1',
  api_key_id: 'api-key-id-1',
  api_key: 'api-key-value',
  name: 'Test token',
  active: true,
  policy_id: 'policy-1',
  created_at: '2024-01-01T00:00:00.000Z',
};

function renderStatusCell(apiKey: EnrollmentAPIKey) {
  const statusColumn = getColumns({
    agentPoliciesById: {},
    agentPolicies: [],
    refresh: jest.fn(),
  }).find(
    (column): column is EuiTableFieldDataColumnType<EnrollmentAPIKey> =>
      'field' in column && column.field === 'active'
  );

  const testRenderer = createFleetTestRendererMock();
  return testRenderer.render(<div>{statusColumn!.render!(apiKey.active, apiKey)}</div>);
}

describe('enrollment token status column', () => {
  it('reports a token past its expiration as expired', () => {
    const result = renderStatusCell({
      ...MOCK_API_KEY,
      expire_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });

    expect(result.getByTestId('enrollmentTokenTable.expiredStatus')).toHaveTextContent('Expired');
    expect(result.queryByTestId('enrollmentTokenTable.activeStatus')).toBeNull();
  });

  it('reports a token that has not reached its expiration as active', () => {
    const result = renderStatusCell({
      ...MOCK_API_KEY,
      expire_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    expect(result.getByTestId('enrollmentTokenTable.activeStatus')).toHaveTextContent('Active');
  });

  it('reports a token with no expiration as active', () => {
    const result = renderStatusCell(MOCK_API_KEY);

    expect(result.getByTestId('enrollmentTokenTable.activeStatus')).toHaveTextContent('Active');
  });

  it('reports a revoked token as inactive', () => {
    const result = renderStatusCell({ ...MOCK_API_KEY, active: false });

    expect(result.getByTestId('enrollmentTokenTable.inactiveStatus')).toHaveTextContent('Inactive');
  });
});
