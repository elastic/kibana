/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALL_INTEGRATIONS_SID,
  buildIamPolicyDocument,
  formatIamPolicyDocument,
  getIntegrationSid,
} from './iam_policy_document';

describe('getIntegrationSid', () => {
  it('returns the aggregated Sid when no name is provided', () => {
    expect(getIntegrationSid()).toBe(ALL_INTEGRATIONS_SID);
    expect(ALL_INTEGRATIONS_SID).toBe('ElasticAWSIntegration');
  });

  it('derives an alphanumeric Sid prefixed with Elastic from the integration name', () => {
    expect(getIntegrationSid('AWS GuardDuty')).toBe('ElasticAWSGuardDuty');
    expect(getIntegrationSid('Amazon EC2')).toBe('ElasticAmazonEC2');
  });

  it('strips non-alphanumeric characters from the name', () => {
    expect(getIntegrationSid('AWS S3 (Access Logs)')).toBe('ElasticAWSS3AccessLogs');
  });

  it('falls back to the aggregated Sid for names with no alphanumeric characters', () => {
    expect(getIntegrationSid('---')).toBe(ALL_INTEGRATIONS_SID);
  });
});

describe('buildIamPolicyDocument', () => {
  it('returns a sorted Allow statement with V1 Resource scope and the default Sid', () => {
    const policy = buildIamPolicyDocument(['s3:GetObject', 'ec2:DescribeInstances']);

    expect(policy).toEqual({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'ElasticAWSIntegration',
          Effect: 'Allow',
          Resource: '*',
          Action: ['ec2:DescribeInstances', 's3:GetObject'],
        },
      ],
    });
  });

  it('uses the provided Sid', () => {
    const policy = buildIamPolicyDocument(['s3:GetObject'], 'ElasticAWSGuardDuty');

    expect(policy.Statement[0].Sid).toBe('ElasticAWSGuardDuty');
  });

  it('de-duplicates actions before sorting', () => {
    const policy = buildIamPolicyDocument([
      's3:GetObject',
      's3:GetObject',
      'ec2:DescribeInstances',
    ]);

    expect(policy.Statement[0].Action).toEqual(['ec2:DescribeInstances', 's3:GetObject']);
  });
});

describe('formatIamPolicyDocument', () => {
  it('returns pretty-printed JSON with the default Sid', () => {
    const formatted = formatIamPolicyDocument(['s3:GetObject']);

    expect(formatted).toContain('"Version": "2012-10-17"');
    expect(formatted).toContain('"Sid": "ElasticAWSIntegration"');
    expect(formatted).toContain('"s3:GetObject"');
  });

  it('returns pretty-printed JSON with a provided Sid', () => {
    const formatted = formatIamPolicyDocument(['s3:GetObject'], 'ElasticAWSGuardDuty');

    expect(formatted).toContain('"Sid": "ElasticAWSGuardDuty"');
  });
});
