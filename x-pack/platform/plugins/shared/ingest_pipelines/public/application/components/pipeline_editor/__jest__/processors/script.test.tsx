/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const SCRIPT_TYPE = 'script';

describe('Processor: Script', () => {
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
      target: { value: SCRIPT_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
  });

  test('prevents form submission if required fields are not provided', async () => {
    // Click submit button with only the type defined
    // Expect form error as "field" is a required parameter
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    expect(await screen.findByText('A value is required.')).toBeInTheDocument();
  });

  test('accepts params that contains escaped characters', async () => {
    fireEvent.change(screen.getByTestId('scriptSource'), {
      target: { value: 'ctx._source[params.sum_field]' },
    });
    fireEvent.change(screen.getByTestId('paramsField'), {
      target: { value: '{"sum_field":"""aaa"bbb"""}' },
    });

    // Save the field
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);

    expect(processors[0][SCRIPT_TYPE]).toEqual({
      source: 'ctx._source[params.sum_field]',
      // eslint-disable-next-line prettier/prettier
      params: { sum_field: 'aaa\"bbb' },
    });
  });
});
