/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const INFERENCE_TYPE = 'inference';

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
      target: { value: INFERENCE_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
  });

  test('prevents form submission if required fields are not provided', async () => {
    // Click submit button with only the type defined
    // Expect form error as "field" is a required parameter
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    expect(
      await screen.findByText('A deployment, an inference, or a model ID value is required.')
    ).toBeInTheDocument();
  });

  test('accepts inference config and field maps that contains escaped characters', async () => {
    fireEvent.change(within(screen.getByTestId('inferenceModelId')).getByTestId('input'), {
      target: { value: 'test_inference_processor' },
    });
    fireEvent.change(screen.getByTestId('inferenceConfig'), {
      target: { value: '{"inf_conf_1":"""aaa"bbb""", "inf_conf_2": "aaa(bbb"}' },
    });
    fireEvent.change(screen.getByTestId('fieldMap'), {
      target: { value: '{"field_map_1":"""aaa"bbb""", "field_map_2": "aaa(bbb"}' },
    });

    // Save the field
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);

    expect(processors[0][INFERENCE_TYPE]).toEqual({
      model_id: 'test_inference_processor',

      inference_config: { inf_conf_1: 'aaa"bbb', inf_conf_2: 'aaa(bbb' },

      field_map: { field_map_1: 'aaa"bbb', field_map_2: 'aaa(bbb' },
    });
  });
});
