/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const DATE_TYPE = 'date';

describe('Processor: Date', () => {
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
      target: { value: DATE_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
    await screen.findByTestId('fieldNameField');
  });

  test('prevents form submission when field and format fields are not provided', async () => {
    // Click submit button with only the type defined
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    // Expect form error as "field" and "value" are required parameters
    expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
    expect(screen.getByText('A value for formats is required.')).toBeInTheDocument();
  });

  test('saves with required field and formats parameter values', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    fireEvent.change(within(screen.getByTestId('formatsValueField')).getByTestId('input'), {
      target: { value: 'ISO8601' },
    });

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0].date).toEqual({
      field: 'field_1',
      formats: ['ISO8601'],
    });
  });

  test('allows optional parameters to be set', async () => {
    // Set required parameters
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    fireEvent.change(within(screen.getByTestId('formatsValueField')).getByTestId('input'), {
      target: { value: 'ISO8601' },
    });

    // Set optional parameters
    fireEvent.change(within(screen.getByTestId('targetField')).getByTestId('input'), {
      target: { value: 'target_field' },
    });
    fireEvent.change(within(screen.getByTestId('localeField')).getByTestId('input'), {
      target: { value: 'SPANISH' },
    });
    fireEvent.change(within(screen.getByTestId('timezoneField')).getByTestId('input'), {
      target: { value: 'EST' },
    });
    fireEvent.change(within(screen.getByTestId('outputFormatField')).getByTestId('input'), {
      target: { value: 'yyyy-MM-dd' },
    });

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0].date).toEqual({
      field: 'field_1',
      formats: ['ISO8601'],
      target_field: 'target_field',
      locale: 'SPANISH',
      timezone: 'EST',
      output_format: 'yyyy-MM-dd',
    });
  });
});
