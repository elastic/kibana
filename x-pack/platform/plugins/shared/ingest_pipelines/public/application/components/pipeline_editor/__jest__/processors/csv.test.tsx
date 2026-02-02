/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

// Default parameter values automatically added to the CSV processor when saved
const defaultCSVParameters = {
  description: undefined,
  if: undefined,
  ignore_missing: undefined,
  ignore_failure: undefined,
  empty_value: undefined,
  quote: undefined,
  separator: undefined,
  tag: undefined,
  trim: undefined,
};

const CSV_TYPE = 'csv';

describe('Processor: CSV', () => {
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
      target: { value: CSV_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
    await screen.findByTestId('fieldNameField');
  });

  test('prevents form submission if required fields are not provided', async () => {
    // Click submit button with only the type defined
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    // Expect form error as "field" and "target_field" are required parameters
    expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
    expect(screen.getByText('A target fields value is required.')).toBeInTheDocument();
  });

  test('saves with default parameter values', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    // Add "target_field" value (required)
    fireEvent.change(within(screen.getByTestId('targetFieldsField')).getByTestId('input'), {
      target: { value: 'a_value' },
    });

    // Save the field
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][CSV_TYPE]).toEqual({
      ...defaultCSVParameters,
      field: 'field_1',
      target_fields: ['a_value'],
    });
  });

  test('should send ignore_missing:false when the toggle is disabled', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    // Add "target_field" value (required)
    fireEvent.change(within(screen.getByTestId('targetFieldsField')).getByTestId('input'), {
      target: { value: 'a_value' },
    });
    // Disable ignore missing toggle
    fireEvent.click(within(screen.getByTestId('ignoreMissingSwitch')).getByTestId('input'));

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][CSV_TYPE]).toEqual({
      ...defaultCSVParameters,
      field: 'field_1',
      target_fields: ['a_value'],
      ignore_missing: false,
    });
  });

  test('allows optional parameters to be set', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    // Add "target_field" value (required)
    fireEvent.change(within(screen.getByTestId('targetFieldsField')).getByTestId('input'), {
      target: { value: 'a_value' },
    });

    // Set optional parameters
    fireEvent.click(within(screen.getByTestId('trimSwitch')).getByTestId('input'));
    fireEvent.click(within(screen.getByTestId('ignoreFailureSwitch')).getByTestId('input'));
    fireEvent.click(within(screen.getByTestId('ignoreMissingSwitch')).getByTestId('input'));
    fireEvent.change(within(screen.getByTestId('quoteValueField')).getByTestId('input'), {
      target: { value: '"' },
    });
    fireEvent.change(within(screen.getByTestId('emptyValueField')).getByTestId('input'), {
      target: { value: ' ' },
    });
    fireEvent.change(within(screen.getByTestId('separatorValueField')).getByTestId('input'), {
      target: { value: ',' },
    });

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][CSV_TYPE]).toEqual({
      ...defaultCSVParameters,
      field: 'field_1',
      target_fields: ['a_value'],
      trim: true,
      ignore_failure: true,
      ignore_missing: false,
      separator: ',',
      quote: '"',
      empty_value: ' ',
    });
  });
});
