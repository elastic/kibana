/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('config', () => {
  it('enables the pattern tester by default', () => {
    expect(config.schema.validate({}).patternTester.enabled).toBe(true);
  });

  it('lets an operator disable the pattern tester', () => {
    expect(
      config.schema.validate({ patternTester: { enabled: false } }).patternTester.enabled
    ).toBe(false);
  });
});
