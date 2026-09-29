/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, render } from '@testing-library/react';
import { MaintenanceWindowScopeSection } from './maintenance_window_scope_section';

jest.mock('./maintenance_window_scoped_query', () => ({
  MaintenanceWindowScopedQuery: () => <div data-test-subj="mockAlertsSearchBar" />,
}));

const defaultProps = {
  standardAlertingEnabled: true,
  onStandardAlertingEnabledChange: jest.fn(),
  esqlAlertingEnabled: true,
  onEsqlAlertingEnabledChange: jest.fn(),
  ruleTypeIds: [] as string[],
  query: '',
  filters: [],
  onQueryChange: jest.fn(),
  onFiltersChange: jest.fn(),
  esqlFilterQuery: '',
  onEsqlFilterQueryChange: jest.fn(),
};

describe('MaintenanceWindowScopeSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders both Kibana standard and ES|QL alerting scope options', () => {
    render(<MaintenanceWindowScopeSection {...defaultProps} />);

    expect(screen.getByTestId('maintenanceWindowScopeSection')).toBeInTheDocument();
    expect(screen.getByTestId('maintenanceWindowScopeStandardAlerting')).toBeInTheDocument();
    expect(screen.getByTestId('maintenanceWindowScopeEsqlAlerting')).toBeInTheDocument();
    expect(screen.getByTestId('mockAlertsSearchBar')).toBeInTheDocument();
    expect(screen.getByTestId('maintenanceWindowScopeEsqlFilter')).toBeInTheDocument();
  });

  it('hides filters when a scope option is disabled', () => {
    render(
      <MaintenanceWindowScopeSection
        {...defaultProps}
        standardAlertingEnabled={false}
        esqlAlertingEnabled={false}
      />
    );

    expect(screen.queryByTestId('mockAlertsSearchBar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('maintenanceWindowScopeEsqlFilter')).not.toBeInTheDocument();
  });

  it('toggles Kibana standard alerting', () => {
    render(<MaintenanceWindowScopeSection {...defaultProps} />);

    fireEvent.click(screen.getByTestId('maintenanceWindowScopeStandardAlertingSwitch'));
    expect(defaultProps.onStandardAlertingEnabledChange).toHaveBeenCalledWith(false);
  });

  it('toggles Kibana ES|QL alerting', () => {
    render(<MaintenanceWindowScopeSection {...defaultProps} />);

    fireEvent.click(screen.getByTestId('maintenanceWindowScopeEsqlAlertingSwitch'));
    expect(defaultProps.onEsqlAlertingEnabledChange).toHaveBeenCalledWith(false);
  });
});
