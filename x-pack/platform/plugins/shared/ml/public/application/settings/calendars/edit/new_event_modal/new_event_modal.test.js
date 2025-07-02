/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { fireEvent } from '@testing-library/react';
import moment from 'moment';

import { NewEventModal } from './new_event_modal';
import { TIME_FORMAT } from '@kbn/ml-date-utils';

const testProps = {
  closeModal: jest.fn(),
  addEvent: jest.fn(),
};

describe('NewEventModal', () => {
  it('Add button disabled if description empty', () => {
    // Render the component
    const { getByRole, getByLabelText } = renderWithI18n(<NewEventModal {...testProps} />);

    // Find the Add button by its role
    const addButton = getByRole('button', { name: 'Add' });

    // Verify it's disabled when description is empty
    expect(addButton).toBeDisabled();

    // Enter a description
    const descriptionField = getByLabelText('Description');
    fireEvent.change(descriptionField, { target: { value: 'Test event' } });

    // Verify button is now enabled
    expect(addButton).not.toBeDisabled();
  });

  it('enables adding event when description is provided', () => {
    // Render the component
    const { getByRole, getByLabelText } = renderWithI18n(<NewEventModal {...testProps} />);

    // Find the Add button by its role and verify it's initially disabled
    const addButton = getByRole('button', { name: 'Add' });
    expect(addButton).toBeDisabled();

    // Enter a description
    const descriptionField = getByLabelText('Description');
    fireEvent.change(descriptionField, { target: { value: 'Test event' } });

    // Verify button is now enabled
    expect(addButton).not.toBeDisabled();

    // Click the Add button
    fireEvent.click(addButton);

    // Verify the addEvent prop was called
    expect(testProps.addEvent).toHaveBeenCalled();
  });

  it('updates date fields when text inputs are changed', () => {
    // Render the component
    const { getByDisplayValue } = renderWithI18n(<NewEventModal {...testProps} />);

    // Get the initial date inputs
    const initialStartDate = getByDisplayValue(moment().startOf('day').format(TIME_FORMAT));
    const initialEndDate = getByDisplayValue(
      moment().startOf('day').add(1, 'days').format(TIME_FORMAT)
    );

    // Change the start date to a specific value
    const newStartDateString = '2023-01-15 00:00:00';
    fireEvent.change(initialStartDate, { target: { value: newStartDateString } });

    // Verify the input value was updated
    expect(initialStartDate.value).toBe(newStartDateString);

    // Change the end date to a specific value
    const newEndDateString = '2023-01-20 00:00:00';
    fireEvent.change(initialEndDate, { target: { value: newEndDateString } });

    // Verify the input value was updated
    expect(initialEndDate.value).toBe(newEndDateString);
  });
});
