/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getProcessorValue, renderProcessorEditor, setupEnvironment } from './processor.helpers';

const CEF_TYPE = 'cef';

describe('Processor: CEF', () => {
  let onUpdate: jest.Mock;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  describe('add CEF processor', () => {
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
        target: { value: CEF_TYPE },
      });

      await screen.findByTestId('addProcessorForm');
      await screen.findByTestId('fieldNameField');
    });

    test('prevents form submission if required fields are not provided', async () => {
      fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));

      expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
    });

    test('saves with required parameter values', async () => {
      fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
        target: { value: 'message' },
      });

      fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
      await waitFor(() => expect(onUpdate).toHaveBeenCalled());

      const processors = getProcessorValue(onUpdate);
      expect(processors[0][CEF_TYPE]).toEqual({
        field: 'message',
      });
    });

    test('allows optional parameters to be set', async () => {
      fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
        target: { value: 'message' },
      });

      fireEvent.change(within(screen.getByTestId('targetField')).getByTestId('input'), {
        target: { value: 'event' },
      });

      fireEvent.change(within(screen.getByTestId('timezoneField')).getByTestId('input'), {
        target: { value: 'Europe/Madrid' },
      });

      // ignore_empty_values defaults to true; clicking toggles it to false
      fireEvent.click(within(screen.getByTestId('ignoreEmptyValuesSwitch')).getByTestId('input'));
      // ignore_missing defaults to false; clicking toggles it to true
      fireEvent.click(within(screen.getByTestId('ignoreMissingSwitch')).getByTestId('input'));

      fireEvent.click(within(screen.getByTestId('addProcessorForm')).getByTestId('submitButton'));
      await waitFor(() => expect(onUpdate).toHaveBeenCalled());

      const processors = getProcessorValue(onUpdate);
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
      renderProcessorEditor(httpSetup, {
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

      fireEvent.click(within(screen.getByTestId('processors>0')).getByTestId('manageItemButton'));
      expect(await screen.findByTestId('editProcessorForm')).toBeInTheDocument();
      const editForm = within(screen.getByTestId('editProcessorForm'));

      fireEvent.change(within(editForm.getByTestId('targetField')).getByTestId('input'), {
        target: { value: '' },
      });

      // ignore_empty_values defaults to true; saved value is false, so toggle back to true.
      fireEvent.click(within(editForm.getByTestId('ignoreEmptyValuesSwitch')).getByTestId('input'));

      fireEvent.click(editForm.getByTestId('submitButton'));
      await waitFor(() => expect(onUpdate).toHaveBeenCalled());

      const processors = getProcessorValue(onUpdate);
      const cef = processors[0][CEF_TYPE];

      expect(JSON.stringify(cef)).toBe(JSON.stringify({ field: 'message' }));
      expect(JSON.stringify(cef)).not.toContain('target_field');
      expect(JSON.stringify(cef)).not.toContain('ignore_empty_values');
    });
  });
});
