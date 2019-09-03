/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PROCESSOR_EVENT } from '../../../../../common/elasticsearch_fieldnames';
import { ESResponse, timeseriesFetcher } from './fetcher';

describe('timeseriesFetcher', () => {
  let res: ESResponse;
  let clientSpy: jest.Mock;
  beforeEach(async () => {
    clientSpy = jest.fn().mockResolvedValueOnce('ES response');

    res = await timeseriesFetcher({
      serviceName: 'myServiceName',
      transactionType: 'myTransactionType',
      transactionName: undefined,
      setup: {
        start: 1528113600000,
        end: 1528977600000,
        client: { search: clientSpy } as any,
        config: {
          get: () => 'myIndex' as any,
          has: () => true
        },
        uiFiltersES: [
          {
            term: { 'service.environment': 'test' }
          }
        ]
      }
    });
  });

  it('should call client with correct query', () => {
    expect(clientSpy.mock.calls).toMatchSnapshot();
  });

  it('should restrict results to only transaction documents', () => {
    const query = clientSpy.mock.calls[0][0];
    expect(query.body.query.bool.filter).toEqual(
      expect.arrayContaining([
        {
          term: {
            [PROCESSOR_EVENT]: 'transaction'
          }
        } as any
      ])
    );
  });

  it('should return correct response', () => {
    expect(res).toBe('ES response');
  });
});
