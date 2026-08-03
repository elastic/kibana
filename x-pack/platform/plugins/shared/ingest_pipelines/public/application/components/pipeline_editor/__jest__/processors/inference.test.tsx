/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import type { SetupResult } from './processor.helpers';
import { setup, getProcessorValue, setupEnvironment } from './processor.helpers';

const INFERENCE_TYPE = 'inference';

describe('Processor: Inference', () => {
  let onUpdate: jest.Mock;
  let testBed: SetupResult;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    // disable all react-beautiful-dnd development warnings
    (window as any)['__@hello-pangea/dnd-disable-dev-warnings'] = true;
  });

  afterAll(() => {
    jest.useRealTimers();
    // enable all react-beautiful-dnd development warnings
    (window as any)['__@hello-pangea/dnd-disable-dev-warnings'] = false;
  });

  describe('add inference processor', () => {
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

      const { component, actions } = testBed;
      component.update();

      // Open flyout to add new processor
      actions.addProcessor();
      // Add type (the other fields are not visible until a type is selected)
      await actions.addProcessorType(INFERENCE_TYPE);
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
        'A deployment, an inference, or a model ID value is required.',
      ]);
    });

    test('accepts inference config and field maps that contains escaped characters', async () => {
      const {
        actions: { saveNewProcessor },
        find,
        form,
        component,
      } = testBed;

      // Switch to target field & field map mode
      act(() => {
        find('toggleInferenceInputMappingMode').simulate('click');
      });
      component.update();

      form.setInputValue('inferenceModelId.input', 'test_inference_processor');

      await act(async () => {
        find('inferenceConfig').simulate('change', {
          jsonContent: '{"inf_conf_1":"""aaa"bbb""", "inf_conf_2": "aaa(bbb"}',
        });
        jest.advanceTimersByTime(0);
      });
      component.update();

      await act(async () => {
        find('fieldMap').simulate('change', {
          jsonContent: '{"field_map_1":"""aaa"bbb""", "field_map_2": "aaa(bbb"}',
        });
        jest.advanceTimersByTime(0);
      });
      component.update();

      await saveNewProcessor();

      const processors = getProcessorValue(onUpdate, INFERENCE_TYPE);

      expect(processors[0][INFERENCE_TYPE]).toEqual({
        model_id: 'test_inference_processor',
        // eslint-disable-next-line prettier/prettier
        inference_config: { inf_conf_1: 'aaa\"bbb', inf_conf_2: 'aaa(bbb' },
        // eslint-disable-next-line prettier/prettier
        field_map: { field_map_1: 'aaa\"bbb', field_map_2: 'aaa(bbb' },
      });
    });

    test('accepts input_output and strips field_map and target_field', async () => {
      const {
        actions: { saveNewProcessor },
        find,
        form,
        component,
      } = testBed;

      form.setInputValue('inferenceModelId.input', 'test_inference_processor');

      await act(async () => {
        find('inputOutput').simulate('change', {
          jsonContent:
            '[{"input_field":"content","output_field":"content_embedding","notes":"""aaa"bbb"""}]',
        });
        jest.advanceTimersByTime(0);
      });
      component.update();

      await saveNewProcessor();

      const processors = getProcessorValue(onUpdate, INFERENCE_TYPE);

      expect(processors[0][INFERENCE_TYPE]).toEqual({
        model_id: 'test_inference_processor',
        input_output: [
          // eslint-disable-next-line prettier/prettier
          { input_field: 'content', output_field: 'content_embedding', notes: 'aaa\"bbb' },
        ],
      });
    });

    test('rejects input_output when it is not a JSON array', async () => {
      const { find, form, component } = testBed;

      form.setInputValue('inferenceModelId.input', 'test_inference_processor');

      await act(async () => {
        find('inputOutput').simulate('change', {
          jsonContent:
            '{"input_field":"content","output_field":"content_embedding","notes":"""aaa"bbb"""}',
        });
        jest.advanceTimersByTime(0);
      });
      component.update();

      await act(async () => {
        find('addProcessorForm.submitButton').simulate('click');
        jest.runAllTimers();
      });
      component.update();

      expect(form.getErrorsMessages()).toEqual(['Input/output must be a JSON array.']);
    });

    test('keeps input/output and target field + field map mutually exclusive when switching modes', async () => {
      const {
        actions: { saveNewProcessor },
        find,
        form,
        component,
      } = testBed;

      form.setInputValue('inferenceModelId.input', 'test_inference_processor');

      // Switch to target field & field map mode
      act(() => {
        find('toggleInferenceInputMappingMode').simulate('click');
      });
      component.update();

      form.setInputValue('targetField.input', 'ml.inference.my_tag');

      await act(async () => {
        find('fieldMap').simulate('change', { jsonContent: '{"field_map_1":"value_1"}' });
        jest.advanceTimersByTime(0);
      });
      component.update();

      // Switch back to input/output mode
      act(() => {
        find('toggleInferenceInputMappingMode').simulate('click');
      });
      component.update();

      await act(async () => {
        find('inputOutput').simulate('change', {
          jsonContent: '[{"input_field":"content","output_field":"content_embedding"}]',
        });
        jest.advanceTimersByTime(0);
      });
      component.update();

      await saveNewProcessor();

      const processors = getProcessorValue(onUpdate, INFERENCE_TYPE);

      expect(processors[0][INFERENCE_TYPE]).toEqual({
        model_id: 'test_inference_processor',
        input_output: [{ input_field: 'content', output_field: 'content_embedding' }],
      });
    });

    test('clears target_field when switching back to input/output mode', async () => {
      const { find, form, component } = testBed;

      form.setInputValue('inferenceModelId.input', 'test_inference_processor');

      // Switch to target field & field map mode
      act(() => {
        find('toggleInferenceInputMappingMode').simulate('click');
      });
      component.update();

      form.setInputValue('targetField.input', 'ml.inference.my_tag');

      // Switch back to input/output mode => should clear target_field
      act(() => {
        find('toggleInferenceInputMappingMode').simulate('click');
      });
      component.update();

      // Switch again to field map mode and verify the input is empty (cleared)
      act(() => {
        find('toggleInferenceInputMappingMode').simulate('click');
      });
      component.update();

      expect(find('targetField.input').props().value).toBe('');
    });

    test('strips input_output when switching to target_field + field_map mode', async () => {
      const {
        actions: { saveNewProcessor },
        find,
        form,
        component,
      } = testBed;

      form.setInputValue('inferenceModelId.input', 'test_inference_processor');

      await act(async () => {
        find('inputOutput').simulate('change', {
          jsonContent: '[{"input_field":"content","output_field":"content_embedding"}]',
        });
        jest.advanceTimersByTime(0);
      });
      component.update();

      // Switch to target field & field map mode — should clear input_output
      act(() => {
        find('toggleInferenceInputMappingMode').simulate('click');
      });
      component.update();

      form.setInputValue('targetField.input', 'ml.inference.my_tag');

      await act(async () => {
        find('fieldMap').simulate('change', { jsonContent: '{"field_map_1":"value_1"}' });
        jest.advanceTimersByTime(0);
      });
      component.update();

      await saveNewProcessor();

      const processors = getProcessorValue(onUpdate, INFERENCE_TYPE);

      expect(processors[0][INFERENCE_TYPE]).toEqual({
        model_id: 'test_inference_processor',
        target_field: 'ml.inference.my_tag',
        field_map: { field_map_1: 'value_1' },
      });
    });
  });

  describe('edit saved inference processor defaults', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      ({ httpSetup } = setupEnvironment());
      onUpdate = jest.fn();
    });

    test('defaults to input/output mode for a saved processor with neither input_output nor target_field/field_map', async () => {
      await act(async () => {
        testBed = await setup(httpSetup, {
          value: {
            processors: [{ [INFERENCE_TYPE]: { model_id: 'saved_processor_no_mapping' } }],
          },
          onFlyoutOpen: jest.fn(),
          onUpdate,
        });
      });
      const { component, find } = testBed;
      component.update();

      await act(async () => {
        find('processors>0.manageItemButton').simulate('click');
      });
      component.update();

      expect(find('toggleInferenceInputMappingMode').prop('aria-checked')).toBe(false);
      expect(find('inputOutput').exists()).toBe(true);
      expect(find('targetField').exists()).toBe(false);
      expect(find('fieldMap').exists()).toBe(false);
    });

    test('defaults to target_field + field_map mode for a saved processor with target_field/field_map', async () => {
      await act(async () => {
        testBed = await setup(httpSetup, {
          value: {
            processors: [
              {
                [INFERENCE_TYPE]: {
                  model_id: 'saved_processor_field_map_mode',
                  target_field: 'ml.inference.my_tag',
                  field_map: { source: 'some_field' },
                },
              },
            ],
          },
          onFlyoutOpen: jest.fn(),
          onUpdate,
        });
      });
      const { component, find } = testBed;
      component.update();

      await act(async () => {
        find('processors>0.manageItemButton').simulate('click');
      });
      component.update();

      expect(find('toggleInferenceInputMappingMode').prop('aria-checked')).toBe(true);
      expect(find('targetField').exists()).toBe(true);
      expect(find('fieldMap').exists()).toBe(true);
      expect(find('inputOutput').exists()).toBe(false);
    });

    test('defaults to input/output mode for a saved processor with input_output', async () => {
      await act(async () => {
        testBed = await setup(httpSetup, {
          value: {
            processors: [
              {
                [INFERENCE_TYPE]: {
                  model_id: 'saved_processor_input_output_mode',
                  input_output: [{ input_field: 'content', output_field: 'content_embedding' }],
                },
              },
            ],
          },
          onFlyoutOpen: jest.fn(),
          onUpdate,
        });
      });
      const { component, find } = testBed;
      component.update();

      await act(async () => {
        find('processors>0.manageItemButton').simulate('click');
      });
      component.update();

      expect(find('toggleInferenceInputMappingMode').prop('aria-checked')).toBe(false);
      expect(find('inputOutput').exists()).toBe(true);
      expect(find('targetField').exists()).toBe(false);
      expect(find('fieldMap').exists()).toBe(false);
    });

    test('shows field_map mode but blocks saving when field_map is an array string', async () => {
      await act(async () => {
        testBed = await setup(httpSetup, {
          value: {
            processors: [
              {
                [INFERENCE_TYPE]: {
                  model_id: 'saved_processor_field_map_array_string',
                  field_map: '[]',
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

      expect(find('toggleInferenceInputMappingMode').prop('aria-checked')).toBe(true);
      expect(find('fieldMap').exists()).toBe(true);
      expect(find('inputOutput').exists()).toBe(false);

      await act(async () => {
        find('editProcessorForm.submitButton').simulate('click');
        jest.runAllTimers();
      });
      component.update();

      expect(form.getErrorsMessages()).toEqual(['Field map must be a JSON object.']);
    });

    test('sanitizes a saved processor that has both input_output and target_field/field_map', async () => {
      await act(async () => {
        testBed = await setup(httpSetup, {
          value: {
            processors: [
              {
                [INFERENCE_TYPE]: {
                  model_id: 'saved_processor_both_configs',
                  input_output: [{ input_field: 'content', output_field: 'content_embedding' }],
                  target_field: 'ml.inference.my_tag',
                  field_map: { source: 'some_field' },
                },
              },
            ],
          },
          onFlyoutOpen: jest.fn(),
          onUpdate,
        });
      });
      const { component, find } = testBed;
      component.update();

      await act(async () => {
        find('processors>0.manageItemButton').simulate('click');
      });
      component.update();

      // Prefer field_map mode when target_field/field_map exist
      expect(find('toggleInferenceInputMappingMode').prop('aria-checked')).toBe(true);
      expect(find('targetField').exists()).toBe(true);
      expect(find('fieldMap').exists()).toBe(true);
      expect(find('inputOutput').exists()).toBe(false);

      await act(async () => {
        find('editProcessorForm.submitButton').simulate('click');
        jest.advanceTimersByTime(0);
      });
      component.update();

      const processors = getProcessorValue(onUpdate, INFERENCE_TYPE);
      expect(processors[0][INFERENCE_TYPE]).toMatchObject({
        model_id: 'saved_processor_both_configs',
        target_field: 'ml.inference.my_tag',
        field_map: { source: 'some_field' },
      });
      expect('input_output' in processors[0][INFERENCE_TYPE]).toBe(false);
    });
  });
});
