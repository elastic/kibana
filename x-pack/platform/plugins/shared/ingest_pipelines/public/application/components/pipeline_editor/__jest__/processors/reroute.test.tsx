/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const REROUTE_TYPE = 'reroute';

describe('Processor: Reroute', () => {
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
      target: { value: REROUTE_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
  });

  test('saves with no parameter values set', async () => {
    // There are no required parameter values

    // Save the field
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0].reroute).toEqual({});
  });

  test('allows setting Destination parameter', async () => {
    // Set "destination" value
    fireEvent.change(within(screen.getByTestId('destinationField')).getByTestId('input'), {
      target: { value: 'my-destination' },
    });

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0].reroute).toEqual({
      destination: 'my-destination',
    });
  });

  test('allows setting Dataset and Namespace parameters', async () => {
    // Set a "dataset" value
    fireEvent.change(within(screen.getByTestId('datasetField')).getByTestId('input'), {
      target: { value: 'nginx' },
    });

    // Set a "namespace" value
    fireEvent.change(within(screen.getByTestId('namespaceField')).getByTestId('input'), {
      target: { value: 'default' },
    });

    // Set "ignore_failure" to true (optional)
    fireEvent.click(within(screen.getByTestId('ignoreFailureSwitch')).getByTestId('input'));

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0].reroute).toEqual({
      dataset: ['nginx'],
      namespace: ['default'],
      ignore_failure: true,
    });
  });

  test("doesn't set a Destination parameter when Dataset or Namespace is set", async () => {
    // Set "destination" value
    fireEvent.change(within(screen.getByTestId('destinationField')).getByTestId('input'), {
      target: { value: 'my-destination' },
    });

    // Set a "dataset" value
    fireEvent.change(within(screen.getByTestId('datasetField')).getByTestId('input'), {
      target: { value: 'nginx' },
    });

    // Set a "namespace" value
    fireEvent.change(within(screen.getByTestId('namespaceField')).getByTestId('input'), {
      target: { value: 'default' },
    });

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    // Verify that the "destination" parameter is set to '' (which is mapped to undefined) because "dataset" and "namespace" parameters are set
    const processors = getProcessorValue(onUpdate);
    expect(processors[0].reroute).toEqual({
      destination: undefined,
      dataset: ['nginx'],
      namespace: ['default'],
    });
  });
});
