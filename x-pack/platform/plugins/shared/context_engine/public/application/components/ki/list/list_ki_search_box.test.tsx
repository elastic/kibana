/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { LIST_KI_SEARCH_DEBOUNCE_MS, ListKiSearchBox } from './list_ki_search_box';

const SearchBoxWrapper = ({ onChange, onCommit }: { onChange: jest.Mock; onCommit: jest.Mock }) => {
  const [value, setValue] = useState('');
  const handleChange = (text: string) => {
    onChange(text);
    setValue(text);
  };
  return <ListKiSearchBox value={value} onChange={handleChange} onCommit={onCommit} />;
};

const renderSearchBox = (onChange: jest.Mock, onCommit: jest.Mock) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <SearchBoxWrapper onChange={onChange} onCommit={onCommit} />
      </EuiProvider>
    </I18nProvider>
  );

describe('ListKiSearchBox', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls onCommit with the raw text when Enter is pressed', () => {
    const onCommit = jest.fn();
    renderSearchBox(jest.fn(), onCommit);
    onCommit.mockClear();

    const input = screen.getByTestId('contextListKiSearchBox');
    fireEvent.change(input, { target: { value: '  refund  ' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('  refund  ');
  });

  it('commits once after the pause, not on every keystroke', () => {
    const onChange = jest.fn();
    const onCommit = jest.fn();
    renderSearchBox(onChange, onCommit);
    act(() => {
      jest.advanceTimersByTime(LIST_KI_SEARCH_DEBOUNCE_MS);
    });
    onCommit.mockClear();

    const input = screen.getByTestId('contextListKiSearchBox');
    fireEvent.change(input, { target: { value: 'r' } });
    fireEvent.change(input, { target: { value: 're' } });
    fireEvent.change(input, { target: { value: 'ref' } });

    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onCommit).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(LIST_KI_SEARCH_DEBOUNCE_MS);
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('ref');
  });
});
