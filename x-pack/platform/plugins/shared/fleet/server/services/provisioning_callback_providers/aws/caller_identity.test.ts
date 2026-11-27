/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import { STS_GET_CALLER_IDENTITY_BODY } from '../../../types/rest_spec/provisioning_callback_providers/aws';

import {
  CALLER_IDENTITY_CALLBACK_ID_HEADER,
  CALLER_IDENTITY_REPORT_DIGEST_HEADER,
  canonicalReportDigest,
  isGeneratedResourceName,
  verifyCallerIdentity,
} from './caller_identity';

const ACCOUNT = '123456789012';
const STACK_NAME = 'elastic-wif';
const REPORT = {
  role_arn: `arn:aws:iam::${ACCOUNT}:role/ElasticWorkloadIdentity-abc`,
  stack_arn: `arn:aws:cloudformation:eu-west-1:${ACCOUNT}:stack/${STACK_NAME}/11111111-2222-3333-4444-555555555555`,
};
const CALLBACK_ID = 'cb-1';
const CALLER_ARN = `arn:aws:sts::${ACCOUNT}:assumed-role/${STACK_NAME}-ElasticCallbackFunctionRole-1A2B3C4D5E6F/${STACK_NAME}-ElasticCallbackFunction-A1B2C3D4E5F6`;

const SIGNED_HEADERS =
  'content-type;host;x-amz-date;x-amz-security-token;x-elastic-callback-id;x-elastic-report-sha256';
const authorization = (region = 'eu-west-1', signedHeaders = SIGNED_HEADERS) =>
  `AWS4-HMAC-SHA256 Credential=ASIAEXAMPLE/20261113/${region}/sts/aws4_request, SignedHeaders=${signedHeaders}, Signature=${'ab'.repeat(
    32
  )}`;

/** The proof as the Lambda builds it. The signature is not checked here; STS does that. */
const proofFor = (
  overrides: { region?: string; headers?: Record<string, string>; body?: string } = {}
) => ({
  region: 'eu-west-1',
  headers: {
    Authorization: authorization(),
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Amz-Date': '20261113T100000Z',
    'X-Amz-Security-Token': 'session-token',
    [CALLER_IDENTITY_CALLBACK_ID_HEADER]: CALLBACK_ID,
    [CALLER_IDENTITY_REPORT_DIGEST_HEADER]: canonicalReportDigest(REPORT),
    ...overrides.headers,
  },
  body: overrides.body ?? STS_GET_CALLER_IDENTITY_BODY,
  ...(overrides.region ? { region: overrides.region } : {}),
});

const identityXml = (account = ACCOUNT, arn = CALLER_ARN) =>
  `<GetCallerIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/"><GetCallerIdentityResult><UserId>AROAEXAMPLE:fn</UserId><Account>${account}</Account><Arn>${arn}</Arn></GetCallerIdentityResult></GetCallerIdentityResponse>`;

/** A fake STS: records what was forwarded and answers with the given status and body. */
const fakeSts = (status = 200, body: string | ReadableStream<Uint8Array> = identityXml()) => {
  const calls: Array<{ url: string; init: any }> = [];
  const fetch = jest.fn(async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    return new Response(body, { status }) as any;
  });
  return { fetch: fetch as any, calls };
};

const verify = (proof = proofFor(), sts = fakeSts(), expectation = {}) =>
  verifyCallerIdentity(
    proof,
    { callbackId: CALLBACK_ID, report: REPORT, ...expectation },
    { fetch: sts.fetch }
  );

describe('canonicalReportDigest', () => {
  it('hashes the values with sorted keys and no whitespace, as the Lambda does', () => {
    const expected = createHash('sha256')
      .update(`{"role_arn":"${REPORT.role_arn}","stack_arn":"${REPORT.stack_arn}"}`)
      .digest('hex');
    expect(canonicalReportDigest(REPORT)).toBe(expected);
    expect(canonicalReportDigest({ stack_arn: REPORT.stack_arn, role_arn: REPORT.role_arn })).toBe(
      expected
    );
  });

  it('escapes non-ASCII as Python json.dumps does', () => {
    const expected = createHash('sha256')
      .update('{"role_arn":"arn:aws:iam::123456789012:role/r\\u00f4le","stack_arn":"s"}')
      .digest('hex');
    expect(
      canonicalReportDigest({ role_arn: 'arn:aws:iam::123456789012:role/rôle', stack_arn: 's' })
    ).toBe(expected);
  });
});

