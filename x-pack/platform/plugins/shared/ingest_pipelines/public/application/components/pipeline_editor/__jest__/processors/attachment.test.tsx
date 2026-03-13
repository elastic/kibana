/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const ATTACHMENT_TYPE = 'attachment';

describe('Processor: Attachment', () => {
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
      target: { value: ATTACHMENT_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
    await screen.findByTestId('fieldNameField');
  });

  test('prevents form submission if required fields are not provided', async () => {
    // Click submit button with only the type defined
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    // Expect form error as "field" is a required parameter
    expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
  });

  test('saves with default parameter values', async () => {
    // Add "field" value
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'test_attachment_processor' },
    });

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);

    expect(processors[0][ATTACHMENT_TYPE]).toEqual({
      field: 'test_attachment_processor',
    });
  });

  test('saves with optional parameter values', async () => {
    // Add required fields
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'test_attachment_processor' },
    });

    // Add optional fields
    fireEvent.change(within(screen.getByTestId('targetField')).getByTestId('input'), {
      target: { value: 'test_target' },
    });
    fireEvent.change(within(screen.getByTestId('indexedCharsField')).getByTestId('input'), {
      target: { value: '123456' },
    });
    fireEvent.change(within(screen.getByTestId('indexedCharsFieldField')).getByTestId('input'), {
      target: { value: 'indexed_chars_field' },
    });
    fireEvent.click(within(screen.getByTestId('removeBinaryField')).getByTestId('input'));
    fireEvent.change(within(screen.getByTestId('resourceNameField')).getByTestId('input'), {
      target: { value: 'resource_name_field' },
    });

    fireEvent.change(screen.getByTestId('propertiesField'), { target: { value: 'content' } });

    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);

    expect(processors[0][ATTACHMENT_TYPE]).toEqual({
      field: 'test_attachment_processor',
      target_field: 'test_target',
      properties: ['content'],
      indexed_chars: '123456',
      indexed_chars_field: 'indexed_chars_field',
      remove_binary: true,
      resource_name: 'resource_name_field',
    });
  });
});
