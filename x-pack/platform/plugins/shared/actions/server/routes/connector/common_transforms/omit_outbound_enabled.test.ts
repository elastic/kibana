/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitOutboundEnabledFromConfig } from './omit_outbound_enabled';

describe('omitOutboundEnabledFromConfig', () => {
  it('removes outboundEnabled', () => {
    expect(omitOutboundEnabledFromConfig({ a: 1, outboundEnabled: false })).toEqual({ a: 1 });
  });

  it('keeps other keys', () => {
    expect(omitOutboundEnabledFromConfig({ a: 1, b: 'x' })).toEqual({ a: 1, b: 'x' });
  });

  it('passes undefined through', () => {
    expect(omitOutboundEnabledFromConfig(undefined)).toBeUndefined();
  });
});
