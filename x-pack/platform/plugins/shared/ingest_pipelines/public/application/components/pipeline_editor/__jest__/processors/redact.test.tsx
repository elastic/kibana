/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const REDACT_TYPE = 'redact';

describe('Processor: Redact', () => {
  let onUpdate: jest.Mock;
  let clickAddPattern: () => Promise<void>;
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

    clickAddPattern = async () => {
      const list = screen.getByTestId('droppableList');
      const beforeCount = within(list).queryAllByTestId(/input-\d+/).length;
      fireEvent.click(within(list).getByTestId('addButton'));
      await waitFor(() =>
        expect(within(list).queryAllByTestId(/input-\d+/).length).toBeGreaterThan(beforeCount)
      );
    };

    fireEvent.click(screen.getByTestId('addProcessorButton'));
    fireEvent.change(within(screen.getByTestId('processorTypeSelector')).getByTestId('input'), {
      target: { value: REDACT_TYPE },
    });

    await screen.findByTestId('addProcessorForm');
  });

  test('prevents form submission if required fields are not provided', async () => {
    // Click submit button with only the type defined
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

    // Expect form error as "field" is a required parameter
    expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
    expect(screen.getByText('A value is required.')).toBeInTheDocument();
  });

  test('saves with default parameter values', async () => {
    // Add "field" value
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'test_redact_processor' },
    });

    // Add pattern 1
    const list = screen.getByTestId('droppableList');
    fireEvent.change(within(list).getByTestId('input-0'), { target: { value: 'pattern1' } });

    // Add pattern 2
    await clickAddPattern();
    fireEvent.change(within(list).getByTestId('input-1'), { target: { value: 'pattern2' } });

    // Save the field
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);

    expect(processors[0][REDACT_TYPE]).toEqual({
      field: 'test_redact_processor',
      patterns: ['pattern1', 'pattern2'],
    });
  });

  test('saves with optional parameter values', async () => {
    // Add "field" value
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'test_redact_processor' },
    });

    // Add one pattern to the list
    const list = screen.getByTestId('droppableList');
    fireEvent.change(within(list).getByTestId('input-0'), { target: { value: 'pattern1' } });

    // Set suffix and prefix
    fireEvent.change(within(screen.getByTestId('prefixField')).getByTestId('input'), {
      target: { value: '$' },
    });
    fireEvent.change(within(screen.getByTestId('suffixField')).getByTestId('input'), {
      target: { value: '$' },
    });
    fireEvent.change(screen.getByTestId('patternDefinitionsField'), {
      target: { value: JSON.stringify({ GITHUB_NAME: '@%{USERNAME}' }) },
    });

    // Save the field
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);

    expect(processors[0][REDACT_TYPE]).toEqual({
      field: 'test_redact_processor',
      patterns: ['pattern1'],
      suffix: '$',
      prefix: '$',
      pattern_definitions: { GITHUB_NAME: '@%{USERNAME}' },
    });
  });
  test('accepts pattern definitions that contains escaped characters', async () => {
    // Add "field" value
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'test_redact_processor' },
    });

    // Add one pattern to the list
    const list = screen.getByTestId('droppableList');
    fireEvent.change(within(list).getByTestId('input-0'), { target: { value: 'pattern1' } });
    fireEvent.change(screen.getByTestId('patternDefinitionsField'), {
      target: { value: '{"pattern_1":"""aaa"bbb""", "pattern_2":"aaa(bbb"}' },
    });

    // Save the field
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);

    expect(processors[0][REDACT_TYPE]).toEqual({
      field: 'test_redact_processor',
      patterns: ['pattern1'],

      pattern_definitions: { pattern_1: 'aaa"bbb', pattern_2: 'aaa(bbb' },
    });
  });
});
