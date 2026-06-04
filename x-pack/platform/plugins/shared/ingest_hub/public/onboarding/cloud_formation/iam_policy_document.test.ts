/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildIamPolicyDocument, formatIamPolicyDocument } from './iam_policy_document';

describe('buildIamPolicyDocument', () => {
  it('returns a sorted Allow statement with V1 Resource scope', () => {
    const policy = buildIamPolicyDocument(['s3:GetObject', 'ec2:DescribeInstances']);

    expect(policy).toEqual({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'ElasticAWSGrants',
          Effect: 'Allow',
          Resource: '*',
          Action: ['ec2:DescribeInstances', 's3:GetObject'],
        },
      ],
    });
  });
});

describe('formatIamPolicyDocument', () => {
  it('returns pretty-printed JSON', () => {
    const formatted = formatIamPolicyDocument(['s3:GetObject']);

    expect(formatted).toContain('"Version": "2012-10-17"');
    expect(formatted).toContain('"Sid": "ElasticAWSGrants"');
    expect(formatted).toContain('"s3:GetObject"');
  });
});
