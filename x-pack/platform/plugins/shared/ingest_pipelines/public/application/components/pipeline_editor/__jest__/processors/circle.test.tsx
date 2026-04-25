/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const CIRCLE_TYPE = 'circle';

describe('Processor: Circle', () => {
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
      target: { value: CIRCLE_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
    await screen.findByTestId('fieldNameField');
  });

  test('prevents form submission if required fields are not provided', async () => {
    // Click submit button with only the type defined
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    // Expect form error as "field", "shape_type" and "error_distance" are required parameters
    expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
    expect(screen.getByText('An error distance value is required.')).toBeInTheDocument();
    expect(screen.getByText('A shape type value is required.')).toBeInTheDocument();
  });

  test('saves with required parameter values', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    // Save the field
    fireEvent.change(screen.getByTestId('shapeSelectorField'), { target: { value: 'shape' } });
    // Set the error distance
    fireEvent.change(within(screen.getByTestId('errorDistanceField')).getByTestId('input'), {
      target: { value: '10' },
    });

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);

    expect(processors[0].circle).toEqual({
      field: 'field_1',
      error_distance: 10,
      shape_type: 'shape',
    });
  });

  test('allows optional parameters to be set', async () => {
    // Set required parameters
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    fireEvent.change(screen.getByTestId('shapeSelectorField'), { target: { value: 'geo_shape' } });
    fireEvent.change(within(screen.getByTestId('errorDistanceField')).getByTestId('input'), {
      target: { value: '10' },
    });

    // Set optional parameters
    fireEvent.change(within(screen.getByTestId('targetField')).getByTestId('input'), {
      target: { value: 'target_field' },
    });
    fireEvent.click(within(screen.getByTestId('ignoreMissingSwitch')).getByTestId('input'));

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0].circle).toEqual({
      field: 'field_1',
      error_distance: 10,
      shape_type: 'geo_shape',
      target_field: 'target_field',
      ignore_missing: true,
    });
  });
});
