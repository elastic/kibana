/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetAgentsRequestSchema } from './agent';

describe('GetAgentsRequestSchema', () => {
  it('should allow pagination with less than 10000 agents', () => {
    expect(() =>
      GetAgentsRequestSchema.query.validate({
        page: 500,
        perPage: 20,
      })
    ).not.toThrow();
  });
  it('should not allow pagination to go over 10000 agents', () => {
    expect(() =>
      GetAgentsRequestSchema.query.validate({
        page: 501,
        perPage: 20,
      })
    ).toThrowError(/You cannot use page and perPage page over 10000 agents/);
  });
});
