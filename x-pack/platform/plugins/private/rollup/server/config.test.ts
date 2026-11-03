/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('rollup config', () => {
  it.each([false, true])('accepts enabled: false with serverless: %s', (serverless) => {
    expect(config.schema.validate({ enabled: false }, { serverless }).enabled).toBe(false);
  });

  it('is enabled by default', () => {
    expect(config.schema.validate({}, { serverless: false }).enabled).toBe(true);
  });

  it('has the Rollup UI disabled by default', () => {
    expect(config.schema.validate({}, { serverless: false }).ui.enabled).toBe(false);
  });
});
