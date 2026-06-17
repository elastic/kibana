/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

export function createFormSetValueAction<V extends string = string>(dataTestSubject: string) {
  return async (value: V) => {
    // Create userEvent instance with timer advancement
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const element = screen.getByTestId<HTMLInputElement | HTMLSelectElement>(dataTestSubject);

    if (element.tagName === 'SELECT') {
      // For select elements, use userEvent.selectOptions
      // This properly triggers React form state updates
      await user.selectOptions(element, value);
    } else {
      // Check if this is a number input with invalid characters that browser would filter
      // (e.g., comma in "5,5"). For these validation test cases, we need fireEvent
      // to bypass browser validation and test our own validation logic.
      const isNumberInput = element.getAttribute('type') === 'number';
      const hasInvalidChars = isNumberInput && /[,]/.test(value);

      if (hasInvalidChars) {
        // Use fireEvent to force invalid value that browser would normally reject
        // This allows us to test our validation logic for edge cases
        fireEvent.change(element, { target: { value } });
      } else {
        // For normal input, use userEvent for realistic interaction
        await user.clear(element);

        // userEvent.type() doesn't accept empty strings
        // For empty string validation tests, only clear the field
        if (value !== '') {
          await user.type(element, value);
        }
      }

      // Blur triggers validation
      fireEvent.blur(element);
    }
  };
}
