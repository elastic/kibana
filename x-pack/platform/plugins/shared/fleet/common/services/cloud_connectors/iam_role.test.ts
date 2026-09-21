/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIamRoleArn } from './iam_role';

describe('isIamRoleArn', () => {
  it.each([
    ['arn:aws:iam::123456789012:role/MyRole'],
    ['arn:aws:iam::123456789012:role/service-role/MyRole'],
    ['arn:aws:iam::123456789012:role/path/with/segments/MyRole'],
    ['arn:aws-us-gov:iam::123456789012:role/GovRole'],
    ['arn:aws-cn:iam::123456789012:role/ChinaRole'],
    ['arn:aws-iso:iam::123456789012:role/IsoRole'],
    ['arn:aws-iso-b:iam::123456789012:role/IsoBRole'],
    ['arn:aws-eusc:iam::123456789012:role/EuscRole'],
    ['arn:aws:iam::123456789012:role/Chars-_+=,.@'],
  ])('accepts %s', (arn) => {
    expect(isIamRoleArn(arn)).toBe(true);
  });

  it.each([
    ['', 'empty string'],
    ['not-an-arn', 'plain string'],
    ['arn:aws:iam::123456789012:user/Alice', 'IAM user ARN'],
    ['arn:aws:iam::123456789012:policy/MyPolicy', 'IAM policy ARN'],
    [
      'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/uuid',
      'CloudFormation stack ARN',
    ],
    ['arn:aws:iam::abc:role/BadAccount', 'non-numeric account'],
    ['arn:aws:iam::12345:role/ShortAccount', '11-digit account'],
    ['arn:aws:iam::123456789012:role/', 'empty role name'],
    ['arn:aws:iam:us-east-1:123456789012:role/RegionInIam', 'region present in iam ARN'],
    ['arn:something:iam::123456789012:role/UnknownPartition', 'unknown partition'],
    [undefined as unknown as string, 'undefined'],
  ])('rejects %s (%s)', (value) => {
    expect(isIamRoleArn(value)).toBe(false);
  });
});
