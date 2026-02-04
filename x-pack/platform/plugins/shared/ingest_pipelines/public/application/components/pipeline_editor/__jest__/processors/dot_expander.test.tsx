/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const DOT_EXPANDER_TYPE = 'dot_expander';

describe('Processor: Dot Expander', () => {
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

    fireEvent.click(screen.getByTestId('addProcessorButton'));
    fireEvent.change(within(screen.getByTestId('processorTypeSelector')).getByTestId('input'), {
      target: { value: DOT_EXPANDER_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
    await screen.findByTestId('fieldNameField');
  });

  test('prevents form submission if required fields are not provided', async () => {
    // Click submit button with only the type defined
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
  });

  test('prevents form submission if field for the dot notation does not contain a . and not equal to *', async () => {
    // Add invalid "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'missingTheDot' },
    });

    // Save the processor with invalid field
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    expect(
      await screen.findByText('The field name must be an asterisk or contain a dot character.')
    ).toBeInTheDocument();
  });

  test('allows form submission if the field for the dot notation is equal to *', async () => {
    // Set "field" value to a * for expanding all top-level dotted field names
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: '*' },
    });

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][DOT_EXPANDER_TYPE]).toEqual({
      field: '*',
    });
  });

  test('saves with default parameter values', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field.with.dot' },
    });

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][DOT_EXPANDER_TYPE]).toEqual({
      field: 'field.with.dot',
    });
  });

  test('allows optional parameters to be set', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field.notation' },
    });

    // Set optional parameters
    fireEvent.change(within(screen.getByTestId('pathField')).getByTestId('input'), {
      target: { value: 'somepath' },
    });
    fireEvent.click(within(screen.getByTestId('overrideField')).getByTestId('input'));

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][DOT_EXPANDER_TYPE]).toEqual({
      field: 'field.notation',
      path: 'somepath',
      override: true,
    });
  });
});
