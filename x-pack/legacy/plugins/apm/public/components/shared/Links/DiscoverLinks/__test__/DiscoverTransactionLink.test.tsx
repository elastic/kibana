/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'jest-styled-components';
import { Transaction } from '../../../../../../typings/es_schemas/ui/Transaction';
// @ts-ignore
import configureStore from '../../../../../store/config/configureStore';
import { getDiscoverQuery } from '../DiscoverTransactionLink';

jest.mock('ui/kfetch');

function getMockTransaction() {
  return {
    transaction: {
      id: '8b60bd32ecc6e150'
    },
    trace: {
      id: '8b60bd32ecc6e1506735a8b6cfcf175c'
    }
  } as Transaction;
}

describe('getDiscoverQuery', () => {
  it('should return the correct query params object', () => {
    const transaction = getMockTransaction();
    const result = getDiscoverQuery(transaction);
    expect(result).toMatchSnapshot();
  });
});
