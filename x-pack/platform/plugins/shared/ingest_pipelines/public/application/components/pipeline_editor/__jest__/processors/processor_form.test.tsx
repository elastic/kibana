/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, within } from '@testing-library/react';
import { renderProcessorEditor, setupEnvironment } from './processor.helpers';

describe('Processor: Bytes', () => {
  let onUpdate: jest.Mock;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ httpSetup } = setupEnvironment());
    onUpdate = jest.fn();

    renderProcessorEditor(httpSetup, {
      value: {
        processors: [],
      },
      onFlyoutOpen: jest.fn(),
      onUpdate,
    });
  });

  test('Prevents form submission if processor type not selected', async () => {
    // Open flyout to add new processor
    fireEvent.click(screen.getByTestId('addProcessorButton'));
    const addProcessorForm = await screen.findByTestId('addProcessorForm');
    // Click submit button without entering any fields
    fireEvent.click(within(addProcessorForm).getByTestId('submitButton'));

    // Expect form error as a processor type is required
    expect(await screen.findByText('A type is required.')).toBeInTheDocument();
  });
});
