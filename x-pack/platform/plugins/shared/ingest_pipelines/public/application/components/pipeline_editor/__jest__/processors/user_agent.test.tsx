/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

// Default parameter values automatically added to the user agent processor when saved
const defaultUserAgentParameters = {
  if: undefined,
  regex_file: undefined,
  properties: undefined,
  description: undefined,
  ignore_missing: undefined,
  ignore_failure: undefined,
  extract_device_type: undefined,
};

const USER_AGENT_TYPE = 'user_agent';

describe('Processor: User Agent', () => {
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
      target: { value: USER_AGENT_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
    await screen.findByTestId('fieldNameField');
  });

  test('prevents form submission if required fields are not provided', async () => {
    // Click submit button with only the processor type defined
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    // Expect form error as "field" is required parameter
    expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
  });

  test('saves with just the default parameter value', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][USER_AGENT_TYPE]).toEqual({
      ...defaultUserAgentParameters,
      field: 'field_1',
    });
  });

  test('allows optional parameters to be set', async () => {
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });

    // Set optional parameteres
    fireEvent.change(within(screen.getByTestId('targetField')).getByTestId('input'), {
      target: { value: 'target_field' },
    });
    fireEvent.change(within(screen.getByTestId('regexFileField')).getByTestId('input'), {
      target: { value: 'hello*' },
    });
    fireEvent.click(within(screen.getByTestId('ignoreMissingSwitch')).getByTestId('input'));
    fireEvent.click(within(screen.getByTestId('ignoreFailureSwitch')).getByTestId('input'));
    fireEvent.click(within(screen.getByTestId('extractDeviceTypeSwitch')).getByTestId('input'));
    fireEvent.change(screen.getByTestId('propertiesValueField'), { target: { value: 'os' } });

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][USER_AGENT_TYPE]).toEqual({
      ...defaultUserAgentParameters,
      field: 'field_1',
      target_field: 'target_field',
      properties: ['os'],
      regex_file: 'hello*',
      extract_device_type: true,
      ignore_missing: true,
      ignore_failure: true,
    });
  });
});
