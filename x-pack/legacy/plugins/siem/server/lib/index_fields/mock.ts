/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexFieldDescriptor } from './types';

export const mockAuditbeatIndexField: IndexFieldDescriptor[] = [
  {
    name: '@timestamp',
    searchable: true,
    type: 'date',
    aggregatable: true,
    format: '',
  },
  {
    name: 'agent.ephemeral_id',
    searchable: true,
    type: 'string',
    aggregatable: true,
    format: '',
  },
  {
    name: 'agent.name',
    searchable: true,
    type: 'string',
    aggregatable: true,
    format: '',
  },
  {
    name: 'agent.type',
    searchable: true,
    type: 'string',
    aggregatable: true,
    format: '',
  },
  {
    name: 'agent.version',
    searchable: true,
    type: 'string',
    aggregatable: true,
    format: '',
  },
];

export const mockFilebeatIndexField: IndexFieldDescriptor[] = [
  {
    name: '@timestamp',
    searchable: true,
    type: 'date',
    aggregatable: true,
    format: '',
  },
  {
    name: 'agent.hostname',
    searchable: true,
    type: 'string',
    aggregatable: true,
    format: '',
  },
  {
    name: 'agent.name',
    searchable: true,
    type: 'string',
    aggregatable: true,
    format: '',
  },
  {
    name: 'agent.version',
    searchable: true,
    type: 'string',
    aggregatable: true,
    format: '',
  },
];

export const mockPacketbeatIndexField: IndexFieldDescriptor[] = [
  {
    name: '@timestamp',
    searchable: true,
    type: 'date',
    aggregatable: true,
    format: '',
  },
  {
    name: 'agent.id',
    searchable: true,
    type: 'string',
    aggregatable: true,
    format: '',
  },
  {
    name: 'agent.type',
    searchable: true,
    type: 'string',
    aggregatable: true,
    format: '',
  },
];
