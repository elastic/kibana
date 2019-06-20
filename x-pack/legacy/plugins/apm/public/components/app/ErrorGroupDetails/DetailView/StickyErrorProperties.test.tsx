/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { APMError } from '../../../../../typings/es_schemas/ui/APMError';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { StickyErrorProperties } from './StickyErrorProperties';

describe('StickyErrorProperties', () => {
  it('should render StickyProperties', () => {
    const transaction = {
      http: { request: { method: 'GET' } },
      url: { full: 'myUrl' },
      trace: { id: 'traceId' },
      transaction: {
        type: 'myTransactionType',
        name: 'myTransactionName',
        id: 'myTransactionName'
      },
      service: { name: 'myService' },
      user: { id: 'myUserId' }
    } as Transaction;

    const error = {
      '@timestamp': 'myTimestamp',
      http: { request: { method: 'GET' } },
      url: { full: 'myUrl' },
      service: { name: 'myService' },
      user: { id: 'myUserId' },
      error: { exception: [{ handled: true }] },
      transaction: { id: 'myTransactionId', sampled: true }
    } as APMError;

    const wrapper = shallow(
      <StickyErrorProperties error={error} transaction={transaction} />
    );

    expect(wrapper).toMatchSnapshot();
  });
});
