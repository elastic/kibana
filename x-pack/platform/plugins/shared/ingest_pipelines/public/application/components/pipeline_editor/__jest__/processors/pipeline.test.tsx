/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const PIPELINE_TYPE = 'pipeline';

describe('Processor: Pipeline', () => {
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
      target: { value: PIPELINE_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
    await screen.findByTestId('pipelineNameField');
  });

  test('prevents form submission if required fields are not provided', async () => {
    // Click submit button with only the type defined
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    // Expect form error as "name" is a required parameter
    expect(await screen.findByText('A value is required.')).toBeInTheDocument();
  });

  test('saves with required parameter values', async () => {
    // Set pipeline name (required)
    fireEvent.change(within(screen.getByTestId('pipelineNameField')).getByTestId('input'), {
      target: { value: 'my-pipeline' },
    });
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][PIPELINE_TYPE]).toEqual({
      name: 'my-pipeline',
    });
  });

  test('allows optional parameters to be set', async () => {
    // Set pipeline name (required)
    fireEvent.change(within(screen.getByTestId('pipelineNameField')).getByTestId('input'), {
      target: { value: 'my-pipeline' },
    });

    // Set optional parameters
    fireEvent.click(within(screen.getByTestId('ignoreMissingPipelineSwitch')).getByTestId('input'));

    // Save the processor
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][PIPELINE_TYPE]).toEqual({
      name: 'my-pipeline',
      ignore_missing_pipeline: true,
    });
  });
});
