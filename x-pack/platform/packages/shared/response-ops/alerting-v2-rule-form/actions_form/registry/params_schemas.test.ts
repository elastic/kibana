/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMAIL_PARAMS_SCHEMA, SLACK2_PARAMS_SCHEMA } from './params_schemas';

const validEmail = { to: ['ops@example.com'], subject: 'Alert', message: 'Body' };
const validSlack = { channel: 'C123', text: 'Hello' };

describe('EMAIL_PARAMS_SCHEMA', () => {
  it.each([
    ['the mandatory keys', validEmail],
    ['cc and bcc lists', { ...validEmail, cc: ['a@example.com'], bcc: ['b@example.com'] }],
    [
      'templated values',
      { to: ['{{ inputs.payload.x }}'], subject: '{{ s }}', message: '{{ m }}' },
    ],
  ])('accepts %s', (_, params) => {
    expect(EMAIL_PARAMS_SCHEMA.safeParse(params).success).toBe(true);
  });

  it('keeps values untouched', () => {
    const params = { ...validEmail, subject: '  Alert  ' };

    expect(EMAIL_PARAMS_SCHEMA.parse(params)).toEqual(params);
  });

  it.each([
    ['missing to', { subject: 'Alert', message: 'Body' }],
    ['missing subject', { to: ['a@example.com'], message: 'Body' }],
    ['missing message', { to: ['a@example.com'], subject: 'Alert' }],
    ['to as a string', { ...validEmail, to: 'a@example.com' }],
    ['empty to', { ...validEmail, to: [] }],
    ['blank to entry', { ...validEmail, to: [''] }],
    ['blank subject', { ...validEmail, subject: '  ' }],
    ['subject as a list', { ...validEmail, subject: ['Alert'] }],
    ['cc as a string', { ...validEmail, cc: 'a@example.com' }],
    ['blank bcc entry', { ...validEmail, bcc: [' '] }],
    ['an unknown key', { ...validEmail, foo: 'bar' }],
  ])('rejects %s', (_, params) => {
    expect(EMAIL_PARAMS_SCHEMA.safeParse(params).success).toBe(false);
  });
});

describe('SLACK2_PARAMS_SCHEMA', () => {
  it.each([
    ['the mandatory keys', validSlack],
    ['templated values', { channel: '{{ c }}', text: 'Hello {{ inputs.payload.policyId }}' }],
  ])('accepts %s', (_, params) => {
    expect(SLACK2_PARAMS_SCHEMA.safeParse(params).success).toBe(true);
  });

  it.each([
    ['missing channel', { text: 'Hello' }],
    ['missing text', { channel: 'C123' }],
    ['blank text', { ...validSlack, text: '' }],
    ['channel as a list', { ...validSlack, channel: ['C123'] }],
    ['text as a number', { ...validSlack, text: 5 }],
    ['an unknown key', { ...validSlack, threadTs: '1' }],
  ])('rejects %s', (_, params) => {
    expect(SLACK2_PARAMS_SCHEMA.safeParse(params).success).toBe(false);
  });
});
