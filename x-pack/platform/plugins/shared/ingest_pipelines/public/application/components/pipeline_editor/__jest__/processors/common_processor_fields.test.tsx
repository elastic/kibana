/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const BYTES_TYPE = 'bytes';

describe('Processor: Common Fields For All Processors', () => {
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
  });

  test('prevents form submission if required type field is not provided', async () => {
    // Open flyout to add new processor
    fireEvent.click(screen.getByTestId('addProcessorButton'));
    const form = await screen.findByTestId('addProcessorForm');
    // Click submit button without entering any fields
    fireEvent.click(within(form).getByTestId('submitButton'));

    // Expect form error as a processor type is required
    expect(await screen.findByText('A type is required.')).toBeInTheDocument();
  });

  test('saves with common fields set', async () => {
    // This test ensures that the common fields that are used across all processors
    // works and removes the need for those fields to be in every processors' test.

    // Open flyout to add new processor
    fireEvent.click(screen.getByTestId('addProcessorButton'));
    fireEvent.change(within(screen.getByTestId('processorTypeSelector')).getByTestId('input'), {
      target: { value: BYTES_TYPE },
    });

    const addProcessorForm = await screen.findByTestId('addProcessorForm');
    // Add "field" value (required)
    fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
      target: { value: 'field_1' },
    });
    fireEvent.click(within(screen.getByTestId('ignoreFailureSwitch')).getByTestId('input'));
    fireEvent.change(within(screen.getByTestId('tagField')).getByTestId('input'), {
      target: { value: 'some_tag' },
    });

    // Edit the Code Editor
    const jsonContent = JSON.stringify({ content: "ctx?.network?.name == 'Guest'" });
    fireEvent.change(screen.getByTestId('mockedCodeEditor'), { target: { value: jsonContent } });

    // Save the field
    fireEvent.click(within(addProcessorForm).getByTestId('submitButton'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const processors = getProcessorValue(onUpdate);
    expect(processors[0].bytes).toEqual({
      field: 'field_1',
      ignore_failure: true,
      if: jsonContent,
      tag: 'some_tag',
      ignore_missing: undefined,
    });
  });
});

describe('Processor: Common Fields with a script object condition', () => {
  const ifScript = {
    source: "ctx['_dataId'] == params.dataId",
    lang: 'painless',
    params: { dataId: 'data-abc-123' },
  };
  const UPDATED_TAG = 'updated_tag';

  let onUpdate: jest.Mock;

  const renderWithCondition = (condition: Record<string, unknown>) => {
    const { httpSetup } = setupEnvironment();
    renderProcessorEditor(httpSetup, {
      value: {
        processors: [{ [BYTES_TYPE]: { field: 'field_1', if: condition } }],
      },
      onFlyoutOpen: jest.fn(),
      onUpdate,
    });
  };

  const openEditForm = async () => {
    fireEvent.click(within(screen.getByTestId('processors>0')).getByTestId('manageItemButton'));
    const form = await screen.findByTestId('editProcessorForm');
    return { form, conditionEditor: within(form).getByTestId('mockedCodeEditor') };
  };

  const setTag = (form: HTMLElement) => {
    fireEvent.change(within(within(form).getByTestId('tagField')).getByTestId('input'), {
      target: { value: UPDATED_TAG },
    });
  };

  const submitAndGetBytesProcessor = async (form: HTMLElement) => {
    fireEvent.click(within(form).getByTestId('submitButton'));
    await waitFor(() => expect(screen.queryByTestId('editProcessorForm')).not.toBeInTheDocument());
    return getProcessorValue(onUpdate)[0].bytes;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    onUpdate = jest.fn();
  });

  test('renders the script source in the condition editor', async () => {
    renderWithCondition(ifScript);
    const { conditionEditor } = await openEditForm();

    expect(conditionEditor).toHaveValue(ifScript.source);
  });

  test('preserves the script object when the condition is not edited', async () => {
    renderWithCondition(ifScript);
    const { form } = await openEditForm();

    setTag(form);
    const bytesProcessor = await submitAndGetBytesProcessor(form);

    expect(bytesProcessor.tag).toBe(UPDATED_TAG);
    expect(bytesProcessor.if).toEqual(ifScript);
  });

  test('updates only the script source when the condition is edited', async () => {
    renderWithCondition(ifScript);
    const { form, conditionEditor } = await openEditForm();
    const updatedSource = "ctx['_dataId'] != params.dataId";

    fireEvent.change(conditionEditor, { target: { value: updatedSource } });
    const bytesProcessor = await submitAndGetBytesProcessor(form);

    expect(bytesProcessor.if).toEqual({ ...ifScript, source: updatedSource });
  });

  test('removes the condition when the editor is cleared', async () => {
    renderWithCondition(ifScript);
    const { form, conditionEditor } = await openEditForm();

    fireEvent.change(conditionEditor, { target: { value: '' } });
    const bytesProcessor = await submitAndGetBytesProcessor(form);

    expect(bytesProcessor.if).toBeUndefined();
  });

  test('preserves a stored script reference that has no source', async () => {
    const storedScript = { id: 'my_stored_condition' };
    renderWithCondition(storedScript);
    const { form, conditionEditor } = await openEditForm();
    expect(conditionEditor).toHaveValue('');

    setTag(form);
    const bytesProcessor = await submitAndGetBytesProcessor(form);

    expect(bytesProcessor.tag).toBe(UPDATED_TAG);
    expect(bytesProcessor.if).toEqual(storedScript);
  });
});
