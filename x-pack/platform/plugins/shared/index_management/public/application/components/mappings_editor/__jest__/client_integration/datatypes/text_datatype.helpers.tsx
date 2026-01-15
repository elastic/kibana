/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { EuiSuperSelectTestHarness } from '@kbn/test-eui-helpers';

export const onChangeHandler = jest.fn();

export interface TestMappings {
  properties: Record<string, Record<string, unknown>>;
  _meta?: Record<string, unknown>;
  _source?: Record<string, unknown>;
}

export const openFieldEditor = async () => {
  const editButton = screen.getByTestId('editFieldButton');
  fireEvent.click(editButton);
  return screen.findByTestId('mappingsEditorFieldEdit');
};

export const toggleAdvancedSettings = async (flyout: HTMLElement) => {
  const advancedToggle = within(flyout).getByTestId('toggleAdvancedSetting');
  fireEvent.click(advancedToggle);
  await waitFor(() => {
    const advancedSettings = within(flyout).getByTestId('advancedSettings');
    expect(advancedSettings.style.display).not.toBe('none');
  });
};

export const updateFieldName = (flyout: HTMLElement, name: string) => {
  const nameInput = within(flyout).getByTestId('nameParameterInput');
  fireEvent.change(nameInput, { target: { value: name } });
};

export const submitForm = async (flyout: HTMLElement) => {
  const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
  fireEvent.click(updateButton);
  await waitFor(() => {
    expect(onChangeHandler).toHaveBeenCalled();
  });
};

export const getLatestMappings = () => {
  const [callData] = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1];
  return callData.getData();
};

export const selectSuperSelectOptionById = async (
  testSubj: string,
  optionId: string,
  options?: { container?: HTMLElement }
) => {
  const harness = new EuiSuperSelectTestHarness(testSubj, { container: options?.container });
  if (!harness.getElement()) throw new Error(`${testSubj} harness not found`);

  await harness.selectById(optionId);
};

export const selectAnalyzer = async (flyout: HTMLElement, testSubj: string, optionId: string) => {
  await selectSuperSelectOptionById(testSubj, optionId, { container: flyout });
};

export const toggleUseSameSearchAnalyzer = (flyout: HTMLElement) => {
  fireEvent.click(within(flyout).getByRole('checkbox'));
};
