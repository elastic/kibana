/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMetadataItems, filterItems } from '../helper';
import { LABELS, HTTP, SERVICE } from '../sections';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';

describe('MetadataTable Helper', () => {
  const sections = [
    { ...LABELS, required: true },
    HTTP,
    { ...SERVICE, properties: ['environment'] }
  ];
  const item = ({
    http: {
      headers: {
        Connection: 'close',
        Host: 'opbeans:3000',
        request: { method: 'get' }
      }
    },
    service: {
      framework: { name: 'express' },
      environment: 'production'
    }
  } as unknown) as Transaction;
  const items = getMetadataItems(sections, item);
  it('returns flattened data and required section', () => {
    expect(items).toEqual([
      { key: 'labels', label: 'Labels', required: true },
      {
        key: 'http',
        label: 'HTTP',
        data: [
          { key: 'http.headers.Connection', value: 'close' },
          { key: 'http.headers.Host', value: 'opbeans:3000' },
          { key: 'http.headers.request.method', value: 'get' }
        ]
      },
      {
        key: 'service',
        label: 'Service',
        properties: ['environment'],
        data: [{ key: 'service.environment', value: 'production' }]
      }
    ]);
  });
  describe('filter', () => {
    it('items by key', () => {
      const filteredItems = filterItems(items, 'http');
      expect(filteredItems).toEqual([
        {
          key: 'http',
          label: 'HTTP',
          data: [
            { key: 'http.headers.Connection', value: 'close' },
            { key: 'http.headers.Host', value: 'opbeans:3000' },
            { key: 'http.headers.request.method', value: 'get' }
          ]
        }
      ]);
    });

    it('items by value', () => {
      const filteredItems = filterItems(items, 'product');
      expect(filteredItems).toEqual([
        {
          key: 'service',
          label: 'Service',
          properties: ['environment'],
          data: [{ key: 'service.environment', value: 'production' }]
        }
      ]);
    });

    it('returns empty when no item matches', () => {
      const filteredItems = filterItems(items, 'post');
      expect(filteredItems).toEqual([]);
    });
  });
});
