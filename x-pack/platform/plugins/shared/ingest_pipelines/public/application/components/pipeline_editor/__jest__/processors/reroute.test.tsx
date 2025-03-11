/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const REROUTE_TYPE = 'reroute';

describe('Processor: Reroute', () => {
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
    await addProcessorType(REROUTE_TYPE);
  });

  test('saves with no parameter values set', async () => {
    const {
      actions: { saveNewProcessor },
    } = testBed;

    // There are no required parameter values

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, REROUTE_TYPE);
    expect(processors[0].reroute).toEqual({});
  });

  test('allows setting Destination parameter', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Set "destination" value
    form.setInputValue('destinationField.input', 'my-destination');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, REROUTE_TYPE);
    expect(processors[0].reroute).toEqual({
      destination: 'my-destination',
    });
  });

  test('allows setting Dataset and Namespace parameters', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
      component,
    } = testBed;

    // Set a "dataset" value
    await act(async () => {
      find('datasetField.input').simulate('change', [{ label: 'nginx' }]);
      component.update();
    });

    // Set a "namespace" value
    await act(async () => {
      find('namespaceField.input').simulate('change', [{ label: 'default' }]);
      component.update();
    });

    // Set "ignore_failure" to true (optional)
    form.toggleEuiSwitch('ignoreFailureSwitch.input');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, REROUTE_TYPE);
    expect(processors[0].reroute).toEqual({
      dataset: ['nginx'],
      namespace: ['default'],
      ignore_failure: true,
    });
  });

  test("doesn't set a Destination parameter when Dataset or Namespace is set", async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
      component,
    } = testBed;

    // Set "destination" value
    form.setInputValue('destinationField.input', 'my-destination');

    // Set a "dataset" value
    await act(async () => {
      find('datasetField.input').simulate('change', [{ label: 'nginx' }]);
      component.update();
    });

    // Set a "namespace" value
    await act(async () => {
      find('namespaceField.input').simulate('change', [{ label: 'default' }]);
      component.update();
    });

    // Save the field with new changes
    await saveNewProcessor();

    // Verify that the "destination" parameter is set to '' (which is mapped to undefined) because "dataset" and "namespace" parameters are set
    const processors = getProcessorValue(onUpdate, REROUTE_TYPE);
    expect(processors[0].reroute).toEqual({
      destination: undefined,
      dataset: ['nginx'],
      namespace: ['default'],
    });
  });
});
