/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const INFERENCE_TYPE = 'inference';

describe('Processor: Inference', () => {
  let onUpdate: jest.Mock;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  const getToggleInput = () => screen.getByTestId('toggleInferenceInputMappingMode');

  const expectToggleOn = () => {
    expect(getToggleInput()).toHaveAttribute('aria-checked', 'true');
  };

  const expectToggleOff = () => {
    expect(getToggleInput()).toHaveAttribute('aria-checked', 'false');
  };

  const switchToTargetFieldAndFieldMapMode = () => {
    fireEvent.click(screen.getByTestId('toggleInferenceInputMappingMode'));
  };

  describe('add inference processor', () => {
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
        target: { value: INFERENCE_TYPE },
      });

      await screen.findByTestId('addProcessorForm');
    });

    test('prevents form submission if required fields are not provided', async () => {
      // Click submit button with only the type defined
      // Expect form error as "field" is a required parameter
      fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
      expect(
        await screen.findByText('A deployment, an inference, or a model ID value is required.')
      ).toBeInTheDocument();
    });

    test('accepts inference config and field maps that contains escaped characters', async () => {
      switchToTargetFieldAndFieldMapMode();
      fireEvent.change(within(screen.getByTestId('inferenceModelId')).getByTestId('input'), {
        target: { value: 'test_inference_processor' },
      });
      fireEvent.change(screen.getByTestId('inferenceConfig'), {
        target: { value: '{"inf_conf_1":"""aaa"bbb""", "inf_conf_2": "aaa(bbb"}' },
      });
      fireEvent.change(screen.getByTestId('fieldMap'), {
        target: { value: '{"field_map_1":"""aaa"bbb""", "field_map_2": "aaa(bbb"}' },
      });

      // Save the field
      fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
      await waitFor(() => expect(onUpdate).toHaveBeenCalled());

      const processors = getProcessorValue(onUpdate);

      expect(processors[0][INFERENCE_TYPE]).toEqual({
        model_id: 'test_inference_processor',

        inference_config: { inf_conf_1: 'aaa"bbb', inf_conf_2: 'aaa(bbb' },

        field_map: { field_map_1: 'aaa"bbb', field_map_2: 'aaa(bbb' },
      });
    });

    test('accepts input_output and strips field_map and target_field', async () => {
      fireEvent.change(within(screen.getByTestId('inferenceModelId')).getByTestId('input'), {
        target: { value: 'test_inference_processor' },
      });

      fireEvent.change(screen.getByTestId('inputOutput'), {
        target: {
          value:
            '[{"input_field":"content","output_field":"content_embedding","notes":"""aaa"bbb"""}]',
        },
      });

      // Save the field
      fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
      await waitFor(() => expect(onUpdate).toHaveBeenCalled());

      const processors = getProcessorValue(onUpdate);

      expect(processors[0][INFERENCE_TYPE]).toEqual({
        model_id: 'test_inference_processor',
        input_output: [
          { input_field: 'content', output_field: 'content_embedding', notes: 'aaa"bbb' },
        ],
      });
    });

    test('rejects input_output when it is not a JSON array', async () => {
      fireEvent.change(within(screen.getByTestId('inferenceModelId')).getByTestId('input'), {
        target: { value: 'test_inference_processor' },
      });

      fireEvent.change(screen.getByTestId('inputOutput'), {
        target: {
          value:
            '{"input_field":"content","output_field":"content_embedding","notes":"""aaa"bbb"""}',
        },
      });

      // Save the field
      fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
      expect(await screen.findByText('Input/output must be a JSON array.')).toBeInTheDocument();
    });

    test('keeps input/output and target field + field map mutually exclusive when switching modes', async () => {
      fireEvent.change(within(screen.getByTestId('inferenceModelId')).getByTestId('input'), {
        target: { value: 'test_inference_processor' },
      });

      // Switch to target field & field map mode (toggle on)
      fireEvent.click(getToggleInput());

      fireEvent.change(within(screen.getByTestId('targetField')).getByTestId('input'), {
        target: { value: 'ml.inference.my_tag' },
      });

      fireEvent.change(screen.getByTestId('fieldMap'), {
        target: { value: '{"field_map_1":"value_1"}' },
      });

      // Switch to input/output mode (toggle off) and set input_output
      fireEvent.click(getToggleInput());
      fireEvent.change(screen.getByTestId('inputOutput'), {
        target: { value: '[{"input_field":"content","output_field":"content_embedding"}]' },
      });

      fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
      await waitFor(() => expect(onUpdate).toHaveBeenCalled());

      const processors = getProcessorValue(onUpdate);

      expect(processors[0][INFERENCE_TYPE]).toEqual({
        model_id: 'test_inference_processor',
        input_output: [{ input_field: 'content', output_field: 'content_embedding' }],
      });
    });

    test('clears target_field when switching back to input/output mode', async () => {
      fireEvent.change(within(screen.getByTestId('inferenceModelId')).getByTestId('input'), {
        target: { value: 'test_inference_processor' },
      });

      // Switch to target field & field map mode (toggle on)
      fireEvent.click(getToggleInput());
      fireEvent.change(within(screen.getByTestId('targetField')).getByTestId('input'), {
        target: { value: 'ml.inference.my_tag' },
      });

      // Switch back to input/output mode (toggle off) => should clear target_field
      fireEvent.click(getToggleInput());

      // Switch again to field map mode and verify the input is empty (cleared)
      fireEvent.click(getToggleInput());
      expect(within(screen.getByTestId('targetField')).getByTestId('input')).toHaveValue('');
    });

    test('strips input_output when switching to target_field + field_map mode', async () => {
      fireEvent.change(within(screen.getByTestId('inferenceModelId')).getByTestId('input'), {
        target: { value: 'test_inference_processor' },
      });

      fireEvent.change(screen.getByTestId('inputOutput'), {
        target: {
          value: '[{"input_field":"content","output_field":"content_embedding"}]',
        },
      });

      // Switch to target field & field map mode (toggle on). Should clear input_output.
      fireEvent.click(getToggleInput());

      fireEvent.change(within(screen.getByTestId('targetField')).getByTestId('input'), {
        target: { value: 'ml.inference.my_tag' },
      });

      fireEvent.change(screen.getByTestId('fieldMap'), {
        target: { value: '{"field_map_1":"value_1"}' },
      });

      fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
      await waitFor(() => expect(onUpdate).toHaveBeenCalled());

      const processors = getProcessorValue(onUpdate);

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
      renderProcessorEditor(httpSetup, {
        value: {
          processors: [
            {
              [INFERENCE_TYPE]: {
                model_id: 'saved_processor_no_mapping',
              },
            },
          ],
        },
        onFlyoutOpen: jest.fn(),
        onUpdate,
      });

      fireEvent.click(within(screen.getByTestId('processors>0')).getByTestId('manageItemButton'));
      expect(await screen.findByTestId('editProcessorForm')).toBeInTheDocument();

      expectToggleOff();
      expect(screen.getByTestId('inputOutput')).toBeVisible();
      expect(screen.queryByTestId('targetField')).toBeNull();
      expect(screen.queryByTestId('fieldMap')).toBeNull();
    });

    test('defaults to target_field + field_map mode for a saved processor with target_field/field_map', async () => {
      renderProcessorEditor(httpSetup, {
        value: {
          processors: [
            {
              [INFERENCE_TYPE]: {
                model_id: 'saved_processor_field_map_mode',
                target_field: 'ml.inference.my_tag',
                field_map: {
                  source: 'some_field',
                },
              },
            },
          ],
        },
        onFlyoutOpen: jest.fn(),
        onUpdate,
      });

      fireEvent.click(within(screen.getByTestId('processors>0')).getByTestId('manageItemButton'));
      expect(await screen.findByTestId('editProcessorForm')).toBeInTheDocument();

      await waitFor(() => expectToggleOn());
      expect(screen.getByTestId('targetField')).toBeVisible();
      expect(screen.getByTestId('fieldMap')).toBeVisible();
      expect(screen.queryByTestId('inputOutput')).toBeNull();
    });

    test('defaults to input/output mode for a saved processor with input_output', async () => {
      renderProcessorEditor(httpSetup, {
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

      fireEvent.click(within(screen.getByTestId('processors>0')).getByTestId('manageItemButton'));
      expect(await screen.findByTestId('editProcessorForm')).toBeInTheDocument();

      expectToggleOff();
      expect(screen.getByTestId('inputOutput')).toBeVisible();
      expect(screen.queryByTestId('targetField')).toBeNull();
      expect(screen.queryByTestId('fieldMap')).toBeNull();
    });

    test('shows field_map mode but blocks saving when field_map is an array string', async () => {
      renderProcessorEditor(httpSetup, {
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

      fireEvent.click(within(screen.getByTestId('processors>0')).getByTestId('manageItemButton'));
      expect(await screen.findByTestId('editProcessorForm')).toBeInTheDocument();

      await waitFor(() => expectToggleOn());
      expect(screen.getByTestId('fieldMap')).toBeVisible();
      expect(screen.queryByTestId('inputOutput')).toBeNull();

      const processorsBefore = getProcessorValue(onUpdate);

      fireEvent.click(within(screen.getByTestId('editProcessorForm')).getByTestId('submitButton'));
      expect(await screen.findByText('Field map must be a JSON object.')).toBeInTheDocument();

      const processorsAfter = getProcessorValue(onUpdate);
      expect(processorsAfter).toEqual(processorsBefore);
    });

    test('sanitizes a saved processor that has both input_output and target_field/field_map', async () => {
      renderProcessorEditor(httpSetup, {
        value: {
          processors: [
            {
              [INFERENCE_TYPE]: {
                model_id: 'saved_processor_both_configs',
                // Both configured (backend rejects this)
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

      fireEvent.click(within(screen.getByTestId('processors>0')).getByTestId('manageItemButton'));
      expect(await screen.findByTestId('editProcessorForm')).toBeInTheDocument();

      // Prefer field_map mode when target_field/field_map exist.
      await waitFor(() => expectToggleOn());
      expect(screen.getByTestId('targetField')).toBeVisible();
      expect(screen.getByTestId('fieldMap')).toBeVisible();
      expect(screen.queryByTestId('inputOutput')).toBeNull();

      fireEvent.click(within(screen.getByTestId('editProcessorForm')).getByTestId('submitButton'));
      await waitFor(() => expect(onUpdate).toHaveBeenCalled());

      const processors = getProcessorValue(onUpdate);
      expect(processors[0][INFERENCE_TYPE]).toMatchObject({
        model_id: 'saved_processor_both_configs',
        target_field: 'ml.inference.my_tag',
        field_map: { source: 'some_field' },
      });
      expect('input_output' in processors[0][INFERENCE_TYPE]).toBe(false);
    });
  });
});
