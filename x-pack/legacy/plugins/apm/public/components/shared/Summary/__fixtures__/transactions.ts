/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';

export const httpOk: Transaction = {
  '@timestamp': '0',
  agent: { name: 'go', version: '0' },
  http: {
    request: { method: 'GET' },
    response: { status_code: 200 }
  },
  processor: { event: 'transaction', name: 'transaction' },
  service: { name: 'testServiceName' },
  timestamp: { us: 0 },
  trace: { id: 'testTrace' },
  transaction: {
    name: 'testTransaction',
    id: 'testId',
    sampled: false,
    type: 'testType',
    duration: { us: 0 }
  }
};

export const httpRumOK: Transaction = {
  '@timestamp': '0',
  agent: { name: 'rum-js', version: '0' },
  http: {
    response: { status_code: 200 }
  },
  processor: { event: 'transaction', name: 'transaction' },
  service: { name: 'testServiceName' },
  timestamp: { us: 0 },
  trace: { id: 'testTrace' },
  transaction: {
    page: {
      url: 'elastic.co'
    },
    name: 'testTransaction',
    id: 'testId',
    sampled: false,
    type: 'testType',
    duration: { us: 0 }
  }
};
