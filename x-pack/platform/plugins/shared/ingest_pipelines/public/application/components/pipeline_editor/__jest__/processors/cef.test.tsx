
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import type { SetupResult } from './processor.helpers';
import { getProcessorValue, setup, setupEnvironment } from './processor.helpers';

const CEF_TYPE = 'cef';

describe('Processor: CEF', () => {
  let onUpdate: jest.Mock;
  let testBed: SetupResult;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('add CEF processor', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      ({ httpSetup } = setupEnvironment());
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
      await testBed.actions.addProcessorType(CEF_TYPE);
    });

    test('prevents form submission if required fields are not provided', async () => {
      const {
        actions: { saveNewProcessor },
        form,
      } = testBed;

      // Click submit button with only the type defined
      await saveNewProcessor();

      // Expect form error as "field" is a required parameter
      expect(form.getErrorsMessages()).toEqual(['A field value is required.']);
    });

    test('saves with required parameter values', async () => {
      const {
        actions: { saveNewProcessor },
        form,
      } = testBed;

      // Add "field" value (required)
      form.setInputValue('fieldNameField.input', 'message');

      // Save the processor
      await saveNewProcessor();

      const processors = getProcessorValue(onUpdate, CEF_TYPE);
      expect(processors[0][CEF_TYPE]).toEqual({
        field: 'message',
      });
    });

    test('allows optional parameters to be set', async () => {
      const {
        actions: { saveNewProcessor },
        form,
      } = testBed;

      // Add "field" value (required)
      form.setInputValue('fieldNameField.input', 'message');

      // Set optional parameters
      form.setInputValue('targetField.input', 'event');
      form.setInputValue('timezoneField.input', 'Europe/Madrid');

      // ignore_empty_values defaults to true; toggling sets it to false
      form.toggleEuiSwitch('ignoreEmptyValuesSwitch.input');
      // ignore_missing defaults to false; toggling sets it to true
      form.toggleEuiSwitch('ignoreMissingSwitch.input');

      // Save the processor
      await saveNewProcessor();

      const processors = getProcessorValue(onUpdate, CEF_TYPE);
      expect(processors[0][CEF_TYPE]).toEqual({
        field: 'message',
        target_field: 'event',
        timezone: 'Europe/Madrid',
        ignore_empty_values: false,
        ignore_missing: true,
      });
    });
  });

  describe('edit saved CEF processor defaults', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      ({ httpSetup } = setupEnvironment());
      onUpdate = jest.fn();
    });

    test('clearing target_field and resetting ignore_empty_values removes both keys on save', async () => {
      await act(async () => {
        testBed = await setup(httpSetup, {
          value: {
            processors: [
              {
                [CEF_TYPE]: {
                  field: 'message',
                  target_field: 'event',
                  ignore_empty_values: false,
                },
              },
            ],
          },
          onFlyoutOpen: jest.fn(),
          onUpdate,
        });
      });

      const { component, find, form } = testBed;
      component.update();

      await act(async () => {
        find('processors>0.manageItemButton').simulate('click');
      });
      component.update();

      // Clear target_field
      form.setInputValue('targetField.input', '');
      // ignore_empty_values defaults to true; saved value is false, so toggle back to true.
      form.toggleEuiSwitch('ignoreEmptyValuesSwitch.input');

      await act(async () => {
        find('editProcessorForm.submitButton').simulate('click');
        jest.advanceTimersByTime(0); // allow the form to validate + submit
      });
      component.update();

      const processors = getProcessorValue(onUpdate, CEF_TYPE);
      const cef = processors[0][CEF_TYPE];

      expect(JSON.stringify(cef)).toBe(JSON.stringify({ field: 'message' }));
      expect(JSON.stringify(cef)).not.toContain('target_field');
      expect(JSON.stringify(cef)).not.toContain('ignore_empty_values');
    });
  });
});
