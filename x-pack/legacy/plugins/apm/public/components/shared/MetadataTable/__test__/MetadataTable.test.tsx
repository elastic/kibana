/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import 'jest-dom/extend-expect';
import { render, cleanup } from 'react-testing-library';
import { MetadataTable } from '..';
import { expectTextsInDocument } from '../../../../utils/testHelpers';

describe('MetadataTable', () => {
  afterEach(cleanup);
  it('shows sections', () => {
    const items = [
      { key: 'foo', label: 'Foo', required: true },
      {
        key: 'bar',
        label: 'Bar',
        required: false,
        properties: ['props.A', 'props.B'],
        data: [{ key: 'props.A', value: 'A' }, { key: 'props.B', value: 'B' }]
      }
    ];
    const output = render(<MetadataTable items={items} />);
    expectTextsInDocument(output, [
      'Foo',
      'No data available',
      'Bar',
      'props.A',
      'A',
      'props.B',
      'B'
    ]);
  });
  describe('required sections', () => {
    it('shows "empty state message" if no data is available', () => {
      const items = [
        {
          key: 'foo',
          label: 'Foo',
          required: true
        }
      ];
      const output = render(<MetadataTable items={items} />);
      expectTextsInDocument(output, ['Foo', 'No data available']);
    });
  });
});
