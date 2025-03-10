/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MODEL_GPT_4O, MODEL_GPT_4_TURBO, ModelSelector } from './model_selector';
import { fireEvent, render } from '@testing-library/react';

describe('ModelSelector', () => {
  it('should render with correct default selection', () => {
    const onModelSelectionChange = jest.fn();
    const { getByTestId } = render(
      <ModelSelector onModelSelectionChange={onModelSelectionChange} />
    );
    expect(getByTestId('comboBoxSearchInput')).toHaveValue(MODEL_GPT_4O);
  });
  it('should call onModelSelectionChange when custom option', () => {
    const onModelSelectionChange = jest.fn();
    const { getByTestId } = render(
      <ModelSelector onModelSelectionChange={onModelSelectionChange} />
    );
    const comboBox = getByTestId('comboBoxSearchInput');
    const customOption = 'Custom option';
    fireEvent.change(comboBox, { target: { value: customOption } });
    fireEvent.keyDown(comboBox, {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    expect(onModelSelectionChange).toHaveBeenCalledWith(customOption);
  });
  it('should call onModelSelectionChange when existing option is selected', () => {
    const onModelSelectionChange = jest.fn();
    const { getByTestId } = render(
      <ModelSelector onModelSelectionChange={onModelSelectionChange} />
    );
    const comboBox = getByTestId('comboBoxSearchInput');
    fireEvent.click(comboBox);
    fireEvent.click(getByTestId(MODEL_GPT_4_TURBO));
    expect(onModelSelectionChange).toHaveBeenCalledWith(MODEL_GPT_4_TURBO);
  });
});
