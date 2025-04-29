/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const PIPELINE_TYPE = 'pipeline';

describe('Processor: Pipeline', () => {
  let onUpdate: jest.Mock;
  let testBed: SetupResult;

  const { httpSetup } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    onUpdate = jest.fn();

    await act(async () => {
      testBed = await setup(httpSetup, {
        value: {
          processors: [],
        },
        onFlyoutOpen: jest.fn(),
        onUpdate,
      });
    });
    testBed.component.update();
    const {
      actions: { addProcessor, addProcessorType },
    } = testBed;
    // Open the processor flyout
    addProcessor();

    // Add type (the other fields are not visible until a type is selected)
    await addProcessorType(PIPELINE_TYPE);
  });

  test('prevents form submission if required fields are not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "name" is a required parameter
    expect(form.getErrorsMessages()).toEqual(['A value is required.']);
  });

  test('saves with required parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Set pipeline name (required)
    form.setInputValue('pipelineNameField.input', 'my-pipeline');

    // Save the processor
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, PIPELINE_TYPE);
    expect(processors[0][PIPELINE_TYPE]).toEqual({
      name: 'my-pipeline',
    });
  });

  test('allows optional parameters to be set', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Set pipeline name (required)
    form.setInputValue('pipelineNameField.input', 'my-pipeline');

    // Set optional parameters
    form.toggleEuiSwitch('ignoreMissingPipelineSwitch.input');

    // Save the processor
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, PIPELINE_TYPE);
    expect(processors[0][PIPELINE_TYPE]).toEqual({
      name: 'my-pipeline',
      ignore_missing_pipeline: true,
    });
  });
});
