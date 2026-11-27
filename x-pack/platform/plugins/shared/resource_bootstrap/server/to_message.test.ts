/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toMessage } from './to_message';

describe('toMessage', () => {
  it('uses the message of an error', () => {
    expect(toMessage(new Error('boom'))).toBe('boom');
  });

  it('keeps a string as it is', () => {
    expect(toMessage('boom')).toBe('boom');
  });

  it('turns anything else that was thrown into a string', () => {
    expect(toMessage(undefined)).toBe('undefined');
    expect(toMessage(42)).toBe('42');
    expect(toMessage({ statusCode: 500 })).toBe('[object Object]');
  });
});
