/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { DelimiterSelect } from './delimiter_select';

const renderComponent = () => {
  const Wrapper = () => {
    const [delimiter, setDelimiter] = useState('');
    return (
      <>
        <DelimiterSelect
          value={delimiter}
          onChange={setDelimiter}
          onBlur={() => {}}
          defaultValue=","
        />
        <div data-test-subj="delimiterValue">{delimiter}</div>
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

describe('DelimiterSelect', () => {
  it('selects a preset delimiter option', async () => {
    const { getByTestId, getAllByTestId } = renderComponent();

    const combo = getByTestId('createDatasetSettingsDelimiter');
    await act(async () => {
      fireEvent.click(combo.querySelector('input') ?? combo);
    });

    const candidates = await waitFor(() =>
      getAllByTestId('createDatasetSettingsDelimiterOption-semicolon')
    );
    const option = candidates.find((el) => el.getAttribute('role') === 'option') ?? candidates[0];

    await act(async () => {
      fireEvent.click(option);
    });

    expect(getByTestId('delimiterValue')).toHaveTextContent(';');
  });

  it.each([
    ['accepts', '\\t', '\\t'],
    ['accepts', '|', '|'],
    ['rejects', '\\a', ''],
    ['rejects', 'ab', ''],
  ])('%s the custom delimiter %s', async (_outcome, typed, expected) => {
    const { getByTestId } = renderComponent();

    const combo = getByTestId('createDatasetSettingsDelimiter');
    const input = combo.querySelector('input') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: typed } });
    });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    expect(getByTestId('delimiterValue').textContent).toBe(expected);
  });
});
