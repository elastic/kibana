/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ListKiSearchBox } from './list_ki_search_box';

const renderSearchBox = (onSearch: jest.Mock) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <ListKiSearchBox value="" onSearch={onSearch} />
      </EuiProvider>
    </I18nProvider>
  );

describe('ListKiSearchBox', () => {
  it('calls onSearch with trimmed text when search is committed', () => {
    const onSearch = jest.fn();
    renderSearchBox(onSearch);

    const input = screen.getByTestId('contextListKiSearchBox');
    fireEvent.change(input, { target: { value: '  refund  ' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('refund');
  });

  it('does not call onSearch on keystrokes alone', () => {
    const onSearch = jest.fn();
    renderSearchBox(onSearch);

    const input = screen.getByTestId('contextListKiSearchBox');
    fireEvent.change(input, { target: { value: 'r' } });
    fireEvent.change(input, { target: { value: 're' } });
    fireEvent.change(input, { target: { value: 'ref' } });

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('does not render a separate Search button', () => {
    const onSearch = jest.fn();
    renderSearchBox(onSearch);

    expect(screen.queryByTestId('contextListKiSearchButton')).not.toBeInTheDocument();
  });
});
