/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CloudConnectorCallbackItemSchema,
  CreateProvisioningCallbackRequestSchema,
  ReceiveProvisioningCallbackRequestSchema,
} from './provisioning_callback';

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
  origin_proof: PROOF,
};

const validate = (body: unknown) => ReceiveProvisioningCallbackRequestSchema.body.validate(body);

describe('ReceiveProvisioningCallbackRequestSchema', () => {
  it('accepts a report with its proof', () => {
    expect(validate(BODY)).toEqual(BODY);
  });

  it('accepts a body without the proof, from a deployment launched before proofs were sent', () => {
    const { origin_proof: _, ...withoutProof } = BODY;
    expect(validate(withoutProof)).toEqual(withoutProof);
  });

  it('knows the proof only under its generic name, not the AWS-only one it had', () => {
    const { origin_proof: proof, ...values } = BODY;
    expect(() => validate({ ...values, caller_identity: proof })).toThrow(/caller_identity/);
  });

  it('rejects a body that is a report for no registered provider', () => {
    expect(() => validate({ origin_proof: PROOF })).toThrow();
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
    expect(() => validate({ ...BODY, origin_proof: { ...PROOF, ...overrides } })).toThrow();
  });

  it('rejects an unknown proof field, so no URL can be smuggled in', () => {
    expect(() =>
      validate({ ...BODY, origin_proof: { ...PROOF, url: 'https://evil.example/' } })
    ).toThrow(/url/);
  });
});

describe('CreateProvisioningCallbackRequestSchema', () => {
  const validateCreate = (body: unknown) =>
    CreateProvisioningCallbackRequestSchema.body.validate(body);

  it('accepts a provider that has a callback receiver', () => {
    expect(validateCreate({ provider: 'aws' })).toEqual({ provider: 'aws' });
  });

  it('rejects a cloud provider without a receiver, naming the ones that have one', () => {
    expect(() => validateCreate({ provider: 'azure' })).toThrow(
      /provisioning callbacks are supported for: aws/
    );
  });

  it('rejects a value that is not a cloud provider at all', () => {
    expect(() => validateCreate({ provider: 'lambda' })).toThrow(/provider/);
  });
});

describe('CloudConnectorCallbackItemSchema', () => {
  it('renders a record of any cloud provider, so a later provider does not break the listing', () => {
    const item = {
      id: 'cb-1',
      provider: 'azure',
      status: 'pending',
      created_at: '2026-11-23T10:00:00.000Z',
      expires_at: '2026-11-23T12:00:00.000Z',
    };
    expect(CloudConnectorCallbackItemSchema.validate(item)).toEqual(item);
  });
});
