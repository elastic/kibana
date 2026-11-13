/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReceiveProvisioningCallbackRequestSchema } from './provisioning_callback';

const ACCOUNT = '123456789012';
const PROOF = {
  region: 'eu-west-1',
  headers: {
    Authorization:
      'AWS4-HMAC-SHA256 Credential=ASIAEXAMPLE/20261113/eu-west-1/sts/aws4_request, ...',
    'X-Amz-Date': '20261113T100000Z',
    'x-elastic-callback-id': 'cb-1',
    'x-elastic-report-sha256': 'a'.repeat(64),
  },
  body: 'Action=GetCallerIdentity&Version=2011-06-15',
};
const BODY = {
  role_arn: `arn:aws:iam::${ACCOUNT}:role/ElasticWorkloadIdentity-abc`,
  stack_arn: `arn:aws:cloudformation:eu-west-1:${ACCOUNT}:stack/elastic-wif/11111111-2222-3333-4444-555555555555`,
  caller_identity: PROOF,
};

const validate = (body: unknown) => ReceiveProvisioningCallbackRequestSchema.body.validate(body);

describe('ReceiveProvisioningCallbackRequestSchema', () => {
  it('accepts a report with its proof', () => {
    expect(validate(BODY)).toEqual(BODY);
  });

  it('requires the proof', () => {
    const { caller_identity: _, ...withoutProof } = BODY;
    expect(() => validate(withoutProof)).toThrow(/caller_identity/);
  });

  it.each([
    ['a region that is not one', { region: 'sts.evil.example' }],
    ['a region with a slash', { region: 'eu-west-1/x' }],
    ['another body', { body: 'Action=AssumeRole&Version=2011-06-15' }],
    ['a header name too long for a header', { headers: { ['h'.repeat(65)]: 'v' } }],
    ['a header value past the limit', { headers: { Authorization: 'x'.repeat(8193) } }],
    [
      'more headers than SigV4 needs',
      { headers: Object.fromEntries(Array.from({ length: 17 }, (__, i) => [`h${i}`, 'v'])) },
    ],
  ])('rejects %s', (_, overrides) => {
    expect(() => validate({ ...BODY, caller_identity: { ...PROOF, ...overrides } })).toThrow();
  });

  it('rejects an unknown proof field, so no URL can be smuggled in', () => {
    expect(() =>
      validate({ ...BODY, caller_identity: { ...PROOF, url: 'https://evil.example/' } })
    ).toThrow(/url/);
  });
});
