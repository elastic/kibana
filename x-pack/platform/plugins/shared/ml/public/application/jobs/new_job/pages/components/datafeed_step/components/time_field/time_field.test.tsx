/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import userEvent from '@testing-library/user-event';
import type { JobCreatorContextValue } from '../../../job_creator_context';
import { JobCreatorContext } from '../../../job_creator_context';
import { TimeField } from './time_field';

jest.mock(
  '../../../../../../../services/new_job_capabilities/new_job_capabilities_service',
  () => ({ useNewJobCapsService: () => ({ dateFields: [] }) })
);
jest.mock('../../../../../common/job_creator/util/general', () => ({
  createFieldOptions: () => [{ label: '@timestamp' }],
}));

const ERROR_MESSAGE = 'Select a time field from the list.';

describe('TimeField', () => {
  it('describes the combo box with an error when unmatched text is left in it', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <JobCreatorContext.Provider
        value={
          {
            jobCreator: { timeFieldName: '@timestamp', additionalFields: [] },
            jobCreatorUpdate: jest.fn(),
            jobCreatorUpdated: 0,
          } as unknown as JobCreatorContextValue
        }
      >
        <TimeField />
      </JobCreatorContext.Provider>
    );

    const input = screen.getByRole('combobox');
    expect(input).not.toHaveAccessibleDescription(ERROR_MESSAGE);

    await user.click(input);
    await user.keyboard('test');
    await user.tab();

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(ERROR_MESSAGE);
    expect(screen.getByText(ERROR_MESSAGE)).toBeVisible();
  });
});
