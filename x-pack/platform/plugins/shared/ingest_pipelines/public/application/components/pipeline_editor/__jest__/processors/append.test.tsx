/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const APPEND_TYPE = 'append';

describe('Processor: Append', () => {
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
      target: { value: APPEND_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
    await screen.findByTestId('fieldNameField');
  });

  test('prevents form submission if required fields are not provided', async () => {
    // Click submit button with only the type defined
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    // Expect form error as "field" and "value" are required parameters
    expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
    expect(screen.getByText('A value is required.')).toBeInTheDocument();
  });

  test('saves with required parameter values', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });

    fireEvent.change(within(screen.getByTestId('comboxValueField')).getByTestId('input'), {
      target: { value: 'Some_Value' },
    });

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0].append).toEqual({
      field: 'field_1',
      value: ['Some_Value'],
    });
  });

  test('allows optional parameters to be set', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });

    // Set optional parameteres
    fireEvent.change(within(screen.getByTestId('comboxValueField')).getByTestId('input'), {
      target: { value: 'Some_Value' },
    });
    fireEvent.click(within(screen.getByTestId('allowDuplicatesSwitch')).getByTestId('input'));
    fireEvent.click(within(screen.getByTestId('ignoreFailureSwitch')).getByTestId('input'));

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0].append).toEqual({
      field: 'field_1',
      ignore_failure: true,
      value: ['Some_Value'],
      allow_duplicates: false,
    });
  });

  test('should allow to set media_type when value is a template snippet', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'sample_field' },
    });

    // Shouldn't be able to set media_type if value is not a template string
    fireEvent.change(within(screen.getByTestId('comboxValueField')).getByTestId('input'), {
      target: { value: 'value_1' },
    });
    expect(screen.queryByTestId('mediaTypeSelectorField')).not.toBeInTheDocument();

    // Set value to a template snippet and media_type to a non-default value
    fireEvent.change(within(screen.getByTestId('comboxValueField')).getByTestId('input'), {
      target: { value: '{{{value_2}}}' },
    });
    fireEvent.change(screen.getByTestId('mediaTypeSelectorField'), {
      target: { value: 'text/plain' },
    });

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][APPEND_TYPE]).toEqual({
      field: 'sample_field',
      value: ['{{{value_2}}}'],
      media_type: 'text/plain',
    });
  });

  test('saves with json parameter values', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    fireEvent.change(within(screen.getByTestId('comboxValueField')).getByTestId('input'), {
      target: { value: 'Some_Value' },
    });

    fireEvent.click(screen.getByTestId('toggleTextField'));
    const jsonValueField = await screen.findByTestId('jsonValueField');
    fireEvent.change(jsonValueField, {
      target: { value: '{"value_1":"""aaa"bbb""", "value_2":"aaa(bbb"}' },
    });

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0].append).toEqual({
      field: 'field_1',
      // eslint-disable-next-line prettier/prettier
      value: { value_1: 'aaa\"bbb', value_2: 'aaa(bbb' },
    });
  });
});
