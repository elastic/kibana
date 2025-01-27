/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SelectInterval } from './select_interval';

// The following mock setup is necessary so that we can simulate
// both triggering the update callback and the internal state update
// to update the dropdown to the new state.
const mockUpdateCallback = jest.fn();
const mockUseState = jest.fn().mockImplementation(useState);
jest.mock('@kbn/ml-url-state', () => ({
  usePageUrlState: () => {
    const [interval, setInterval] = mockUseState({ display: 'Auto', val: 'auto' });
    return [interval, mockUpdateCallback.mockImplementation((d) => setInterval(d))];
  },
}));

describe('SelectInterval', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates the selected value correctly on click', async () => {
    // arrange
    const { getByText, getByTestId } = render(<SelectInterval />);

    // assert initial state
    expect((getByText('Auto') as HTMLOptionElement).selected).toBeTruthy();

    // update
    await userEvent.selectOptions(getByTestId('mlAnomalyIntervalControls'), getByText('1 hour'));

    // assert updated state
    expect(mockUpdateCallback).toBeCalledWith({ display: '1 hour', val: 'hour' });
    expect((getByText('1 hour') as HTMLOptionElement).selected).toBeTruthy();
  });
});
