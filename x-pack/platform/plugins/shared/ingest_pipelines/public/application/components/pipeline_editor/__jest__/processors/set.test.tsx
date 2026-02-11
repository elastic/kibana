/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const SET_TYPE = 'set';

describe('Processor: Set', () => {
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
      target: { value: SET_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
    await screen.findByTestId('fieldNameField');
  });

  test('prevents form submission if required fields are not provided', async () => {
    // Click submit button with only the type defined
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    // Expect form error as "field" is required parameter
    expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
  });

  test('saves with default parameter value', async () => {
    // Add required fields
    fireEvent.change(within(screen.getByTestId('textValueField')).getByTestId('input'), {
      target: { value: 'value' },
    });
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][SET_TYPE]).toEqual({
      field: 'field_1',
      value: 'value',
    });
  });

  test('allows to save the the copy_from value', async () => {
    // Add required fields
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });

    // Set value field
    fireEvent.change(within(screen.getByTestId('textValueField')).getByTestId('input'), {
      target: { value: 'value' },
    });

    // Toggle to copy_from field and set a random value
    fireEvent.click(within(screen.getByTestId('toggleCustomField')).getByTestId('input'));
    fireEvent.change(within(screen.getByTestId('copyFromInput')).getByTestId('input'), {
      target: { value: 'copy_from' },
    });

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][SET_TYPE]).toEqual({
      field: 'field_1',
      copy_from: 'copy_from',
    });
  });

  test('should allow to set mediaType when value is a template snippet', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });

    // Shouldnt be able to set mediaType if value is not a template string
    fireEvent.change(within(screen.getByTestId('textValueField')).getByTestId('input'), {
      target: { value: 'hello' },
    });
    expect(screen.queryByTestId('mediaTypeSelectorField')).not.toBeInTheDocument();

    // Set value to a template snippet and media_type to a non-default value
    fireEvent.change(within(screen.getByTestId('textValueField')).getByTestId('input'), {
      target: { value: '{{{hello}}}' },
    });
    fireEvent.change(screen.getByTestId('mediaTypeSelectorField'), {
      target: { value: 'text/plain' },
    });

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][SET_TYPE]).toEqual({
      field: 'field_1',
      value: '{{{hello}}}',
      media_type: 'text/plain',
    });
  });

  test('allows optional parameters to be set', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });

    // Set optional parameteres
    fireEvent.change(within(screen.getByTestId('textValueField')).getByTestId('input'), {
      target: { value: '{{{hello}}}' },
    });
    fireEvent.click(within(screen.getByTestId('overrideField')).getByTestId('input'));
    fireEvent.click(within(screen.getByTestId('ignoreEmptyField')).getByTestId('input'));

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][SET_TYPE]).toEqual({
      field: 'field_1',
      value: '{{{hello}}}',
      ignore_empty_value: true,
      override: false,
    });
  });

  test('saves with json parameter value', async () => {
    fireEvent.change(within(screen.getByTestId('textValueField')).getByTestId('input'), {
      target: { value: 'value' },
    });

    fireEvent.click(screen.getByTestId('toggleTextField'));

    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    const jsonValueField = await screen.findByTestId('jsonValueField');
    fireEvent.change(jsonValueField, {
      target: { value: '{"value_1":"""aaa"bbb""", "value_2":"aaa(bbb"}' },
    });

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][SET_TYPE]).toEqual({
      field: 'field_1',
      // eslint-disable-next-line prettier/prettier
      value: { value_1: 'aaa\"bbb', value_2: 'aaa(bbb' },
    });
  });

  test('saves with empty string as value', async () => {
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    fireEvent.change(within(screen.getByTestId('textValueField')).getByTestId('input'), {
      target: { value: '' },
    });

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][SET_TYPE]).toEqual({
      field: 'field_1',
      value: '',
    });
  });

  test('saves with "0" as value', async () => {
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    fireEvent.change(within(screen.getByTestId('textValueField')).getByTestId('input'), {
      target: { value: '0' },
    });

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    // "0" is JSON-parsed to the number 0 during serialization
    expect(processors[0][SET_TYPE].field).toEqual('field_1');
    expect(processors[0][SET_TYPE].value).toEqual(0);
  });

  test('saves with "false" as value', async () => {
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    fireEvent.change(within(screen.getByTestId('textValueField')).getByTestId('input'), {
      target: { value: 'false' },
    });

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    // "false" is JSON-parsed to the boolean false during serialization
    expect(processors[0][SET_TYPE].field).toEqual('field_1');
    expect(processors[0][SET_TYPE].value).toEqual(false);
  });
});