describe('isGeneratedResourceName', () => {
  it('accepts the name CloudFormation generates, with either part cut short', () => {
    expect(
      isGeneratedResourceName(
        'elastic-wif-ElasticCallbackFunction-A1B2C3D4E5F6',
        'elastic-wif',
        'ElasticCallbackFunction'
      )
    ).toBe(true);
    // A long stack name: the parts are cut so that the name fills the 64-character limit.
    expect(
      isGeneratedResourceName(
        'averylongstacknameforelasti-ElasticCallbackFunction-A1B2C3D4E5F6',
        'averylongstacknameforelasticidentityfederationinproduction',
        'ElasticCallbackFunction'
      )
    ).toBe(true);
    expect(
      isGeneratedResourceName(
        'averylongstacknameforel-ElasticCallbackFunctionRole-1A2B3C4D5E6F',
        'averylongstacknameforelasticidentityfederationinproduction',
        'ElasticCallbackFunctionRole'
      )
    ).toBe(true);
  });

  it('accepts the 13-character random part older CloudFormation appended', () => {
    expect(
      isGeneratedResourceName(
        'elastic-wif-ElasticCallbackFunctionRole-1OFGT3XJS5J3H',
        'elastic-wif',
        'ElasticCallbackFunctionRole'
      )
    ).toBe(true);
  });

  it('wants both parts whole when they fit, and a cut name within the limit when they do not', () => {
    // Cut short although the whole name would fit: not what CloudFormation generates.
    expect(
      isGeneratedResourceName(
        'elastic-wi-ElasticCallbackFunction-A1B2C3D4E5F6',
        'elastic-wif',
        'ElasticCallbackFunction'
      )
    ).toBe(false);
    expect(
      isGeneratedResourceName('e-E-A1B2C3D4E5F6', 'elastic-wif', 'ElasticCallbackFunction')
    ).toBe(false);
    // Cut shorter than the limit: how far CloudFormation cuts is not documented, so any length
    // within the limit is taken.
    expect(
      isGeneratedResourceName(
        'averylongstackname-ElasticCallbackFunction-A1B2C3D4E5F6',
        'averylongstacknameforelasticidentityfederationinproduction',
        'ElasticCallbackFunction'
      )
    ).toBe(true);
    // Cut, yet longer than the limit it would have been cut for: not a generated name.
    expect(
      isGeneratedResourceName(
        'averylongstacknameforelasticidentityfederationinproduc-ElasticCallbackFunction-A1B2C3D4E5F6',
        'averylongstacknameforelasticidentityfederationinproduction',
        'ElasticCallbackFunction'
      )
    ).toBe(false);
  });

  it('accepts the mixed-case random part current CloudFormation appends', () => {
    expect(
      isGeneratedResourceName(
        'elastic-wif-ElasticCallbackFunction-Ch7ZZ1J4zxQp',
        'elastic-wif',
        'ElasticCallbackFunction'
      )
    ).toBe(true);
  });

  it('wants the random part CloudFormation appends: 12 or 13 alphanumerics', () => {
    expect(
      isGeneratedResourceName(
        'elastic-wif-ElasticCallbackFunction-A1B2C3D4E5F',
        'elastic-wif',
        'ElasticCallbackFunction'
      )
    ).toBe(false);
    expect(
      isGeneratedResourceName(
        'elastic-wif-ElasticCallbackFunction-A1B2C3D4E5F6G7',
        'elastic-wif',
        'ElasticCallbackFunction'
      )
    ).toBe(false);
    expect(isGeneratedResourceName('e-E-1', 'elastic-wif', 'ElasticCallbackFunction')).toBe(false);
  });

  it('accepts a name cut short only because its random part is 13 characters long', () => {
    // 23-character stack name + role logical id + 12 random characters fit in 64; with 13 the
    // name does not, so CloudFormation cuts the stack name by one.
    expect(
      isGeneratedResourceName(
        'abcdefghijklmnopqrstuv-ElasticCallbackFunctionRole-1OFGT3XJS5J3H',
        'abcdefghijklmnopqrstuvw',
        'ElasticCallbackFunctionRole'
      )
    ).toBe(true);
  });

  it('rejects another stack, another resource, or a hand-named resource', () => {
    expect(
      isGeneratedResourceName(
        'other-stack-ElasticCallbackFunction-A1B2C3D4E5F6',
        'elastic-wif',
        'ElasticCallbackFunction'
      )
    ).toBe(false);
    expect(
      isGeneratedResourceName(
        'elastic-wif-OtherFunction-A1B2C3D4E5F6',
        'elastic-wif',
        'ElasticCallbackFunction'
      )
    ).toBe(false);
    expect(
      isGeneratedResourceName('ElasticCallbackFunction', 'elastic-wif', 'ElasticCallbackFunction')
    ).toBe(false);
    expect(
      isGeneratedResourceName(
        'elastic-wif-ElasticCallbackFunction-',
        'elastic-wif',
        'ElasticCallbackFunction'
      )
    ).toBe(false);
    // A role name is not a function name.
    expect(
      isGeneratedResourceName(
        'elastic-wif-ElasticCallbackFunctionRole-A1B2C3D4E5F6',
        'elastic-wif',
        'ElasticCallbackFunction'
      )
    ).toBe(false);
  });
});

