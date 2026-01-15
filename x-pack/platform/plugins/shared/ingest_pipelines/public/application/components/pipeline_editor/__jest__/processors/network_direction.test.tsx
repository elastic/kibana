/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

// Default parameter values automatically added to the network direction processor when saved
const defaultNetworkDirectionParameters = {
  if: undefined,
  tag: undefined,
  source_ip: undefined,
  description: undefined,
  target_field: undefined,
  ignore_missing: undefined,
  ignore_failure: undefined,
  destination_ip: undefined,
  internal_networks: undefined,
  internal_networks_field: undefined,
};

const NETWORK_DIRECTION_TYPE = 'network_direction';

describe('Processor: Network Direction', () => {
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
      target: { value: NETWORK_DIRECTION_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
    await screen.findByTestId('networkDirectionField');
  });

  test('prevents form submission if internal_network field is not provided', async () => {
    // Click submit button with only the type defined
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    // Expect form error as "field" is required parameter
    expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
  });

  test('saves with default parameter values', async () => {
    // Add "networkDirectionField" value (required)
    fireEvent.change(within(screen.getByTestId('networkDirectionField')).getByTestId('input'), {
      target: { value: 'loopback' },
    });

    // Save the field
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][NETWORK_DIRECTION_TYPE]).toEqual({
      ...defaultNetworkDirectionParameters,
      internal_networks: ['loopback'],
    });
  });

  test('allows to set internal_networks_field', async () => {
    fireEvent.click(screen.getByTestId('toggleCustomField'));

    fireEvent.change(within(screen.getByTestId('networkDirectionField')).getByTestId('input'), {
      target: { value: 'internal_networks_field' },
    });

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][NETWORK_DIRECTION_TYPE]).toEqual({
      ...defaultNetworkDirectionParameters,
      internal_networks_field: 'internal_networks_field',
    });
  });

  test('allows to set just internal_networks_field or internal_networks', async () => {
    // Set internal_networks field
    fireEvent.change(within(screen.getByTestId('networkDirectionField')).getByTestId('input'), {
      target: { value: 'loopback' },
    });

    // Toggle to internal_networks_field and set a random value
    fireEvent.click(screen.getByTestId('toggleCustomField'));
    fireEvent.change(within(screen.getByTestId('networkDirectionField')).getByTestId('input'), {
      target: { value: 'internal_networks_field' },
    });

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][NETWORK_DIRECTION_TYPE]).toEqual({
      ...defaultNetworkDirectionParameters,
      internal_networks_field: 'internal_networks_field',
    });
  });

  test('allows optional parameters to be set', async () => {
    // Add "networkDirectionField" value (required)
    fireEvent.change(within(screen.getByTestId('networkDirectionField')).getByTestId('input'), {
      target: { value: 'loopback' },
    });

    // Set optional parameteres
    fireEvent.click(within(screen.getByTestId('ignoreMissingSwitch')).getByTestId('input'));
    fireEvent.click(within(screen.getByTestId('ignoreFailureSwitch')).getByTestId('input'));
    fireEvent.change(within(screen.getByTestId('sourceIpField')).getByTestId('input'), {
      target: { value: 'source.ip' },
    });
    fireEvent.change(within(screen.getByTestId('targetField')).getByTestId('input'), {
      target: { value: 'target_field' },
    });
    fireEvent.change(within(screen.getByTestId('destinationIpField')).getByTestId('input'), {
      target: { value: 'destination.ip' },
    });

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][NETWORK_DIRECTION_TYPE]).toEqual({
      ...defaultNetworkDirectionParameters,
      ignore_failure: true,
      ignore_missing: false,
      source_ip: 'source.ip',
      target_field: 'target_field',
      destination_ip: 'destination.ip',
      internal_networks: ['loopback'],
    });
  });
});
