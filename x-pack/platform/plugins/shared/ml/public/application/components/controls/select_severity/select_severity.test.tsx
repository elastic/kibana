/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react';

import { SelectSeverity } from './select_severity';
import type { SeverityOption } from '../../../explorer/hooks/use_severity_options';

// Mock severity options that match the structure from useSeverityOptions
const mockSeverityOptions: SeverityOption[] = [
  {
    val: 0,
    display: 'low',
    color: '#CFEEF7',
    threshold: { min: 0, max: 3 },
  },
  {
    val: 3,
    display: 'warning',
    color: '#94D8EB',
    threshold: { min: 3, max: 25 },
  },
  {
    val: 25,
    display: 'minor',
    color: '#F5A700',
    threshold: { min: 25, max: 50 },
  },
  {
    val: 50,
    display: 'major',
    color: '#E7664C',
    threshold: { min: 50, max: 75 },
  },
  {
    val: 75,
    display: 'critical',
    color: '#CC5642',
    threshold: { min: 75 },
  },
];

// Mock the useSeverityOptions hook
jest.mock('../../../explorer/hooks/use_severity_options', () => ({
  useSeverityOptions: () => mockSeverityOptions,
}));

// The following mock setup is necessary so that we can simulate
// both triggering the update callback and the internal state update
// to update the component to the new state.
const mockUpdateCallback = jest.fn();
const mockUseState = jest.fn().mockImplementation(useState);

jest.mock('@kbn/ml-url-state', () => ({
  usePageUrlState: () => {
    // Start with default state (all severity options selected)
    const [severity, setSeverity] = mockUseState({
      val: mockSeverityOptions.map((option) => option.threshold), // Default to all selected
    });
    return [severity, mockUpdateCallback.mockImplementation((d) => setSeverity(d))];
  },
}));

describe('SelectSeverity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default severity selection', () => {
    const { getByTestId } = render(<SelectSeverity />);

    // Should render the main control
    expect(getByTestId('mlAnomalySeverityThresholdControls')).toBeInTheDocument();
  });

  it('opens popover when clicked', async () => {
    const { getByTestId, getByRole } = render(<SelectSeverity />);

    // Click the button inside the control to open popover
    const control = getByTestId('mlAnomalySeverityThresholdControls');
    const button = control.querySelector('button');
    expect(button).toBeInTheDocument();
    act(() => {
      fireEvent.click(button!);
    });

    // Should show the selectable options with threshold ranges
    await waitFor(() => {
      expect(getByRole('option', { name: '0-3' })).toBeInTheDocument();
      expect(getByRole('option', { name: '3-25' })).toBeInTheDocument();
      expect(getByRole('option', { name: '25-50' })).toBeInTheDocument();
      expect(getByRole('option', { name: '50-75' })).toBeInTheDocument();
      expect(getByRole('option', { name: '75-100' })).toBeInTheDocument();
    });
  });

  it('allows deselecting severity options', async () => {
    const { getByTestId, getByRole } = render(<SelectSeverity />);

    // Open the popover by clicking the button
    const control = getByTestId('mlAnomalySeverityThresholdControls');
    const button = control.querySelector('button');
    act(() => {
      fireEvent.click(button!);
    });

    // Wait for options to appear and click on the 'low' option (0-3) to deselect it
    await waitFor(() => {
      expect(getByRole('option', { name: '0-3' })).toBeInTheDocument();
    });

    const lowOption = getByRole('option', { name: '0-3' });
    act(() => {
      fireEvent.click(lowOption);
    });

    // Should call the update callback with all options except 'low' selected
    await waitFor(() => {
      expect(mockUpdateCallback).toHaveBeenCalledWith({
        val: expect.arrayContaining([
          mockSeverityOptions[1].threshold,
          mockSeverityOptions[2].threshold,
          mockSeverityOptions[3].threshold,
          mockSeverityOptions[4].threshold,
        ]),
      });
      // Should not contain low
      expect(mockUpdateCallback).toHaveBeenCalledWith({
        val: expect.not.arrayContaining([mockSeverityOptions[0].threshold]),
      });
    });
  });

  it('prevents deselecting all severity options', async () => {
    // Mock state with only one option selected
    mockUseState.mockImplementationOnce(() => [
      {
        val: [mockSeverityOptions[2].threshold],
      },
      jest.fn(),
    ]);

    const { getByTestId, getByRole } = render(<SelectSeverity />);

    // Open the popover
    const control = getByTestId('mlAnomalySeverityThresholdControls');
    const button = control.querySelector('button');
    act(() => {
      fireEvent.click(button!);
    });

    // Wait for options to appear and try to click on the last selected 'minor' option (25-50)
    await waitFor(() => {
      expect(getByRole('option', { name: '25-50' })).toBeInTheDocument();
    });

    const minorOption = getByRole('option', { name: '25-50' });
    act(() => {
      fireEvent.click(minorOption);
    });

    // Should NOT call the update callback since we're trying to deselect the last option
    await waitFor(() => {
      expect(mockUpdateCallback).not.toHaveBeenCalled();
    });
  });

  it('displays "Multiple" when multiple severities are selected', () => {
    // Mock state with multiple selections
    mockUseState.mockImplementationOnce(() => [
      {
        val: [mockSeverityOptions[1].threshold, mockSeverityOptions[3].threshold],
      },
      jest.fn(),
    ]);

    const { getByTestId } = render(<SelectSeverity />);

    const control = getByTestId('mlAnomalySeverityThresholdControls');
    expect(control).toHaveTextContent('Multiple');
  });

  it('displays single severity range when only one is selected', () => {
    // Mock state with single selection
    mockUseState.mockImplementationOnce(() => [
      {
        val: [mockSeverityOptions[2].threshold],
      },
      jest.fn(),
    ]);

    const { getByTestId } = render(<SelectSeverity />);

    const control = getByTestId('mlAnomalySeverityThresholdControls');

    expect(control).toHaveTextContent('25-50');
  });
});
