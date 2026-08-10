/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddToCaseActionPanel } from './add_to_case_action_panel';

describe('AddToCaseActionPanel', () => {
  it('requires an action selection before submitting', async () => {
    const onAddToNewCase = jest.fn();
    const onAddToExistingCase = jest.fn();

    render(
      <AddToCaseActionPanel
        actions={[
          {
            id: 'addToNewCase',
            label: 'Add to new case',
            dataTestSubj: 'add-to-new-case',
            onClick: onAddToNewCase,
          },
          {
            id: 'addToExistingCase',
            label: 'Add to existing case',
            dataTestSubj: 'add-to-existing-case',
            onClick: onAddToExistingCase,
          },
        ]}
      />
    );

    const submitButton = screen.getByTestId('add-to-case-submit');
    expect(submitButton).toBeDisabled();

    await userEvent.click(screen.getByTestId('add-to-new-case'));

    expect(submitButton).toBeEnabled();
    await userEvent.click(submitButton);
    expect(onAddToNewCase).toHaveBeenCalledTimes(1);
    expect(onAddToExistingCase).not.toHaveBeenCalled();
  });
});
