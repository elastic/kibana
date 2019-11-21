/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { transactionGroupsFetcher } from './fetcher';
import {
  SearchParamsMock,
  inspectSearchParams
} from '../../../public/utils/testHelpers';

describe('transaction group queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches top transactions', async () => {
    mock = await inspectSearchParams(setup =>
      transactionGroupsFetcher(
        {
          type: 'top_transactions',
          serviceName: 'foo',
          transactionType: 'bar'
        },
        setup
      )
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches top traces', async () => {
    mock = await inspectSearchParams(setup =>
      transactionGroupsFetcher(
        {
          type: 'top_traces'
        },
        setup
      )
    );

    expect(mock.params).toMatchSnapshot();
  });
});
