/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ResetResourcesRoute } from './reset_resources_route';

describe('ResetResourcesRoute.validate', () => {
  it('is no longer false (validation is enabled)', () => {
    expect(ResetResourcesRoute.validate).not.toBe(false);
  });

  it('declares a 204 response', () => {
    const { validate } = ResetResourcesRoute;
    if (!validate || typeof validate === 'boolean') {
      throw new Error('expected validate to be an object');
    }
    expect(validate.response).toBeDefined();
    expect(validate.response![204]).toBeDefined();
    expect(validate.response![204]!.description).toBe('Resources were reset successfully.');
  });
});
