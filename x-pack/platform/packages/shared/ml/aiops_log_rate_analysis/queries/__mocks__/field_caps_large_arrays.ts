/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const fieldCapsLargeArraysMock = {
  indices: ['large_array'],
  fields: {
    items: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
  },
};
