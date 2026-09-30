/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { screen } from '@testing-library/react';
import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';
import { MaintenanceWindowScopedQuery } from './maintenance_window_scoped_query';
import { useKibana } from '../utils/kibana_react';

vi.mock('../utils/kibana_react');
vi.mock('@kbn/alerts-ui-shared', () => {
  const mocked = {
    AlertsSearchBar: () => <div />,
  };
  return { ...mocked, default: mocked };
});

describe('MaintenanceWindowScopedQuery', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useKibana).mockReturnValue({
      services: {
        notifications: {
          toasts: {
            addSuccess: vi.fn(),
            addDanger: vi.fn(),
          },
        },
        data: {
          dataViews: {},
        },
        unifiedSearch: {
          ui: {
            SearchBar: <div />,
          },
        },
      },
    });
    appMockRenderer = createAppMockRenderer();
  });

  it('renders correctly', () => {
    appMockRenderer.render(
      <MaintenanceWindowScopedQuery
        ruleTypeIds={['apm', '.es-query', 'siem.esqlRule']}
        query={''}
        filters={[]}
        onQueryChange={vi.fn()}
        onFiltersChange={vi.fn()}
      />
    );
    expect(screen.getByTestId('maintenanceWindowScopeQuery')).toBeInTheDocument();
  });

  it('should hide the search bar if isEnabled is false', () => {
    appMockRenderer.render(
      <MaintenanceWindowScopedQuery
        ruleTypeIds={['apm', '.es-query', 'siem.esqlRule']}
        isEnabled={false}
        query={''}
        filters={[]}
        onQueryChange={vi.fn()}
        onFiltersChange={vi.fn()}
      />
    );
    expect(screen.queryByTestId('maintenanceWindowScopeQuery')).not.toBeInTheDocument();
  });

  it('should render loading if isLoading is true', () => {
    appMockRenderer.render(
      <MaintenanceWindowScopedQuery
        ruleTypeIds={['apm', '.es-query', 'siem.esqlRule']}
        isLoading={true}
        query={''}
        filters={[]}
        onQueryChange={vi.fn()}
        onFiltersChange={vi.fn()}
      />
    );
    expect(screen.getByTestId('maintenanceWindowScopedQueryLoading')).toBeInTheDocument();
  });
});
