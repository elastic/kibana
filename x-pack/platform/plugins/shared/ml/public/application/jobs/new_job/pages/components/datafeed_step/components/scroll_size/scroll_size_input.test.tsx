/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { JobCreatorContextValue } from '../../../job_creator_context';
import { JobCreatorContext } from '../../../job_creator_context';
import type { Validation } from '../../../../../common/job_validator';
import { ScrollSizeInput } from './scroll_size_input';

jest.mock('../../../../../../../services/ml_server_info', () => ({
  getNewJobDefaults: () => ({ datafeeds: { scroll_size: 1000 } }),
}));

const ERROR_MESSAGE = 'Scroll size must be a whole number greater than zero.';

const renderScrollSizeInput = (scrollSize: Validation) =>
  renderWithI18n(
    <JobCreatorContext.Provider
      value={
        {
          jobCreator: { scrollSize: null },
          jobCreatorUpdate: jest.fn(),
          jobValidator: { scrollSize },
          jobValidatorUpdated: 0,
        } as unknown as JobCreatorContextValue
      }
    >
      <ScrollSizeInput />
    </JobCreatorContext.Provider>
  );

describe('ScrollSizeInput', () => {
  it('describes the input with the validation error text', () => {
    renderScrollSizeInput({ valid: false, message: ERROR_MESSAGE });

    const input = screen.getByTestId('mlJobWizardInputScrollSize');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(ERROR_MESSAGE);
  });

  it('shows an error when the browser cannot parse the entered value', () => {
    renderScrollSizeInput({ valid: true });

    const input = screen.getByTestId('mlJobWizardInputScrollSize');
    expect(input).not.toHaveAccessibleDescription(ERROR_MESSAGE);

    Object.defineProperty(input, 'validity', { value: { badInput: true } });
    fireEvent.keyUp(input);

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(ERROR_MESSAGE);
  });
});
