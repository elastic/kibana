/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MetadataTable } from '..';
import {
  expectTextsInDocument,
  MockApmPluginContextWrapper
} from '../../../../utils/testHelpers';
import { SectionsWithRows } from '../helper';

const renderOptions = {
  wrapper: MockApmPluginContextWrapper
};

describe('MetadataTable', () => {
  it('shows sections', () => {
    const sectionsWithRows = ([
      { key: 'foo', label: 'Foo', required: true },
      {
        key: 'bar',
        label: 'Bar',
        required: false,
        properties: ['props.A', 'props.B'],
        rows: [
          { key: 'props.A', value: 'A' },
          { key: 'props.B', value: 'B' }
        ]
      }
    ] as unknown) as SectionsWithRows;
    const output = render(
      <MetadataTable sections={sectionsWithRows} />,
      renderOptions
    );
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
      const sectionsWithRows = ([
        {
          key: 'foo',
          label: 'Foo',
          required: true
        }
      ] as unknown) as SectionsWithRows;
      const output = render(
        <MetadataTable sections={sectionsWithRows} />,
        renderOptions
      );
      expectTextsInDocument(output, ['Foo', 'No data available']);
    });
  });
});
