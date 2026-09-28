/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { KeyValueTable } from '.';
import { render } from '@testing-library/react';
import { renderWithTheme } from './utils/test_helpers';

function getKeys(output: ReturnType<typeof render>) {
  const keys = output.getAllByTestId('dot-key');
  return Array.isArray(keys) ? keys.map((node) => node.textContent) : [];
}

function getValues(output: ReturnType<typeof render>) {
  const values = output.getAllByTestId('value');
  return Array.isArray(values) ? values.map((node) => node.textContent) : [];
}

describe('KeyValueTable', () => {
  it('displays key and value table', () => {
    const data = [
      { key: 'name.first', value: 'First Name' },
      { key: 'name.last', value: 'Last Name' },
      { key: 'age', value: '29' },
      { key: 'active', value: true },
      { key: 'useless', value: false },
      { key: 'start', value: null },
      { key: 'end', value: undefined },
      { key: 'nested.b.c', value: 'ccc' },
      { key: 'nested.a', value: 'aaa' },
    ];
    const output = renderWithTheme(<KeyValueTable keyValuePairs={data} />);
    const rows = output.container.querySelectorAll('tr');
    expect(rows.length).toEqual(9);

    expect(getKeys(output)).toEqual([
      'name.first',
      'name.last',
      'age',
      'active',
      'useless',
      'start',
      'end',
      'nested.b.c',
      'nested.a',
    ]);

    expect(getValues(output)).toEqual([
      'First Name',
      'Last Name',
      '29',
      'true',
      'false',
      'N/A',
      'N/A',
      'ccc',
      'aaa',
    ]);
  });

  it('renders one list item per value for multi-value fields', () => {
    const output = renderWithTheme(
      <KeyValueTable keyValuePairs={[{ key: 'host.ip', value: ['10.0.0.1', '10.0.0.2'] }]} />
    );

    const items = output.container.querySelectorAll('li');
    expect(Array.from(items).map((item) => item.textContent)).toEqual(['10.0.0.1', '10.0.0.2']);
  });

  describe('column alignment', () => {
    const longKey = 'error.exception.attributes.some.very.long.nested.field.name';

    it('gives the key column a content-independent width that wraps instead of overflowing', () => {
      const output = renderWithTheme(
        <KeyValueTable keyValuePairs={[{ key: longKey, value: 'value' }]} />
      );

      const keyCell = output.getByTestId('dot-key').closest('td');
      expect(keyCell).toHaveStyle({ width: '24em' });
      expect(keyCell).not.toHaveStyle({ whiteSpace: 'nowrap' });
    });

    it('uses a fixed table layout even when the host app defaults EuiTable to auto', () => {
      const { container } = render(
        <EuiProvider componentDefaults={{ EuiTable: { tableLayout: 'auto' } }}>
          <KeyValueTable keyValuePairs={[{ key: longKey, value: 'value' }]} />
        </EuiProvider>
      );

      expect(container.querySelector('table')).toHaveStyle({ tableLayout: 'fixed' });
    });

    it('still lets consumers opt out via tableProps', () => {
      const output = renderWithTheme(
        <KeyValueTable
          keyValuePairs={[{ key: longKey, value: 'value' }]}
          tableProps={{ tableLayout: 'auto' }}
        />
      );

      expect(output.container.querySelector('table')).toHaveStyle({ tableLayout: 'auto' });
    });
  });
});
