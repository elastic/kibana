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

import { createDatasetWizardStrings } from '../../../create_dataset_wizard_i18n';
import type { DatasetModeFormValue } from '../../../create_dataset_form_state';
import { QuoteMode } from './quote_mode';

const renderComponent = ({
  value = '',
  onChange = () => {},
}: {
  value?: DatasetModeFormValue;
  onChange?: (next: DatasetModeFormValue) => void;
} = {}) => {
  return render(
    <EuiProvider>
      <I18nProvider>
        <QuoteMode value={value} onChange={onChange} onBlur={() => {}} defaultValue="quoted" />
      </I18nProvider>
    </EuiProvider>
  );
};

describe('QuoteMode', () => {
  it('calls onChange with the selected mode', async () => {
    const onChange = jest.fn();
    const { getByTestId, getAllByTestId } = renderComponent({ onChange });

    const combo = getByTestId('createDatasetSettingsMode');
    await act(async () => {
      fireEvent.click(combo.querySelector('input') ?? combo);
    });

    const candidates = getAllByTestId('createDatasetSettingsModeOption-plain');
    const option = candidates.find((el) => el.getAttribute('role') === 'option') ?? candidates[0];

    await act(async () => {
      fireEvent.click(option);
    });

    expect(onChange).toHaveBeenCalledWith('plain');
  });

  it('shows the default badge on the default option', async () => {
    const { getByTestId, getAllByText } = renderComponent();

    const combo = getByTestId('createDatasetSettingsMode');
    await act(async () => {
      fireEvent.click(combo.querySelector('input') ?? combo);
    });

    // Only the default option should have a single default badge.
    expect(getAllByText(createDatasetWizardStrings.defaultBadgeLabel)).toHaveLength(1);
  });
});
