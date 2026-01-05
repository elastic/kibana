/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const FOREACH_TYPE = 'foreach';
type DndWarningWindow = Window & { '__@hello-pangea/dnd-disable-dev-warnings'?: boolean };

describe('Processor: Foreach', () => {
  let onUpdate: jest.Mock;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeAll(() => {
    // disable all react-beautiful-dnd development warnings
    (window as DndWarningWindow)['__@hello-pangea/dnd-disable-dev-warnings'] = true;
  });

  afterAll(() => {
    // enable all react-beautiful-dnd development warnings
    (window as DndWarningWindow)['__@hello-pangea/dnd-disable-dev-warnings'] = false;
  });

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
      target: { value: FOREACH_TYPE },
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
      target: { value: 'test_foreach_processor' },
    });
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate, FOREACH_TYPE);

    expect(processors[0][FOREACH_TYPE]).toEqual({
      field: 'test_foreach_processor',
    });
  });

  test('accepts processor definitions that contains escaped characters', async () => {
    // Add "field" value
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'test_foreach_processor' },
    });
    fireEvent.change(screen.getByTestId('processorField'), {
      target: { value: '{"def_1":"""aaa"bbb""", "def_2":"aaa(bbb"}' },
    });

    // Save the field
    fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate, FOREACH_TYPE);

    expect(processors[0][FOREACH_TYPE]).toEqual({
      field: 'test_foreach_processor',
      // eslint-disable-next-line prettier/prettier
      processor: { def_1: 'aaa\"bbb', def_2: 'aaa(bbb' },
    });
  });
});
