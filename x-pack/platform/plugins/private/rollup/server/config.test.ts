/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('rollup config', () => {
  it('has the Rollup UI disabled by default', () => {
    expect(config.schema.validate({}, { serverless: false }).ui.enabled).toBe(false);
  });
});
