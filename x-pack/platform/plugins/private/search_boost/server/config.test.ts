/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from './config';

describe('search boost config', () => {
  it('is disabled by default', () => {
    expect(configSchema.validate({})).toEqual({ enabled: false });
  });
});
