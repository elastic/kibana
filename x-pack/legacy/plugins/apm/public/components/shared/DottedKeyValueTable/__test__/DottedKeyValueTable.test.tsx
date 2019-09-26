/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DottedKeyValueTable } from '..';
import { cleanup, render } from 'react-testing-library';

function getKeys(output: ReturnType<typeof render>) {
  const keys = output.getAllByTestId('dot-key');
  return Array.isArray(keys) ? keys.map(node => node.textContent) : [];
}

function getValues(output: ReturnType<typeof render>) {
  const values = output.getAllByTestId('value');
  return Array.isArray(values) ? values.map(node => node.textContent) : [];
}

describe('DottedKeyValueTable', () => {
  afterEach(cleanup);

  it('should display a nested object with alpha-ordered, dot notation keys and values', () => {
    const data = {
      name: {
        first: 'Jo',
        last: 'Smith'
      },
      age: 29,
      active: true,
      useless: false,
      start: null,
      end: undefined,
      nested: {
        b: {
          c: 'ccc'
        },
        a: 'aaa'
      }
    };
    const output = render(<DottedKeyValueTable data={data} />);
    const rows = output.container.querySelectorAll('tr');
    expect(rows.length).toEqual(9);

    expect(getKeys(output)).toEqual([
      'active',
      'age',
      'end',
      'name.first',
      'name.last',
      'nested.a',
      'nested.b.c',
      'start',
      'useless'
    ]);

    expect(getValues(output)).toEqual([
      'true',
      '29',
      'N/A',
      'Jo',
      'Smith',
      'aaa',
      'ccc',
      'N/A',
      'false'
    ]);
  });

  it('should respect max depth', () => {
    const data = {
      nested: { b: { c: 'ccc' }, a: 'aaa' }
    };
    const output = render(<DottedKeyValueTable data={data} maxDepth={1} />);
    const rows = output.container.querySelectorAll('tr');
    expect(rows.length).toEqual(2);

    expect(getKeys(output)).toEqual(['nested.a', 'nested.b']);

    expect(getValues(output)).toEqual([
      'aaa',
      JSON.stringify({ c: 'ccc' }, null, 4)
    ]);
  });

  it('should prepend a provided parent key to all of the dot-notation keys', () => {
    const data = {
      name: {
        first: 'Jo',
        last: 'Smith'
      },
      age: 29,
      active: true
    };
    const output = render(<DottedKeyValueTable data={data} parentKey="top" />);
    const rows = output.container.querySelectorAll('tr');
    expect(rows.length).toEqual(4);

    expect(getKeys(output)).toEqual([
      'top.active',
      'top.age',
      'top.name.first',
      'top.name.last'
    ]);
  });
});
