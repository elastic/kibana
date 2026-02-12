/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const BYTES_TYPE = 'bytes';

describe('Processor: Common Fields For All Processors', () => {
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

  test('prevents form submission if required type field is not provided', async () => {
    // Open flyout to add new processor
    fireEvent.click(screen.getByTestId('addProcessorButton'));
    const form = await screen.findByTestId('addProcessorForm');
    // Click submit button without entering any fields
    fireEvent.click(within(form).getByTestId('submitButton'));

    // Expect form error as a processor type is required
    expect(await screen.findByText('A type is required.')).toBeInTheDocument();
  });

  test('saves with common fields set', async () => {
    // This test ensures that the common fields that are used across all processors
    // works and removes the need for those fields to be in every processors' test.

    // Open flyout to add new processor
    fireEvent.click(screen.getByTestId('addProcessorButton'));
    fireEvent.change(within(screen.getByTestId('processorTypeSelector')).getByTestId('input'), {
      target: { value: BYTES_TYPE },
    });

    const addProcessorForm = await screen.findByTestId('addProcessorForm');
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    fireEvent.click(within(screen.getByTestId('ignoreFailureSwitch')).getByTestId('input'));
    fireEvent.change(within(screen.getByTestId('tagField')).getByTestId('input'), {
      target: { value: 'some_tag' },
    });

    // Edit the Code Editor
    const jsonContent = JSON.stringify({ content: "ctx?.network?.name == 'Guest'" });
    fireEvent.change(screen.getByTestId('mockedCodeEditor'), { target: { value: jsonContent } });

    // Save the field
    fireEvent.click(within(addProcessorForm).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0].bytes).toEqual({
      field: 'field_1',
      ignore_failure: true,
      if: jsonContent,
      tag: 'some_tag',
      ignore_missing: undefined,
    });
  });
});
