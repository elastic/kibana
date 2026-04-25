/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

// Default parameter values automatically added to the `convert processor` when saved
const defaultConvertParameters = {
  if: undefined,
  tag: undefined,
  description: undefined,
  target_field: undefined,
  ignore_missing: undefined,
  ignore_failure: undefined,
};

const CONVERT_TYPE = 'convert';

describe('Processor: Convert', () => {
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
      target: { value: CONVERT_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
  });

  test('prevents form submission if required fields are not provided', async () => {
    // Click submit button with only the processor type defined
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    // Expect form error as "field" and "type" are required parameters
    expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
    expect(screen.getByText('A type value is required.')).toBeInTheDocument();
  });

  test('saves with default parameter values', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    // Add "type" value (required)
    fireEvent.change(screen.getByTestId('typeSelectorField'), { target: { value: 'ip' } });

    // Save the field
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][CONVERT_TYPE]).toEqual({
      ...defaultConvertParameters,
      field: 'field_1',
      type: 'ip',
    });
  });

  test('allows optional parameters to be set', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    // Add "type" value (required)
    fireEvent.change(screen.getByTestId('typeSelectorField'), { target: { value: 'ip' } });

    // Set optional parameteres
    fireEvent.change(within(screen.getByTestId('targetField')).getByTestId('input'), {
      target: { value: 'target_field' },
    });
    fireEvent.click(within(screen.getByTestId('ignoreMissingSwitch')).getByTestId('input'));
    fireEvent.click(within(screen.getByTestId('ignoreFailureSwitch')).getByTestId('input'));

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][CONVERT_TYPE]).toEqual({
      ...defaultConvertParameters,
      type: 'ip',
      field: 'field_1',
      target_field: 'target_field',
      ignore_failure: true,
      ignore_missing: true,
    });
  });
});
