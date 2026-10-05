/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import type { ComboBoxChange } from './combo_box_selection_validity';
import {
  EuiComboBoxNoCustomOption,
  type EuiComboBoxNoCustomOptionOption,
} from './eui_combo_box_no_custom_option';

type Fruit = 'apple' | 'pear' | 'plum';

const OPTIONS: Array<EuiComboBoxNoCustomOptionOption<Fruit>> = [
  { value: 'apple', label: 'Apple', description: 'Crunchy', 'data-test-subj': 'fruit-apple' },
  { value: 'pear', label: 'Pear', description: 'Juicy', 'data-test-subj': 'fruit-pear' },
];

const renderComponent = ({
  value = '',
  onChange = () => {},
}: {
  value?: Fruit | '';
  onChange?: (next: ComboBoxChange<Fruit | ''>) => void;
} = {}) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <EuiComboBoxNoCustomOption
          value={value}
          onChange={onChange}
          onBlur={() => {}}
          options={OPTIONS}
          defaultValue="pear"
          isInvalid={false}
          placeholder="Select a fruit"
          aria-label="Fruit"
          data-test-subj="fruit"
        />
      </I18nProvider>
    </EuiProvider>
  );

const getInput = (getByTestId: ReturnType<typeof render>['getByTestId']): HTMLInputElement => {
  const input = getByTestId('fruit').querySelector('input');
  if (!input) throw new Error('fruit input not found');
  return input;
};

describe('EuiComboBoxNoCustomOption', () => {
  describe('WHEN the list is open', () => {
    it('SHOULD show descriptions and a default badge on the default option only', async () => {
      const { getByTestId, getAllByText, getByText } = renderComponent();

      await act(async () => {
        fireEvent.click(getInput(getByTestId));
      });

      expect(getByText('Crunchy')).toBeInTheDocument();
      expect(getAllByText(createDatasetWizardStrings.defaultBadgeLabel)).toHaveLength(1);
      expect(getByTestId('fruit-pear')).toHaveTextContent(
        createDatasetWizardStrings.defaultBadgeLabel
      );
    });
  });

  describe('WHEN an option is selected', () => {
    it('SHOULD report its value as valid', async () => {
      const onChange = jest.fn();
      const { getByTestId } = renderComponent({ onChange });

      await act(async () => {
        fireEvent.click(getInput(getByTestId));
      });
      await act(async () => {
        fireEvent.click(getByTestId('fruit-apple'));
      });

      expect(onChange).toHaveBeenLastCalledWith({ value: 'apple', isValid: true });
    });
  });

  describe('WHEN text is typed that has not been resolved to an option', () => {
    it('SHOULD report the current value as invalid', async () => {
      const onChange = jest.fn();
      const { getByTestId } = renderComponent({ value: 'apple', onChange });

      await act(async () => {
        fireEvent.change(getInput(getByTestId), { target: { value: 'bogus' } });
      });

      expect(onChange).toHaveBeenLastCalledWith({ value: 'apple', isValid: false });
    });

    it('SHOULD report the option selected afterwards as valid', async () => {
      const onChange = jest.fn();
      const { getByTestId } = renderComponent({ value: 'apple', onChange });

      await act(async () => {
        fireEvent.change(getInput(getByTestId), { target: { value: 'pe' } });
      });
      await act(async () => {
        fireEvent.click(getByTestId('fruit-pear'));
      });

      expect(onChange).toHaveBeenLastCalledWith({ value: 'pear', isValid: true });
    });
  });

  describe('WHEN the value is one of the options', () => {
    it('SHOULD display its label', () => {
      const { getByTestId } = renderComponent({ value: 'apple' });

      expect(getInput(getByTestId)).toHaveValue('Apple');
    });
  });

  describe('WHEN the selection is cleared', () => {
    it('SHOULD report an empty value as valid', async () => {
      const onChange = jest.fn();
      const { getByTestId } = renderComponent({ value: 'apple', onChange });

      await act(async () => {
        fireEvent.click(getByTestId('comboBoxClearButton'));
      });

      expect(onChange).toHaveBeenLastCalledWith({ value: '', isValid: true });
    });
  });

  describe('WHEN the value is not one of the options', () => {
    it('SHOULD display the raw value', () => {
      const { getByTestId } = renderComponent({ value: 'plum' });

      expect(getInput(getByTestId)).toHaveValue('plum');
    });
  });
});
