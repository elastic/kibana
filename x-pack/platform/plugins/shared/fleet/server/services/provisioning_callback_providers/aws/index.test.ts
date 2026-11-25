/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { verifyCallerIdentity } from './caller_identity';

import { awsProvisioningCallbackProvider as aws } from '.';

// Only the STS round trip is mocked; the patterns the schema uses stay real.
jest.mock('./caller_identity', () => ({
  ...jest.requireActual('./caller_identity'),
  verifyCallerIdentity: jest.fn(),
}));

const ROLE_ARN = 'arn:aws:iam::123456789012:role/ElasticWorkloadIdentity-abc';
const STACK_ARN = 'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic/uuid-1';
const REPORT = { role_arn: ROLE_ARN, stack_arn: STACK_ARN };
const PROOF = {
  region: 'us-east-1',
  headers: { Authorization: 'AWS4-HMAC-SHA256 ...' },
  body: 'Action=GetCallerIdentity&Version=2011-06-15',
};

describe('AWS provisioning callback provider', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('reportSchema', () => {
    it('accepts the two ARNs and a signed STS request', () => {
      const body = { ...REPORT, origin_proof: PROOF };
      expect(aws.reportSchema.validate(body)).toEqual(body);
    });

    it('accepts the two ARNs alone, from a stack launched before its Lambda sent a proof', () => {
      expect(aws.reportSchema.validate(REPORT)).toEqual(REPORT);
    });

    it.each([
      ['a role that is not an IAM role ARN', { role_arn: 'arn:aws:iam::123456789012:user/x' }],
      ['a stack that is not a CloudFormation stack ARN', { stack_arn: 'arn:aws:s3:::bucket' }],
      ['a proof for another region format', { origin_proof: { ...PROOF, region: 'sts.evil' } }],
      ['a proof over another body', { origin_proof: { ...PROOF, body: 'Action=AssumeRole' } }],
    ])('rejects %s', (_, overrides) => {
      expect(() =>
        aws.reportSchema.validate({ ...REPORT, origin_proof: PROOF, ...overrides })
      ).toThrow();
    });
  });

  describe('validateReport', () => {
    it('accepts a role and a stack of the same account', () => {
      expect(aws.validateReport(REPORT)).toBeUndefined();
    });

    it('refuses a role and a stack of different accounts', () => {
      expect(
        aws.validateReport({
          ...REPORT,
          stack_arn: 'arn:aws:cloudformation:us-east-1:999999999999:stack/elastic/uuid-1',
        })
      ).toBe('role_arn and stack_arn must be in the same AWS account');
    });
  });

  describe('verifyOrigin', () => {
    it('replays the signed STS request, at the configured endpoint when there is one', async () => {
      jest.mocked(verifyCallerIdentity).mockResolvedValue({
        verified: true,
        account: '123456789012',
        arn: 'arn:aws:sts::x',
      });

      const result = await aws.verifyOrigin(
        PROOF,
        { callbackId: 'cb-1', report: REPORT },
        { verifierUrl: 'http://localhost:8091/' }
      );

      expect(result).toEqual({
        verified: true,
        account: '123456789012',
        principal: 'arn:aws:sts::x',
      });
      expect(verifyCallerIdentity).toHaveBeenCalledWith(
        PROOF,
        { callbackId: 'cb-1', report: REPORT },
        { stsUrl: 'http://localhost:8091/' }
      );
    });
  });

  describe('storedFields', () => {
    it('stores the two ARNs on the record and nothing else', () => {
      expect(aws.storedFields(REPORT)).toEqual({ role_arn: ROLE_ARN, stack_arn: STACK_ARN });
    });
  });

  describe('toConnector', () => {
    it('names the connector after the stored name, or else the role', () => {
      expect(aws.toConnector(REPORT, { connector_name: '  My identity  ' }).name).toBe(
        'My identity'
      );
      expect(aws.toConnector(REPORT, {}).name).toBe('ElasticWorkloadIdentity-abc');
    });

    it('builds an AWS connector with the role as its variable and the stack as its deployment', () => {
      expect(
        aws.toConnector(REPORT, {
          account_type: 'organization-account',
          iac_key: 'sha256:k',
          iac_blueprint_id: 'aws/workload_identity_federation',
          iac_blueprint_version: '1.5.0',
        })
      ).toEqual({
        name: 'ElasticWorkloadIdentity-abc',
        cloudProvider: 'aws',
        accountType: 'organization-account',
        vars: { role_arn: { type: 'text', value: ROLE_ARN } },
        iac_deployment_id: STACK_ARN,
        iac_key: 'sha256:k',
        iac_blueprint_id: 'aws/workload_identity_federation',
        iac_blueprint_version: '1.5.0',
      });
    });

    it('leaves template fields out when the record has none', () => {
      expect(aws.toConnector(REPORT, {})).toEqual({
        name: 'ElasticWorkloadIdentity-abc',
        cloudProvider: 'aws',
        vars: { role_arn: { type: 'text', value: ROLE_ARN } },
        iac_deployment_id: STACK_ARN,
      });
    });
  });
});
