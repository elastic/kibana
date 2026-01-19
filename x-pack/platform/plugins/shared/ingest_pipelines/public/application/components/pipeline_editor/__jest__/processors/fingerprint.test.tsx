/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

// Default parameter values automatically added to the registered domain processor when saved
const defaultFingerprintParameters = {
  if: undefined,
  tag: undefined,
  method: undefined,
  salt: undefined,
  description: undefined,
  ignore_missing: undefined,
  ignore_failure: undefined,
  target_field: undefined,
};

const FINGERPRINT_TYPE = 'fingerprint';

describe('Processor: Fingerprint', () => {
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
      target: { value: FINGERPRINT_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
  });

  test('prevents form submission if required fields are not provided', async () => {
    // Click submit button with only the type defined
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    // Expect form error as "field" is required parameter
    expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
  });

  test('saves with default parameter values', async () => {
    // Add "fields" value (required)
    fireEvent.change(within(screen.getByTestId('fieldsValueField')).getByTestId('input'), {
      target: { value: 'user' },
    });
    // Save the field
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][FINGERPRINT_TYPE]).toEqual({
      ...defaultFingerprintParameters,
      fields: ['user'],
    });
  });

  test('allows optional parameters to be set', async () => {
    // Add "fields" value (required)
    fireEvent.change(within(screen.getByTestId('fieldsValueField')).getByTestId('input'), {
      target: { value: 'user' },
    });

    // Set optional parameteres
    fireEvent.change(within(screen.getByTestId('targetField')).getByTestId('input'), {
      target: { value: 'target_field' },
    });
    fireEvent.change(screen.getByTestId('methodsValueField'), { target: { value: 'SHA-256' } });
    fireEvent.change(within(screen.getByTestId('saltValueField')).getByTestId('input'), {
      target: { value: 'salt' },
    });
    fireEvent.click(within(screen.getByTestId('ignoreMissingSwitch')).getByTestId('input'));
    fireEvent.click(within(screen.getByTestId('ignoreFailureSwitch')).getByTestId('input'));

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][FINGERPRINT_TYPE]).toEqual({
      ...defaultFingerprintParameters,
      fields: ['user'],
      target_field: 'target_field',
      method: 'SHA-256',
      salt: 'salt',
      ignore_missing: true,
      ignore_failure: true,
    });
  });
});
