/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const COMMUNITY_ID_TYPE = 'community_id';

describe('Processor: Community id', () => {
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
      target: { value: COMMUNITY_ID_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
  });

  test('can submit if no fields are filled', async () => {
    // Click submit button with no fields filled
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    // Expect no form errors
    await waitFor(() => expect(screen.queryAllByText(/is required\./)).toHaveLength(0));
  });

  test('allows to set either iana_number or transport', async () => {
    const ianaField = await screen.findByTestId('ianaField');
    const transportField = screen.getByTestId('transportField');

    const ianaInput = within(ianaField).getByTestId('input');
    const transportInput = within(transportField).getByTestId('input');

    fireEvent.change(ianaInput, { target: { value: 'iana_number' } });
    await waitFor(() => expect(transportInput).toBeDisabled());

    fireEvent.change(ianaInput, { target: { value: '' } });
    fireEvent.change(transportInput, { target: { value: 'transport' } });
    await waitFor(() => expect(ianaInput).toBeDisabled());
  });

  test('allows optional parameters to be set', async () => {
    fireEvent.click(within(screen.getByTestId('ignoreMissingSwitch')).getByTestId('input'));
    fireEvent.click(within(screen.getByTestId('ignoreFailureSwitch')).getByTestId('input'));
    fireEvent.change(within(screen.getByTestId('sourceIpField')).getByTestId('input'), {
      target: { value: 'source.ip' },
    });
    fireEvent.change(within(screen.getByTestId('sourcePortField')).getByTestId('input'), {
      target: { value: 'source.port' },
    });
    fireEvent.change(within(screen.getByTestId('targetField')).getByTestId('input'), {
      target: { value: 'target_field' },
    });
    fireEvent.change(within(screen.getByTestId('destinationIpField')).getByTestId('input'), {
      target: { value: 'destination.ip' },
    });
    fireEvent.change(within(screen.getByTestId('destinationPortField')).getByTestId('input'), {
      target: { value: 'destination.port' },
    });
    fireEvent.change(within(screen.getByTestId('icmpTypeField')).getByTestId('input'), {
      target: { value: 'icmp_type' },
    });
    fireEvent.change(within(screen.getByTestId('icmpCodeField')).getByTestId('input'), {
      target: { value: 'icmp_code' },
    });
    fireEvent.change(within(screen.getByTestId('ianaField')).getByTestId('input'), {
      target: { value: 'iana' },
    });
    fireEvent.change(within(screen.getByTestId('seedField')).getByTestId('input'), {
      target: { value: '10' },
    });

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0][COMMUNITY_ID_TYPE]).toEqual({
      ignore_failure: true,
      ignore_missing: false,
      target_field: 'target_field',
      source_ip: 'source.ip',
      source_port: 'source.port',
      destination_ip: 'destination.ip',
      destination_port: 'destination.port',
      icmp_type: 'icmp_type',
      icmp_code: 'icmp_code',
      iana_number: 'iana',
      seed: 10,
    });
  });

  test('should not add a processor if the seedField is smaller than min_value', async () => {
    fireEvent.change(within(screen.getByTestId('seedField')).getByTestId('input'), {
      target: { value: '-1' },
    });

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);

    expect(processors).toHaveLength(0);
  });

  test('should not add a processor if the seedField is bigger than max_value', async () => {
    fireEvent.change(within(screen.getByTestId('seedField')).getByTestId('input'), {
      target: { value: '65536' },
    });

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);

    expect(processors).toHaveLength(0);
  });

  test('should not add a processor if the seedField is not an integer', async () => {
    fireEvent.change(within(screen.getByTestId('seedField')).getByTestId('input'), {
      target: { value: '10.2' },
    });

    // Save the field with new changes
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);

    expect(processors).toHaveLength(0);
  });
});
