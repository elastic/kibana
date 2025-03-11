/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const ATTACHMENT_TYPE = 'attachment';

describe('Processor: Attachment', () => {
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

    const { component, actions } = testBed;

    component.update();

    // Open flyout to add new processor
    actions.addProcessor();
    // Add type (the other fields are not visible until a type is selected)
    await actions.addProcessorType(ATTACHMENT_TYPE);
  });

  test('prevents form submission if required fields are not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "field" is a required parameter
    expect(form.getErrorsMessages()).toEqual([
      'A field value is required.', // "Field" input
    ]);
  });

  test('saves with default parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add "field" value
    form.setInputValue('fieldNameField.input', 'test_attachment_processor');

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, ATTACHMENT_TYPE);

    expect(processors[0][ATTACHMENT_TYPE]).toEqual({
      field: 'test_attachment_processor',
    });
  });

  test('saves with optional parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
      component,
    } = testBed;

    // Add required fields
    form.setInputValue('fieldNameField.input', 'test_attachment_processor');

    // Add optional fields
    form.setInputValue('targetField.input', 'test_target');
    form.setInputValue('indexedCharsField.input', '123456');
    form.setInputValue('indexedCharsFieldField.input', 'indexed_chars_field');
    form.toggleEuiSwitch('removeBinaryField.input');
    form.setInputValue('resourceNameField.input', 'resource_name_field');

    // Add "networkDirectionField" value (required)
    await act(async () => {
      find('propertiesField').simulate('change', [{ label: 'content' }]);
    });
    component.update();

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, ATTACHMENT_TYPE);

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
