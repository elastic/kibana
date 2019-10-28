/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import 'jest-dom/extend-expect';
import { render, cleanup } from 'react-testing-library';
import { MetadataTable } from '..';
import {
  expectTextsInDocument,
  expectTextsNotInDocument
} from '../../../../utils/testHelpers';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';

describe('MetadataTable', () => {
  afterEach(cleanup);
  describe('required sections', () => {
    it('shows "empty state message" if no data is available', () => {
      const sections = [
        {
          key: 'foo',
          label: 'Foo',
          required: true
        }
      ];
      const output = render(
        <MetadataTable item={{} as Transaction} sections={sections} />
      );
      expectTextsInDocument(output, ['Foo', 'No data available']);
    });
    it('shows "empty state message" if property is not available', () => {
      const sections = [
        {
          key: 'foo',
          label: 'Foo',
          required: true,
          properties: ['bar']
        }
      ];
      const item = ({
        foo: {
          foobar: 'bar'
        }
      } as unknown) as Transaction;

      const output = render(<MetadataTable item={item} sections={sections} />);
      expectTextsInDocument(output, ['Foo', 'No data available']);
    });
  });
  describe('not required sections', () => {
    it('does not show section when no items are provided', () => {
      const sections = [
        {
          key: 'foo',
          label: 'Foo',
          required: false
        }
      ];
      const output = render(
        <MetadataTable item={{} as Transaction} sections={sections} />
      );
      expectTextsNotInDocument(output, ['Foo']);
    });
    it('does not show section if property is not available', () => {
      const sections = [
        {
          key: 'foo',
          label: 'Foo',
          required: false,
          properties: ['bar']
        }
      ];
      const item = ({
        foo: {
          foobar: 'bar'
        }
      } as unknown) as Transaction;
      const output = render(<MetadataTable item={item} sections={sections} />);
      expectTextsNotInDocument(output, ['Foo']);
    });
  });
});
