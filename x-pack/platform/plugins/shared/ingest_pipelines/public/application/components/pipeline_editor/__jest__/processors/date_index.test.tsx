/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const DATE_INDEX_TYPE = 'date_index_name';

describe('Processor: Date Index Name', () => {
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
      target: { value: DATE_INDEX_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
  });

  test('prevents form submission if required fields are not provided', async () => {
    // Click submit button with only the type defined
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    // Expect form error as "field" and "date rounding" are required parameters
    expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
    expect(screen.getByText('A date rounding value is required.')).toBeInTheDocument();
  });

  test('saves with required field and date rounding parameter values', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: '@timestamp' },
    });

    // Select second value for date rounding
    fireEvent.change(screen.getByTestId('dateRoundingField'), { target: { value: 's' } });

    // Save the field
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0].date_index_name).toEqual({
      field: '@timestamp',
      date_rounding: 's',
    });
  });

  test('allows optional parameters to be set', async () => {
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    fireEvent.change(screen.getByTestId('dateRoundingField'), { target: { value: 'd' } });
    fireEvent.change(within(screen.getByTestId('indexNamePrefixField')).getByTestId('input'), {
      target: { value: 'prefix' },
    });
    fireEvent.change(within(screen.getByTestId('indexNameFormatField')).getByTestId('input'), {
      target: { value: 'yyyy-MM' },
    });
    fireEvent.change(within(screen.getByTestId('dateFormatsField')).getByTestId('input'), {
      target: { value: 'ISO8601' },
    });
    fireEvent.change(within(screen.getByTestId('timezoneField')).getByTestId('input'), {
      target: { value: 'GMT' },
    });
    fireEvent.change(within(screen.getByTestId('localeField')).getByTestId('input'), {
      target: { value: 'SPANISH' },
    });
    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0].date_index_name).toEqual({
      field: 'field_1',
      date_rounding: 'd',
      index_name_format: 'yyyy-MM',
      index_name_prefix: 'prefix',
      date_formats: ['ISO8601'],
      locale: 'SPANISH',
      timezone: 'GMT',
    });
  });
});
