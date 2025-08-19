/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { fireEvent } from '@testing-library/react';

import { NewEventModal } from './new_event_modal';

const testProps = {
  closeModal: jest.fn(),
  addEvent: jest.fn(),
};

describe('NewEventModal', () => {
  it('Add button disabled if description empty', () => {
    // Render the component
    const { getByTestId } = renderWithI18n(<NewEventModal {...testProps} />);

    // Find the Add button by its role
    const addButton = getByTestId('mlCalendarAddEventButton');

    // Verify it's disabled when description is empty
    expect(addButton).toBeDisabled();

    // Enter a description
    const descriptionField = getByTestId('mlCalendarEventDescriptionInput');
    fireEvent.change(descriptionField, { target: { value: 'Test event' } });

    // Verify button is now enabled
    expect(addButton).not.toBeDisabled();
  });

  it('enables adding event when description is provided', () => {
    // Render the component
    const { getByTestId } = renderWithI18n(<NewEventModal {...testProps} />);

    // Find the Add button by its role and verify it's initially disabled
    const addButton = getByTestId('mlCalendarAddEventButton');
    expect(addButton).toBeDisabled();

    // Enter a description
    const descriptionField = getByTestId('mlCalendarEventDescriptionInput');
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
    const { getByTestId } = renderWithI18n(<NewEventModal {...testProps} />);

    // Get the initial date inputs
    const startDateInput = getByTestId('mlCalendarEventStartDateInput');
    const endDateInput = getByTestId('mlCalendarEventEndDateInput');

    // Change the start date to a specific value
    const newStartDateString = '2023-01-15 00:00:00';
    fireEvent.change(startDateInput, { target: { value: newStartDateString } });

    // Verify the input value was updated
    expect(startDateInput.value).toBe(newStartDateString);

    // Change the end date to a specific value
    const newEndDateString = '2023-01-20 00:00:00';
    fireEvent.change(endDateInput, { target: { value: newEndDateString } });

    // Verify the input value was updated
    expect(endDateInput.value).toBe(newEndDateString);
  });
});
