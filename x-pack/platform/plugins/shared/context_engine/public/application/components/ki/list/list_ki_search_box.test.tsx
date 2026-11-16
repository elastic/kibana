/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { ListKiSearchBox } from './list_ki_search_box';

const SearchBoxWrapper = ({
  onChange,
  onCommit,
  submittedQuery = '',
}: {
  onChange: jest.Mock;
  onCommit: jest.Mock;
  submittedQuery?: string;
}) => {
  const [value, setValue] = useState('');
  const handleChange = (text: string) => {
    onChange(text);
    setValue(text);
  };
  return (
    <ListKiSearchBox
      value={value}
      submittedQuery={submittedQuery}
      onChange={handleChange}
      onCommit={onCommit}
      onSubmitClick={() => onCommit(value)}
    />
  );
};

const renderSearchBox = (onChange: jest.Mock, onCommit: jest.Mock, submittedQuery?: string) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <SearchBoxWrapper onChange={onChange} onCommit={onCommit} submittedQuery={submittedQuery} />
      </EuiProvider>
    </I18nProvider>
  );

describe('ListKiSearchBox', () => {
  it('calls onCommit with the raw text when Enter is pressed', () => {
    const onChange = jest.fn();
    const onCommit = jest.fn();
    renderSearchBox(onChange, onCommit);

    const input = screen.getByTestId('contextListKiSearchBox');
    fireEvent.change(input, { target: { value: '  refund  ' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('  refund  ');
  });

  it('calls onChange on every keystroke without committing', () => {
    const onChange = jest.fn();
    const onCommit = jest.fn();
    renderSearchBox(onChange, onCommit);

    const input = screen.getByTestId('contextListKiSearchBox');
    fireEvent.change(input, { target: { value: 'r' } });
    fireEvent.change(input, { target: { value: 're' } });
    fireEvent.change(input, { target: { value: 'ref' } });

    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('disables submit when typed and submitted queries match', () => {
    renderSearchBox(jest.fn(), jest.fn(), 'refund');

    fireEvent.change(screen.getByTestId('contextListKiSearchBox'), { target: { value: 'refund' } });
    expect(screen.getByTestId('contextListKiSearchSubmitButton')).toBeDisabled();
  });

  it('enables submit when typed text differs from the submitted query', () => {
    renderSearchBox(jest.fn(), jest.fn(), 'refund');

    fireEvent.change(screen.getByTestId('contextListKiSearchBox'), {
      target: { value: 'returns' },
    });
    expect(screen.getByTestId('contextListKiSearchSubmitButton')).toBeEnabled();
  });
});
