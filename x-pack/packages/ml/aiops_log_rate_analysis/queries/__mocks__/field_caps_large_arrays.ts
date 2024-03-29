/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const fieldCapsLargeArraysMock = {
  indices: ['large_arrays'],
  fields: {
    _tier: {
      keyword: { type: 'keyword', metadata_field: true, searchable: true, aggregatable: true },
    },
    _seq_no: {
      _seq_no: { type: '_seq_no', metadata_field: true, searchable: true, aggregatable: true },
    },
    '@timestamp': {
      date: { type: 'date', metadata_field: false, searchable: true, aggregatable: true },
    },
    _index: {
      _index: { type: '_index', metadata_field: true, searchable: true, aggregatable: true },
    },
    _source: {
      _source: { type: '_source', metadata_field: true, searchable: false, aggregatable: false },
    },
    _id: { _id: { type: '_id', metadata_field: true, searchable: true, aggregatable: false } },
    _version: {
      _version: { type: '_version', metadata_field: true, searchable: false, aggregatable: true },
    },
    items: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
  },
};
