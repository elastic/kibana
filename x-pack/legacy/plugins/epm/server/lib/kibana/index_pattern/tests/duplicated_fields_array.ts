/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const duplicatedFieldsArray = [
  {
    name: '@timestamp',
    type: 'date',
  },
  {
    name: '@timestamp',
    type: 'date',
  },
  {
    name: 'message',
    type: 'text',
  },
  {
    name: 'tags',
    type: 'keyword',
  },
  {
    name: 'label',
    type: 'keyword',
  },
  {
    name: 'label',
    type: 'keyword',
  },
];
