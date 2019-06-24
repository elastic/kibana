/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { APMError } from '../../../../../typings/es_schemas/ui/APMError';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { IStickyProperty } from '../../../shared/StickyProperties';
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

  describe('error.exception.handled', () => {
    function getIsHandledValue(error: APMError) {
      const wrapper = shallow(
        <StickyErrorProperties error={error} transaction={undefined} />
      );

      const stickyProps = wrapper.prop('stickyProperties') as IStickyProperty[];
      const handledProp = stickyProps.find(
        prop => prop.fieldName === 'error.exception.handled'
      );

      return handledProp && handledProp.val;
    }

    it('should should render "true"', () => {
      const error = { error: { exception: [{ handled: true }] } } as APMError;
      const isHandledValue = getIsHandledValue(error);
      expect(isHandledValue).toBe('true');
    });

    it('should should render "false"', () => {
      const error = { error: { exception: [{ handled: false }] } } as APMError;
      const isHandledValue = getIsHandledValue(error);
      expect(isHandledValue).toBe('false');
    });

    it('should should render "N/A"', () => {
      const error = {} as APMError;
      const isHandledValue = getIsHandledValue(error);
      expect(isHandledValue).toBe('N/A');
    });
  });
});
