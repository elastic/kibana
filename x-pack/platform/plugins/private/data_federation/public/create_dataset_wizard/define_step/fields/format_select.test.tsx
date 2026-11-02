/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { DatasetFormatFormValue } from '../../create_dataset_form_state';
import { FormatSelect } from './format_select';

const renderComponent = () => {
  const Wrapper = () => {
    const [format, setFormat] = useState<DatasetFormatFormValue>('');

    return (
      <>
        <FormatSelect
          value={format}
          onChange={setFormat}
          onBlur={() => {}}
          isInvalid={false}
          isAutoDetected={false}
        />
        <div data-test-subj="formatValue">{format}</div>
      </>
    );
  };

  return render(
    <EuiProvider>
      <I18nProvider>
        <Wrapper />
      </I18nProvider>
    </EuiProvider>
  );
};

describe('FormatSelect', () => {
  it('updates value when an option is selected', async () => {
    const { getByTestId } = renderComponent();

    await act(async () => {
      fireEvent.click(getByTestId('createDatasetSettingsFormat'));
    });

    await act(async () => {
      fireEvent.click(getByTestId('createDatasetSettingsFormatOption-tsv'));
    });

    expect(getByTestId('formatValue')).toHaveTextContent('tsv');
  });
});
