/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { setup, setupEnvironment } from './pipeline_processors_editor.helpers';
import type { Pipeline } from '../../../../../common/types';
import {
  extractProcessorDetails,
  getProcessorTypesAndLabels,
  groupProcessorsByCategory,
} from '../components/processor_form/processors/common_fields/processor_type_field';
import { mapProcessorTypeToDescriptor } from '../components/shared/map_processor_type_to_form';

const getByTestSubjectSelector = (selector: string) => {
  const parts = selector.split('.');
  const [root, ...rest] = parts;
  let element = screen.getByTestId(root);

  for (const part of rest) {
    element = within(element).getByTestId(part);
  }

  return element;
};

const testProcessors: Pick<Pipeline, 'processors'> = {
  processors: [
    {
      script: {
        source: 'ctx._type = null',
        description: 'my script',
      },
    },
    {
      gsub: {
        field: '_index',
        pattern: '(.monitoring-\\w+-)6(-.+)',
        replacement: '$17$2',
      },
    },
    {
      set: {
        field: 'test',
        value: 'test',
        unknown_field_foo: 'unknown_value',
      },
    },
  ],
};

describe('Pipeline Editor', () => {
  let onUpdate: jest.Mock;
  let rerenderWithProps: ReturnType<typeof setup>['rerenderWithProps'];

  beforeEach(() => {
    jest.clearAllMocks();
    setupEnvironment();
    onUpdate = jest.fn();
    ({ rerenderWithProps } = setup({
      value: {
        ...testProcessors,
      },
      onFlyoutOpen: jest.fn(),
      onUpdate,
    }));
  });

  it('provides the same data out it got in if nothing changes', () => {
    const {
      calls: [[arg]],
    } = onUpdate.mock;

    expect(arg.getData()).toEqual(testProcessors);
  });

  describe('no processors', () => {
    it('displays an empty prompt if no processors are defined', () => {
      rerenderWithProps({
        value: {
          processors: [],
        },
        onFlyoutOpen: jest.fn(),
        onUpdate,
      });

      expect(screen.getByTestId('processorsEmptyPrompt')).toBeInTheDocument();
    });
  });

  describe('processors', () => {
    it('adds a new processor', async () => {
      fireEvent.click(getByTestSubjectSelector('processors.addProcessorButton'));

      // Select type (combo box is mocked as an <input/>)
      fireEvent.change(getByTestSubjectSelector('processorTypeSelector.input'), {
        target: { value: 'test' },
      });

      // Provide options JSON
      fireEvent.change(screen.getByTestId('processorOptionsEditor'), {
        target: { value: JSON.stringify({ if: '1 == 1' }) },
      });

      const updateCallsBefore = onUpdate.mock.calls.length;
      fireEvent.click(getByTestSubjectSelector('addProcessorForm.submitButton'));
      await waitFor(() => expect(onUpdate.mock.calls.length).toBeGreaterThan(updateCallsBefore));

      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData() as Pick<Pipeline, 'processors'>;
      expect(processors.length).toBe(4);
      const [a, b, c, d] = processors;
      expect(a).toEqual(testProcessors.processors[0]);
      expect(b).toEqual(testProcessors.processors[1]);
      expect(c).toEqual(testProcessors.processors[2]);
      expect(d).toEqual({ test: { if: '1 == 1' } });
    });

    it('Shows inference and redact processors for licenses > platinum', async () => {
      const basicLicense = licensingMock.createLicense({
        license: { status: 'active', type: 'basic' },
      });
      const platinumLicense = licensingMock.createLicense({
        license: { status: 'active', type: 'platinum' },
      });

      // Get the list of processors that are only available for platinum licenses
      const processorsForPlatinumLicense = extractProcessorDetails(mapProcessorTypeToDescriptor())
        .filter((processor) => processor.forLicenseAtLeast === 'platinum')
        .map(({ value, label, category }) => ({ label, value, category }));

      // Check that the list of processors for platinum licenses is not included in the list of processors for basic licenses
      expect(getProcessorTypesAndLabels(basicLicense)).toEqual(
        expect.not.arrayContaining(processorsForPlatinumLicense)
      );
      expect(getProcessorTypesAndLabels(platinumLicense)).toEqual(
        expect.arrayContaining(processorsForPlatinumLicense)
      );
    });

    it('knows how to group processors by category', () => {
      const platinumLicense = licensingMock.createLicense({
        license: { status: 'active', type: 'platinum' },
      });

      const processors = getProcessorTypesAndLabels(platinumLicense);
      const groupedProcessors = groupProcessorsByCategory(processors);

      for (let x = 0; x < groupedProcessors.length; x++) {
        expect(groupedProcessors[x].label).not.toBeUndefined();
        expect(groupedProcessors[x].options.length).toBeGreaterThan(0);
      }
    });

    it('edits a processor without removing unknown processor.options', async () => {
      // Open the edit processor form for the set processor
      fireEvent.click(getByTestSubjectSelector('processors>2.manageItemButton'));
      expect(screen.getByTestId('editProcessorForm')).toBeInTheDocument();

      const valueInput = getByTestSubjectSelector('editProcessorForm.textValueField.input');
      fireEvent.change(valueInput, { target: { value: 'test44' } });
      fireEvent.blur(valueInput);

      fireEvent.click(getByTestSubjectSelector('editProcessorForm.submitButton'));

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalled();
      });
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const {
        processors: { 2: setProcessor },
      } = onUpdateResult.getData();
      // The original field should still be unchanged
      expect(testProcessors.processors[2].set.value).toBe('test');
      expect(setProcessor.set).toEqual({
        description: undefined,
        field: 'test',
        ignore_empty_value: undefined,
        ignore_failure: undefined,
        override: undefined,
        // This unknown_field is not supported in the form
        unknown_field_foo: 'unknown_value',
        value: 'test44',
      });
    });

    it('allows to edit an existing processor and change its type', async () => {
      // Open one of the existing processors
      fireEvent.click(getByTestSubjectSelector('processors>2.manageItemButton'));
      expect(screen.getByTestId('editProcessorForm')).toBeInTheDocument();

      // Change its type to `append` and set the missing required fields
      fireEvent.change(getByTestSubjectSelector('processorTypeSelector.input'), {
        target: { value: 'append' },
      });

      fireEvent.change(getByTestSubjectSelector('comboxValueField.input'), {
        target: { value: 'some_value' },
      });

      fireEvent.click(getByTestSubjectSelector('editProcessorForm.submitButton'));

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalled();
      });

      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const {
        processors: { 2: editedProcessor },
      } = onUpdateResult.getData();

      expect(editedProcessor.append).toEqual({
        if: undefined,
        tag: undefined,
        description: undefined,
        ignore_failure: undefined,
        field: 'test',
        value: ['some_value'],
      });
    });

    it('removes a processor', async () => {
      // processor>0 denotes the first processor in the top-level processors array.
      fireEvent.click(getByTestSubjectSelector('processors>0.moreMenu.button'));
      fireEvent.click(await screen.findByTestId('deleteButton'));

      const modal = await screen.findByTestId('removeProcessorConfirmationModal');
      fireEvent.click(within(modal).getByTestId('confirmModalConfirmButton'));

      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData();
      expect(processors.length).toBe(2);
      expect(processors[0]).toEqual({
        gsub: {
          field: '_index',
          pattern: '(.monitoring-\\w+-)6(-.+)',
          replacement: '$17$2',
        },
      });
    });

    it('reorders processors', () => {
      fireEvent.click(getByTestSubjectSelector('processors>0.moveItemButton'));
      fireEvent.click(screen.getByTestId('dropButtonBelow-processors>1'));
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData();
      expect(processors).toEqual([
        testProcessors.processors[1],
        testProcessors.processors[0],
        testProcessors.processors[2],
      ]);
    });

    it('adds an on-failure processor to a processor', async () => {
      const processorSelector = 'processors>1';
      fireEvent.click(getByTestSubjectSelector(`${processorSelector}.moreMenu.button`));
      fireEvent.click(await screen.findByTestId('addOnFailureButton'));

      fireEvent.change(getByTestSubjectSelector('processorTypeSelector.input'), {
        target: { value: 'test' },
      });
      fireEvent.change(screen.getByTestId('processorOptionsEditor'), {
        target: { value: JSON.stringify({ if: '1 == 2' }) },
      });
      const updateCallsBefore = onUpdate.mock.calls.length;
      fireEvent.click(getByTestSubjectSelector('addProcessorForm.submitButton'));
      await waitFor(() => expect(onUpdate.mock.calls.length).toBeGreaterThan(updateCallsBefore));
      await screen.findByTestId('processors>1>onFailure>0');

      // Assert that the add on failure button has been removed
      fireEvent.click(getByTestSubjectSelector(`${processorSelector}.moreMenu.button`));
      expect(screen.queryByTestId('addOnFailureButton')).toBeNull();
      // Assert that the on-failure processor tree exists
      expect(screen.getByTestId('processors>1>onFailure>0')).toBeInTheDocument();
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData();
      expect(processors.length).toBe(3);
      expect(processors[0]).toEqual(testProcessors.processors[0]); // should be unchanged
      expect(processors[1].gsub).toEqual({
        ...testProcessors.processors[1].gsub,
        on_failure: [{ test: { if: '1 == 2' } }],
      });
    });

    it('moves a processor to a nested dropzone', async () => {
      fireEvent.click(getByTestSubjectSelector('processors>1.moreMenu.button'));
      fireEvent.click(await screen.findByTestId('addOnFailureButton'));
      fireEvent.change(getByTestSubjectSelector('processorTypeSelector.input'), {
        target: { value: 'test' },
      });
      fireEvent.change(screen.getByTestId('processorOptionsEditor'), {
        target: { value: JSON.stringify({ if: '1 == 3' }) },
      });
      const updateCallsBefore = onUpdate.mock.calls.length;
      fireEvent.click(getByTestSubjectSelector('addProcessorForm.submitButton'));
      await waitFor(() => expect(onUpdate.mock.calls.length).toBeGreaterThan(updateCallsBefore));
      await screen.findByTestId('processors>1>onFailure>0');

      fireEvent.click(getByTestSubjectSelector('processors>0.moveItemButton'));
      fireEvent.click(screen.getByTestId('dropButtonBelow-processors>1>onFailure>0'));
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData();
      expect(processors.length).toBe(2);
      expect(processors[0].gsub.on_failure).toEqual([
        {
          test: { if: '1 == 3' },
        },
        testProcessors.processors[0],
      ]);
    });

    it('duplicates a processor', async () => {
      fireEvent.click(getByTestSubjectSelector('processors>1.moreMenu.button'));
      fireEvent.click(await screen.findByTestId('addOnFailureButton'));
      fireEvent.change(getByTestSubjectSelector('processorTypeSelector.input'), {
        target: { value: 'test' },
      });
      fireEvent.change(screen.getByTestId('processorOptionsEditor'), {
        target: { value: JSON.stringify({ if: '1 == 4' }) },
      });
      const updateCallsBefore = onUpdate.mock.calls.length;
      fireEvent.click(getByTestSubjectSelector('addProcessorForm.submitButton'));
      await waitFor(() => expect(onUpdate.mock.calls.length).toBeGreaterThan(updateCallsBefore));
      await screen.findByTestId('processors>1>onFailure>0');

      fireEvent.click(getByTestSubjectSelector('processors>1.moreMenu.button'));
      const updateCallsBeforeDuplicate = onUpdate.mock.calls.length;
      fireEvent.click(await screen.findByTestId('duplicateButton'));
      await waitFor(() =>
        expect(onUpdate.mock.calls.length).toBeGreaterThan(updateCallsBeforeDuplicate)
      );
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData();
      expect(processors.length).toBe(4);
      const duplicatedProcessor = {
        gsub: {
          ...testProcessors.processors[1].gsub,
          on_failure: [{ test: { if: '1 == 4' } }],
        },
      };
      expect(processors).toEqual([
        testProcessors.processors[0],
        duplicatedProcessor,
        duplicatedProcessor,
        testProcessors.processors[2],
      ]);
    });

    it('can cancel a move', () => {
      const processorSelector = 'processors>0';
      // Assert that we have exited move mode for this processor
      fireEvent.click(getByTestSubjectSelector(`${processorSelector}.moveItemButton`));
      fireEvent.click(getByTestSubjectSelector(`${processorSelector}.cancelMoveItemButton`));
      expect(getByTestSubjectSelector(`${processorSelector}.moveItemButton`)).toBeInTheDocument();
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData();
      // Assert that nothing has changed
      expect(processors).toEqual(testProcessors.processors);
    });

    it('moves to and from the global on-failure tree', async () => {
      fireEvent.click(getByTestSubjectSelector('onFailure.addProcessorButton'));
      fireEvent.change(getByTestSubjectSelector('processorTypeSelector.input'), {
        target: { value: 'test' },
      });
      fireEvent.change(screen.getByTestId('processorOptionsEditor'), {
        target: { value: JSON.stringify({ if: '1 == 5' }) },
      });
      const updateCallsBefore = onUpdate.mock.calls.length;
      fireEvent.click(getByTestSubjectSelector('addProcessorForm.submitButton'));
      await waitFor(() => expect(onUpdate.mock.calls.length).toBeGreaterThan(updateCallsBefore));
      await screen.findByTestId('onFailure>0');

      fireEvent.click(getByTestSubjectSelector('processors>0.moveItemButton'));
      // `ProcessorsTree` installs global move-cancel listeners via `setTimeout()`.
      // Yield a tick so the listeners are installed before we drop, otherwise they can be leaked
      // (timeout runs after we've already exited move mode), impacting later interactions.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const updateCallsBeforeMove1 = onUpdate.mock.calls.length;
      fireEvent.click(screen.getByTestId('dropButtonBelow-onFailure>0'));
      await waitFor(() =>
        expect(onUpdate.mock.calls.length).toBeGreaterThan(updateCallsBeforeMove1)
      );
      const [onUpdateResult1] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const data1 = onUpdateResult1.getData();
      expect(data1.processors.length).toBe(2);
      expect(data1.on_failure.length).toBe(2);
      expect(data1.processors).toEqual([
        testProcessors.processors[1],
        testProcessors.processors[2],
      ]);
      expect(data1.on_failure).toEqual([{ test: { if: '1 == 5' } }, testProcessors.processors[0]]);
      // `ProcessorsTree` uses `setTimeout()` to add/remove global click listeners for move-mode.
      // We need to yield a tick here to ensure any listener cleanup from the previous move has run,
      // otherwise the stale listener can immediately cancel the next select-to-move click.
      await new Promise((resolve) => setTimeout(resolve, 0));
      fireEvent.click(getByTestSubjectSelector('onFailure>1.moveItemButton'));
      // Yield a tick to let `ProcessorsTree` install its move-cancel listeners before dropping.
      await new Promise((resolve) => setTimeout(resolve, 0));
      await waitFor(async () => {
        const [lastCallArg] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
        await expect(lastCallArg.validate()).resolves.toBe(false);
      });
      fireEvent.click(screen.getByTestId('dropButtonAbove-processors>0'));
      await waitFor(async () => {
        const [lastCallArg] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
        await expect(lastCallArg.validate()).resolves.toBe(true);
        const data = lastCallArg.getData();
        expect(data.processors.length).toBe(3);
        expect(data.on_failure.length).toBe(1);
      });
      const [onUpdateResult2] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const data2 = onUpdateResult2.getData();
      expect(data2.processors.length).toBe(3);
      expect(data2.on_failure.length).toBe(1);
      expect(data2.processors).toEqual(testProcessors.processors);
      expect(data2.on_failure).toEqual([{ test: { if: '1 == 5' } }]);
    });

    it('prevents moving a processor while in edit mode', () => {
      fireEvent.click(getByTestSubjectSelector('processors>0.manageItemButton'));
      expect(screen.getByTestId('editProcessorForm')).toBeInTheDocument();
      expect(getByTestSubjectSelector('processors>0.moveItemButton')).toBeDisabled();
      expect(getByTestSubjectSelector('processors>1.moveItemButton')).toBeDisabled();
    });

    it('can move a processor into an empty tree', () => {
      fireEvent.click(getByTestSubjectSelector('processors>0.moveItemButton'));
      fireEvent.click(getByTestSubjectSelector('onFailure.dropButtonEmptyTree'));
      const [onUpdateResult2] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const data = onUpdateResult2.getData();
      expect(data.processors).toEqual([testProcessors.processors[1], testProcessors.processors[2]]);
      expect(data.on_failure).toEqual([testProcessors.processors[0]]);
    });

    it('shows user provided descriptions rather than default descriptions and default descriptions rather than no description', async () => {
      fireEvent.click(getByTestSubjectSelector('processors.addProcessorButton'));
      fireEvent.change(getByTestSubjectSelector('processorTypeSelector.input'), {
        target: { value: 'test' },
      });
      fireEvent.change(screen.getByTestId('processorOptionsEditor'), {
        target: { value: JSON.stringify({ if: '1 == 1' }) },
      });
      const updateCallsBefore = onUpdate.mock.calls.length;
      fireEvent.click(getByTestSubjectSelector('addProcessorForm.submitButton'));
      await waitFor(() => expect(onUpdate.mock.calls.length).toBeGreaterThan(updateCallsBefore));
      await screen.findByTestId('processors>3');

      const processorDescriptions = {
        userProvided: 'my script',
        default: 'Sets value of "test" to test',
        none: 'No description',
      };

      const createAssertForProcessor =
        (processorIndex: string) =>
        ({
          description,
          descriptionVisible,
        }: {
          description: string;
          descriptionVisible: boolean;
        }) => {
          expect(
            getByTestSubjectSelector(
              `processors>${processorIndex}.pipelineProcessorItemDescriptionContainer.inlineTextInputNonEditableText`
            ).textContent
          ).toBe(description);

          const descriptionContainer = getByTestSubjectSelector(
            `processors>${processorIndex}.pipelineProcessorItemDescriptionContainer`
          );

          if (descriptionVisible) {
            expect(
              window.getComputedStyle(descriptionContainer).getPropertyValue('display')
            ).not.toBe('none');
          } else {
            expect(window.getComputedStyle(descriptionContainer).getPropertyValue('display')).toBe(
              'none'
            );
          }
        };

      const assertScriptProcessor = createAssertForProcessor('0');
      const assertSetProcessor = createAssertForProcessor('2');
      const assertTestProcessor = createAssertForProcessor('3');

      assertScriptProcessor({
        description: processorDescriptions.userProvided,
        descriptionVisible: true,
      });

      assertSetProcessor({
        description: processorDescriptions.default,
        descriptionVisible: true,
      });

      assertTestProcessor({ description: processorDescriptions.none, descriptionVisible: true });

      // Enter "move" mode
      fireEvent.click(getByTestSubjectSelector('processors>0.moveItemButton'));

      // We expect that descriptions remain exactly the same, but the processor with "No description" has
      // its description hidden
      assertScriptProcessor({
        description: processorDescriptions.userProvided,
        descriptionVisible: true,
      });

      assertSetProcessor({
        description: processorDescriptions.default,
        descriptionVisible: true,
      });

      assertTestProcessor({ description: processorDescriptions.none, descriptionVisible: false });
    });
  });

  describe('object values', () => {
    const mockData: Pick<Pipeline, 'processors'> = {
      processors: [
        {
          set: {
            field: 'test',
            value: { test: 'test' },
          },
        },
        {
          append: {
            field: 'test',
            value: { test: 'test' },
          },
        },
      ],
    };
    it('editor works when value is an object', async () => {
      onUpdate = jest.fn();
      rerenderWithProps({
        value: {
          ...mockData,
        },
        onFlyoutOpen: jest.fn(),
        onUpdate,
      });
      expect(
        getByTestSubjectSelector(
          'processors>0.pipelineProcessorItemDescriptionContainer.inlineTextInputNonEditableText'
        ).textContent
      ).toBe('Sets value of "test" to {"test":"test"}');
      expect(
        getByTestSubjectSelector(
          'processors>1.pipelineProcessorItemDescriptionContainer.inlineTextInputNonEditableText'
        ).textContent
      ).toBe('Appends {"test":"test"} to the "test" field');
    });
  });
});
