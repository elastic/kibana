/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTransactionTypes } from './get_transaction_types';
import {
  SearchParamsMock,
  inspectSearchParams
} from '../../../public/utils/testHelpers';

describe('services queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches the transaction types without service name', async () => {
    mock = await inspectSearchParams(setup => getTransactionTypes({ setup }));

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches the transaction types with a service name', async () => {
    mock = await inspectSearchParams(setup =>
      getTransactionTypes({ setup, serviceName: 'foo' })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
