/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('proposals config', () => {
  it('turns the plugin on by default in traditional deployments', () => {
    expect(config.schema.validate({}, { serverless: false })).toEqual({ enabled: true });
  });

  it('keeps the plugin off by default in serverless', () => {
    expect(config.schema.validate({}, { serverless: true })).toEqual({ enabled: false });
  });
});
