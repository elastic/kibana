/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, ShallowWrapper } from 'enzyme';
import React from 'react';
import { APMError } from '../../../../../typings/es_schemas/ui/APMError';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { IStickyProperty } from '../../../shared/StickyProperties';
import { StickyErrorProperties } from './StickyErrorProperties';
import {
  ERROR_PAGE_URL,
  URL_FULL
} from '../../../../../common/elasticsearch_fieldnames';

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
      agent: { name: 'nodejs' },
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

  it('url.full', () => {
    const error = {
      agent: { name: 'nodejs' },
      url: { full: 'myFullUrl' }
    } as APMError;

    const wrapper = shallow(
      <StickyErrorProperties error={error} transaction={undefined} />
    );
    const urlValue = getValueByFieldName(wrapper, URL_FULL);
    expect(urlValue).toBe('myFullUrl');
  });

  it('error.page.url', () => {
    const error = {
      agent: { name: 'rum-js' },
      error: { page: { url: 'myPageUrl' } }
    } as APMError;

    const wrapper = shallow(
      <StickyErrorProperties error={error} transaction={undefined} />
    );
    const urlValue = getValueByFieldName(wrapper, ERROR_PAGE_URL);
    expect(urlValue).toBe('myPageUrl');
  });

  describe('error.exception.handled', () => {
    it('should should render "true"', () => {
      const error = {
        agent: { name: 'nodejs' },
        error: { exception: [{ handled: true }] }
      } as APMError;
      const wrapper = shallow(
        <StickyErrorProperties error={error} transaction={undefined} />
      );
      const value = getValueByFieldName(wrapper, 'error.exception.handled');
      expect(value).toBe('true');
    });

    it('should should render "false"', () => {
      const error = {
        agent: { name: 'nodejs' },
        error: { exception: [{ handled: false }] }
      } as APMError;
      const wrapper = shallow(
        <StickyErrorProperties error={error} transaction={undefined} />
      );
      const value = getValueByFieldName(wrapper, 'error.exception.handled');
      expect(value).toBe('false');
    });

    it('should should render "N/A"', () => {
      const error = { agent: { name: 'nodejs' } } as APMError;
      const wrapper = shallow(
        <StickyErrorProperties error={error} transaction={undefined} />
      );
      const value = getValueByFieldName(wrapper, 'error.exception.handled');
      expect(value).toBe('N/A');
    });
  });
});

function getValueByFieldName(wrapper: ShallowWrapper, fieldName: string) {
  const stickyProps = wrapper.prop('stickyProperties') as IStickyProperty[];
  const prop = stickyProps.find(p => p.fieldName === fieldName);
  return prop && prop.val;
}
