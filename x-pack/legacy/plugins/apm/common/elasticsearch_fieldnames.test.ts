/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { AllowUnknownProperties } from '../typings/common';
import { APMError } from '../typings/es_schemas/ui/APMError';
import { Span } from '../typings/es_schemas/ui/Span';
import { Transaction } from '../typings/es_schemas/ui/Transaction';
import * as fieldnames from './elasticsearch_fieldnames';

describe('Transaction', () => {
  const transaction: AllowUnknownProperties<Transaction> = {
    '@timestamp': new Date(1337).toISOString(),
    '@metadata': 'whatever',
    observer: 'whatever',
    agent: {
      name: 'java',
      version: 'agent version'
    },
    http: {
      request: { method: 'GET' },
      response: { status_code: 200 }
    },
    url: { full: 'http://www.elastic.co', domain: 'www.elastic.co' },
    service: {
      name: 'service name',
      language: { name: 'nodejs', version: 'v1337' }
    },
    host: { hostname: 'my hostname' },
    processor: { name: 'transaction', event: 'transaction' },
    timestamp: { us: 1337 },
    trace: { id: 'trace id' },
    user: { id: '1337' },
    user_agent: { name: 'Other', original: 'test original' },
    parent: {
      id: 'parentId'
    },
    transaction: {
      duration: { us: 1337 },
      id: 'transaction id',
      name: 'transaction name',
      result: 'transaction result',
      sampled: true,
      type: 'transaction type'
    },
    kubernetes: {
      pod: {
        uid: 'pod1234567890abcdef'
      }
    },
    container: {
      id: 'container1234567890abcdef'
    }
  };

  matchSnapshot(transaction);
});

describe('Span', () => {
  const span: AllowUnknownProperties<Span> = {
    '@timestamp': new Date(1337).toISOString(),
    '@metadata': 'whatever',
    observer: 'whatever',
    agent: {
      name: 'java',
      version: 'agent version'
    },
    processor: {
      name: 'transaction',
      event: 'span'
    },
    timestamp: {
      us: 1337
    },
    trace: {
      id: 'trace id'
    },
    service: {
      name: 'service name'
    },
    parent: {
      id: 'parentId'
    },
    span: {
      action: 'my action',
      duration: { us: 1337 },
      id: 'span id',
      name: 'span name',
      subtype: 'my subtype',
      sync: false,
      type: 'span type',
      db: {
        statement: 'db statement'
      }
    },
    transaction: {
      id: 'transaction id'
    }
  };

  matchSnapshot(span);
});

describe('Error', () => {
  const errorDoc: AllowUnknownProperties<APMError> = {
    '@metadata': 'whatever',
    observer: 'whatever',
    agent: {
      name: 'java',
      version: 'agent version'
    },
    error: {
      exception: [
        {
          module: 'errors',
          handled: false,
          message: 'sonic boom',
          type: 'errorString'
        }
      ],
      culprit: 'handleOopsie',
      id: 'error id',
      grouping_key: 'grouping key'
    },
    '@timestamp': new Date(1337).toISOString(),
    host: {
      hostname: 'my hostname'
    },
    processor: {
      name: 'error',
      event: 'error'
    },
    timestamp: {
      us: 1337
    },
    trace: {
      id: 'trace id'
    },
    service: {
      name: 'service name',
      language: {
        name: 'nodejs',
        version: 'v1337'
      }
    },
    parent: {
      id: 'parentId'
    },
    transaction: {
      id: 'transaction id',
      type: 'request'
    }
  };

  matchSnapshot(errorDoc);
});

function matchSnapshot(
  obj: AllowUnknownProperties<Span | Transaction | APMError>
) {
  Object.entries(fieldnames).forEach(([key, longKey]) => {
    const value = get(obj, longKey);
    it(key, () => {
      expect(value).toMatchSnapshot();
    });
  });
}
