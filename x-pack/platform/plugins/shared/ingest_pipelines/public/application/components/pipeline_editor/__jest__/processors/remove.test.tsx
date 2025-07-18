/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

// Default parameter values automatically added to the remove processor when saved
const defaultRemoveParameters = {
  if: undefined,
  tag: undefined,
  description: undefined,
  ignore_missing: undefined,
  ignore_failure: undefined,
};

const REMOVE_TYPE = 'remove';

describe('Processor: Remove', () => {
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

    // Open flyout to add new processor
    testBed.actions.addProcessor();
    // Add type (the other fields are not visible until a type is selected)
    await testBed.actions.addProcessorType(REMOVE_TYPE);
  });

  test('prevents form submission if required field is not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "field" is required parameter
    expect(form.getErrorsMessages()).toEqual(['A value is required.']);
  });

  test('saves with default parameter value', async () => {
    const {
      actions: { saveNewProcessor },
      find,
      component,
    } = testBed;

    // Add fields to remove
    await act(async () => {
      find('fieldNameField.input').simulate('change', [{ label: 'field_1' }]);
    });
    component.update();

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, REMOVE_TYPE);

    expect(processors[0][REMOVE_TYPE]).toEqual({
      ...defaultRemoveParameters,
      field: 'field_1',
    });
  });

  test('allows to set keep field', async () => {
    const {
      actions: { saveNewProcessor },
      find,
      component,
    } = testBed;

    find('toggleRemoveField').simulate('click');

    // Add fields to keep
    await act(async () => {
      find('fieldNameField.input').simulate('change', [{ label: 'field_1' }]);
    });
    component.update();

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, REMOVE_TYPE);
    expect(processors[0][REMOVE_TYPE]).toEqual({
      ...defaultRemoveParameters,
      keep: 'field_1',
    });
  });
});
