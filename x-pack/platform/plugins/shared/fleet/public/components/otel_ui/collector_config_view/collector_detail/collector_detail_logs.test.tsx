/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { TestRenderer } from '../../../../mock';
import { createFleetTestRendererMock } from '../../../../mock';

import { CollectorDetailLogs } from './collector_detail_logs';

jest.mock('@kbn/saved-search-component', () => ({
  LazySavedSearchComponent: ({ query }: { query: { query: string } }) => (
    <div data-test-subj="savedSearchComponent" data-query={query.query}>
      Saved search
    </div>
  ),
}));

jest.mock('react-use/lib/useAsync', () =>
  jest.fn(() => ({ value: 'logs-elastic_agent-*', loading: false }))
);

describe('CollectorDetailLogs', () => {
  let testRenderer: TestRenderer;

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });

  it('renders with correct agent ID in query', () => {
    const result = testRenderer.render(<CollectorDetailLogs agentId="opamp-collector-001" />);
    const searchComponent = result.getByTestId('savedSearchComponent');
    expect(searchComponent).toBeInTheDocument();
    expect(searchComponent.getAttribute('data-query')).toBe('elastic_agent.id:opamp-collector-001');
  });
});
