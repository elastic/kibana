/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, render } from '@testing-library/react';
import { MaintenanceWindowScopedQuerySwitch } from './maintenance_window_scoped_query_switch';

const mockOnEnabledChange = jest.fn();

describe('MaintenanceWindowScopedQuerySwitch', () => {
  it('renders correctly', () => {
    render(
      <MaintenanceWindowScopedQuerySwitch checked={true} onEnabledChange={mockOnEnabledChange} />
    );
    expect(screen.getByTestId('maintenanceWindowScopedQuerySwitch')).toBeInTheDocument();
  });

  it('should call onChange when switch is clicked', () => {
    render(
      <MaintenanceWindowScopedQuerySwitch checked={true} onEnabledChange={mockOnEnabledChange} />
    );

    fireEvent.click(screen.getByRole('switch'));
    expect(mockOnEnabledChange).toHaveBeenCalledWith(false);
  });
});
