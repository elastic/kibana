/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { MaintenanceWindowSolutionSelection } from './maintenance_window_category_selection';
import type { AppMockRenderer } from '../../../lib/test_utils';
import { createAppMockRenderer } from '../../../lib/test_utils';

const mockOnChange = jest.fn();

describe('maintenanceWindowCategorySelection', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('should not display radio group if scoped query is disabled', async () => {
    appMockRenderer.render(
      <MaintenanceWindowSolutionSelection
        selectedSolution={''}
        availableSolutions={['observability', 'management', 'securitySolution']}
        onChange={mockOnChange}
        isScopedQueryEnabled={false}
      />
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId('maintenanceWindowSolutionSelectionLoading')
      ).not.toBeInTheDocument();
    });

    expect(screen.queryByTestId('maintenanceWindowSolutionSelection')).not.toBeInTheDocument();
  });

  it('should display radio group if scoped query is enabled', async () => {
    appMockRenderer.render(
      <MaintenanceWindowSolutionSelection
        selectedSolution={''}
        availableSolutions={['observability', 'management', 'securitySolution']}
        onChange={mockOnChange}
        isScopedQueryEnabled={true}
      />
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId('maintenanceWindowSolutionSelectionLoading')
      ).not.toBeInTheDocument();
    });

    expect(await screen.findByTestId('maintenanceWindowSolutionSelection')).toBeInTheDocument();
    expect(screen.getByTestId('maintenanceWindowSolutionSelectionRadioGroup')).toBeInTheDocument();
  });

  it('should disable options if option is not in the available solutions array', () => {
    appMockRenderer.render(
      <MaintenanceWindowSolutionSelection
        selectedSolution={'management'}
        availableSolutions={[]}
        onChange={mockOnChange}
        isScopedQueryEnabled={true}
      />
    );

    const observabilityInput = screen.getByLabelText('Observability rules');
    const securityInput = screen.getByLabelText('Security rules');
    const managementInput = screen.getByLabelText('Stack rules');

    expect(observabilityInput).toBeDisabled();
    expect(managementInput).toBeDisabled();
    expect(securityInput).toBeDisabled();
  });

  it('can initialize checkboxes with initial values from props', async () => {
    appMockRenderer.render(
      <MaintenanceWindowSolutionSelection
        selectedSolution={'securitySolution'}
        availableSolutions={['observability', 'management', 'securitySolution']}
        onChange={mockOnChange}
        isScopedQueryEnabled={true}
      />
    );

    expect(screen.getByLabelText('Observability rules')).not.toBeChecked();
    expect(screen.getByLabelText('Security rules')).toBeChecked();
    expect(screen.getByLabelText('Stack rules')).not.toBeChecked();
  });

  it('can choose solution', async () => {
    appMockRenderer.render(
      <MaintenanceWindowSolutionSelection
        selectedSolution={'observability'}
        availableSolutions={['observability', 'management', 'securitySolution']}
        onChange={mockOnChange}
        isScopedQueryEnabled={true}
      />
    );

    fireEvent.click(screen.getByLabelText('Stack rules'));

    expect(mockOnChange).toHaveBeenLastCalledWith('management');

    fireEvent.click(screen.getByLabelText('Security rules'));

    expect(mockOnChange).toHaveBeenLastCalledWith('securitySolution');
  });

  it('should display loading spinner if isLoading is true', () => {
    appMockRenderer.render(
      <MaintenanceWindowSolutionSelection
        isLoading
        selectedSolution={''}
        availableSolutions={['observability', 'management', 'securitySolution']}
        onChange={mockOnChange}
        isScopedQueryEnabled={true}
      />
    );
    expect(screen.getByTestId('maintenanceWindowSolutionSelectionLoading')).toBeInTheDocument();
  });

  it('should display error message if it exists', () => {
    appMockRenderer.render(
      <MaintenanceWindowSolutionSelection
        selectedSolution={''}
        availableSolutions={['observability', 'management', 'securitySolution']}
        errors={['test error']}
        onChange={mockOnChange}
        isScopedQueryEnabled={true}
      />
    );
    expect(screen.getByText('test error')).toBeInTheDocument();
  });
});
