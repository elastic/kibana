/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { SelectSeverity, SEVERITY_OPTIONS } from './select_severity';

// The following mock setup is necessary so that we can simulate
// both triggering the update callback and the internal state update
// to update the dropdown to the new state.
const mockSeverityOptions = SEVERITY_OPTIONS;
const mockUpdateCallback = jest.fn();
const mockUseState = jest.fn().mockImplementation(useState);
jest.mock('@kbn/ml-url-state', () => ({
  usePageUrlState: () => {
    const [severity, setSeverity] = mockUseState(mockSeverityOptions[0]);
    return [severity, mockUpdateCallback.mockImplementation((d) => setSeverity(d))];
  },
}));

describe('SelectSeverity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates the severity option correctly on click', async () => {
    // arrange
    const { getByText, getAllByText, queryByText, getByTestId } = render(
      <IntlProvider locale="en">
        <SelectSeverity />
      </IntlProvider>
    );

    // assert initial state
    expect(getAllByText('warning')).toHaveLength(1);
    expect(queryByText('minor')).not.toBeInTheDocument();
    expect(queryByText('major')).not.toBeInTheDocument();
    expect(queryByText('critical')).not.toBeInTheDocument();

    // open popover
    act(() => {
      fireEvent.click(getByTestId('mlAnomalySeverityThresholdControls'));
    });

    // assert open popover
    expect(getAllByText('warning')).toHaveLength(2);
    expect(getAllByText('minor')).toHaveLength(1);
    expect(getAllByText('major')).toHaveLength(1);
    expect(getAllByText('critical')).toHaveLength(1);

    // click item in popver
    act(() => {
      fireEvent.click(getByText('major'));
    });

    // assert updated state
    expect(mockUpdateCallback).toBeCalledWith(SEVERITY_OPTIONS[2]);
    await waitFor(() => {
      expect(queryByText('warning')).not.toBeInTheDocument();
      expect(queryByText('minor')).not.toBeInTheDocument();
      expect(getAllByText('major')).toHaveLength(1);
      expect(queryByText('critical')).not.toBeInTheDocument();
    });
  });
});
