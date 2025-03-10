/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getIsKibanaRequest } from './get_is_kibana_request';

describe('getIsKibanaRequest', () => {
  it('should ensure the request has a kbn version and referer', () => {
    expect(
      getIsKibanaRequest({
        'kbn-version': 'foo',
        referer: 'somwhere',
      })
    ).toBe(true);
  });

  it('should return false if the kbn version is missing', () => {
    expect(
      getIsKibanaRequest({
        referer: 'somwhere',
      })
    ).toBe(false);
  });

  it('should return false if the referer is missing', () => {
    expect(
      getIsKibanaRequest({
        'kbn-version': 'foo',
      })
    ).toBe(false);
  });
});