describe('verifyCallerIdentity', () => {
  it('forwards only the signed headers and the fixed body to the regional STS endpoint, and accepts the stack callback function', async () => {
    const sts = fakeSts();
    const result = await verify(
      proofFor({ headers: { 'X-Evil': 'dropped', Host: 'evil.example' } }),
      sts
    );

    expect(result).toEqual({ verified: true, account: ACCOUNT, arn: CALLER_ARN });
    expect(sts.calls).toHaveLength(1);
    const [{ url, init }] = sts.calls;
    expect(url).toBe('https://sts.eu-west-1.amazonaws.com/');
    expect(init.method).toBe('POST');
    expect(init.redirect).toBe('manual');
    expect(init.body).toBe(STS_GET_CALLER_IDENTITY_BODY);
    expect(init.headers).toEqual({
      authorization: authorization(),
      'content-type': 'application/x-www-form-urlencoded',
      'x-amz-date': '20261113T100000Z',
      'x-amz-security-token': 'session-token',
      [CALLER_IDENTITY_CALLBACK_ID_HEADER]: CALLBACK_ID,
      [CALLER_IDENTITY_REPORT_DIGEST_HEADER]: canonicalReportDigest(REPORT),
    });
  });

  it('forwards whatever headers the signature covers, so a signer that signs more is not refused', async () => {
    const sts = fakeSts();
    const result = await verify(
      proofFor({
        headers: {
          Authorization: authorization('eu-west-1', `${SIGNED_HEADERS};x-amz-content-sha256`),
          'X-Amz-Content-Sha256':
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          Host: 'sts.eu-west-1.amazonaws.com',
        },
      }),
      sts
    );

    expect(result).toEqual({ verified: true, account: ACCOUNT, arn: CALLER_ARN });
    const [{ init }] = sts.calls;
    expect(init.headers['x-amz-content-sha256']).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
    // The host is the one Kibana connects to, never one the caller names.
    expect(init.headers.host).toBe(undefined);
  });

  it('rejects a proof whose signature covers a header it did not send, without contacting STS', async () => {
    const sts = fakeSts();
    const result = await verify(
      proofFor({
        headers: {
          Authorization: authorization('eu-west-1', `${SIGNED_HEADERS};x-amz-content-sha256`),
        },
      }),
      sts
    );
    expect(result).toEqual({
      verified: false,
      reason: 'malformed_authorization',
      detail: 'signed header not sent: x-amz-content-sha256',
    });
    expect(sts.calls).toHaveLength(0);
  });

  it('sends to the configured endpoint instead when one is set', async () => {
    const sts = fakeSts();
    await verifyCallerIdentity(
      proofFor(),
      { callbackId: CALLBACK_ID, report: REPORT },
      { fetch: sts.fetch, stsUrl: 'http://localhost:8091/' }
    );
    expect(sts.calls[0].url).toBe('http://localhost:8091/');
  });

  it.each([
    ['a region that is not one', 'eu-west-1.evil.example'],
    ['a region with a path', 'eu-west-1/evil'],
    ['an empty region', ''],
    // The China partition's STS is at amazonaws.com.cn, which neither side targets.
    ['a China region', 'cn-north-1'],
  ])('rejects %s without contacting STS', async (_, region) => {
    const sts = fakeSts();
    const result = await verify({ ...proofFor(), region }, sts);
    expect(result).toEqual({ verified: false, reason: 'invalid_region' });
    expect(sts.calls).toHaveLength(0);
  });

  it('rejects a proof signed for another callback id without contacting STS', async () => {
    const sts = fakeSts();
    const result = await verify(
      proofFor({ headers: { [CALLER_IDENTITY_CALLBACK_ID_HEADER]: 'cb-2' } }),
      sts
    );
    expect(result).toEqual({ verified: false, reason: 'proof_not_bound', detail: 'callback id' });
    expect(sts.calls).toHaveLength(0);
  });

  it('rejects a proof whose signed digest is not of the values received', async () => {
    const sts = fakeSts();
    const tampered = { ...REPORT, role_arn: `arn:aws:iam::${ACCOUNT}:role/Other` };
    const result = await verify(proofFor(), sts, { report: tampered });
    expect(result).toEqual({ verified: false, reason: 'proof_not_bound', detail: 'report digest' });
    expect(sts.calls).toHaveLength(0);
  });

  it('rejects a proof that did not sign the binding headers, so STS could not check them', async () => {
    const sts = fakeSts();
    const result = await verify(
      proofFor({
        headers: { Authorization: authorization('eu-west-1', 'content-type;host;x-amz-date') },
      }),
      sts
    );
    expect(result).toEqual({ verified: false, reason: 'unsigned_binding' });
    expect(sts.calls).toHaveLength(0);
  });

  it('rejects a proof without a host in the signed headers', async () => {
    const result = await verify(
      proofFor({
        headers: {
          Authorization: authorization(
            'eu-west-1',
            'content-type;x-amz-date;x-elastic-callback-id;x-elastic-report-sha256'
          ),
        },
      })
    );
    expect(result).toEqual({ verified: false, reason: 'unsigned_binding' });
  });

  it.each([
    ['no Authorization header', { Authorization: '' }],
    ['a non-SigV4 Authorization header', { Authorization: 'Basic abc' }],
    ['a credential scope for another region', { Authorization: authorization('us-east-1') }],
    [
      'a credential scope for another service',
      {
        Authorization: `AWS4-HMAC-SHA256 Credential=ASIAEXAMPLE/20261113/eu-west-1/s3/aws4_request, SignedHeaders=${SIGNED_HEADERS}, Signature=${'ab'.repeat(
          32
        )}`,
      },
    ],
  ])('rejects %s without contacting STS', async (_, headers) => {
    const sts = fakeSts();
    const result = await verify(proofFor({ headers }), sts);
    expect(result).toMatchObject({ verified: false, reason: 'malformed_authorization' });
    expect(sts.calls).toHaveLength(0);
  });

  it('rejects a proof over another body without contacting STS', async () => {
    const sts = fakeSts();
    const result = await verify(proofFor({ body: 'Action=AssumeRole&Version=2011-06-15' }), sts);
    expect(result).toMatchObject({ verified: false, reason: 'malformed_authorization' });
    expect(sts.calls).toHaveLength(0);
  });

  it('is unreachable when STS does not answer', async () => {
    const fetch = jest.fn(async () => {
      throw Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    });
    const result = await verify(proofFor(), { fetch, calls: [] });
    expect(result).toEqual({ verified: false, reason: 'sts_unreachable', detail: 'TimeoutError' });
  });

  it('is rejected when STS refuses the signature', async () => {
    const result = await verify(
      proofFor(),
      fakeSts(
        403,
        '<ErrorResponse><Error><Code>SignatureDoesNotMatch</Code></Error></ErrorResponse>'
      )
    );
    expect(result).toEqual({ verified: false, reason: 'sts_rejected', detail: 'http 403' });
  });

  it('is rejected when STS redirects, since the redirect is not followed', async () => {
    const result = await verify(proofFor(), fakeSts(302, ''));
    expect(result).toEqual({ verified: false, reason: 'sts_rejected', detail: 'http 302' });
  });

  it('stops reading an answer past the size limit, and rejects it', async () => {
    // An answer far past the limit: a reader that takes all of it reads 256 KiB for nothing.
    const cancel = jest.fn();
    let pulls = 0;
    const oversized = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (++pulls > 256) {
          controller.close();
          return;
        }
        controller.enqueue(new Uint8Array(1024));
      },
      cancel,
    });
    const result = await verify(proofFor(), fakeSts(200, oversized));
    expect(result).toEqual({
      verified: false,
      reason: 'sts_rejected',
      detail: 'response larger than 16384 bytes',
    });
    expect(cancel).toHaveBeenCalled();
    expect(pulls).toBeLessThan(32);
  });

  it('is rejected when the answer is not a caller identity', async () => {
    const result = await verify(proofFor(), fakeSts(200, '<html>not sts</html>'));
    expect(result).toEqual({
      verified: false,
      reason: 'sts_rejected',
      detail: 'no caller identity in the response',
    });
  });

  it('rejects a signer from another account than the reported role and stack', async () => {
    const other = '999999999999';
    const result = await verify(
      proofFor(),
      fakeSts(200, identityXml(other, CALLER_ARN.replace(ACCOUNT, other)))
    );
    expect(result).toEqual({ verified: false, reason: 'account_mismatch' });
  });

  it('rejects a signer from another partition than the reported role and stack', async () => {
    // The same account number exists in every partition; the signer must be in this one.
    const result = await verify(
      proofFor(),
      fakeSts(200, identityXml(ACCOUNT, CALLER_ARN.replace('arn:aws:', 'arn:aws-us-gov:')))
    );
    expect(result).toEqual({ verified: false, reason: 'account_mismatch', detail: 'partition' });
  });

  it('rejects a region outside the partition of the reported ARNs without contacting STS', async () => {
    const sts = fakeSts();
    const result = await verify(
      proofFor({
        region: 'us-gov-west-1',
        headers: { Authorization: authorization('us-gov-west-1') },
      }),
      sts
    );
    expect(result).toEqual({
      verified: false,
      reason: 'invalid_region',
      detail: 'region is not in the partition of the reported role',
    });
    expect(sts.calls).toHaveLength(0);
  });

  it.each([
    ['an IAM user', `arn:aws:iam::${ACCOUNT}:user/alice`],
    ['the account root', `arn:aws:iam::${ACCOUNT}:root`],
    ['another role in the account', `arn:aws:sts::${ACCOUNT}:assumed-role/Admin/alice`],
    [
      'the OIDC provider function of the stack',
      `arn:aws:sts::${ACCOUNT}:assumed-role/${STACK_NAME}-WiiOidcProviderFunctionRole-1A2B3C4D5E6F/${STACK_NAME}-WiiOidcProviderFunction-A1B2C3D4E5F6`,
    ],
    [
      'the callback function of another stack',
      `arn:aws:sts::${ACCOUNT}:assumed-role/other-ElasticCallbackFunctionRole-1A2B3C4D5E6F/other-ElasticCallbackFunction-A1B2C3D4E5F6`,
    ],
    [
      'the callback role under a hand-picked session name',
      `arn:aws:sts::${ACCOUNT}:assumed-role/${STACK_NAME}-ElasticCallbackFunctionRole-1A2B3C4D5E6F/attacker`,
    ],
  ])('rejects %s in the right account', async (_, arn) => {
    const result = await verify(proofFor(), fakeSts(200, identityXml(ACCOUNT, arn)));
    expect(result).toEqual({ verified: false, reason: 'not_callback_function' });
  });

  it('accepts the callback function of a stack with a long name, whose generated names are cut short', async () => {
    const stackName = 'averylongstacknameforelasticidentityfederationinproduction';
    const report = {
      ...REPORT,
      stack_arn: `arn:aws:cloudformation:eu-west-1:${ACCOUNT}:stack/${stackName}/11111111-2222-3333-4444-555555555555`,
    };
    const arn = `arn:aws:sts::${ACCOUNT}:assumed-role/averylongstacknameforel-ElasticCallbackFunctionRole-1A2B3C4D5E6F/averylongstacknameforelasti-ElasticCallbackFunction-A1B2C3D4E5F6`;
    const proof = proofFor({
      headers: { [CALLER_IDENTITY_REPORT_DIGEST_HEADER]: canonicalReportDigest(report) },
    });
    const result = await verify(proof, fakeSts(200, identityXml(ACCOUNT, arn)), { report });
    expect(result).toEqual({ verified: true, account: ACCOUNT, arn });
  });

  it('accepts a GovCloud region and partition', async () => {
    const report = {
      role_arn: `arn:aws-us-gov:iam::${ACCOUNT}:role/ElasticWorkloadIdentity-abc`,
      stack_arn: `arn:aws-us-gov:cloudformation:us-gov-west-1:${ACCOUNT}:stack/${STACK_NAME}/11111111-2222-3333-4444-555555555555`,
    };
    const arn = `arn:aws-us-gov:sts::${ACCOUNT}:assumed-role/${STACK_NAME}-ElasticCallbackFunctionRole-1A2B3C4D5E6F/${STACK_NAME}-ElasticCallbackFunction-A1B2C3D4E5F6`;
    const sts = fakeSts(200, identityXml(ACCOUNT, arn));
    const proof = proofFor({
      region: 'us-gov-west-1',
      headers: {
        Authorization: authorization('us-gov-west-1'),
        [CALLER_IDENTITY_REPORT_DIGEST_HEADER]: canonicalReportDigest(report),
      },
    });
    const result = await verify(proof, sts, { report });
    expect(result).toEqual({ verified: true, account: ACCOUNT, arn });
    expect(sts.calls[0].url).toBe('https://sts.us-gov-west-1.amazonaws.com/');
  });
});
