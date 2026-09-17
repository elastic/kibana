/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isCloudFormationStackArn, parseAwsRegionFromArn } from './iac_deployment';

describe('isCloudFormationStackArn', () => {
  it.each([
    'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/1234-uuid',
    'arn:aws-us-gov:cloudformation:us-gov-west-1:123456789012:stack/s/u',
    'arn:aws-cn:cloudformation:cn-north-1:123456789012:stack/s/u',
    'arn:aws:cloudformation:eu-west-1:123456789012:stack/My-Stack-Name-1/abcd-1234-EF56',
  ])('accepts the stack ARN %s', (arn) => {
    expect(isCloudFormationStackArn(arn)).toBe(true);
  });

  it.each<[string | undefined, string]>([
    [undefined, 'undefined'],
    ['', 'empty'],
    // Regional, but not a stack: the parser extracts a region from it, the validator must not.
    ['arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/fn:*', 'a CloudWatch Logs ARN'],
    ['arn:aws:iam::123456789012:role/MyRole', 'an IAM role ARN'],
    ['arn:aws:cloudformation::123456789012:stack/s/u', 'no region'],
    ['arn:aws:cloudformation:us-east-1:12345:stack/s/u', 'a short account id'],
    ['arn:aws:cloudformation:us-east-1:123456789012:stackset/s/u', 'a stack set'],
    ['arn:aws:cloudformation:us-east-1:123456789012:stack/s', 'no stack id'],
    ['arn:aws:cloudformation:us-east-1:123456789012:stack/s/u/extra', 'an extra segment'],
    ['arn:gcp:cloudformation:us-east-1:123456789012:stack/s/u', 'a non-AWS partition'],
    ['arn:aws:cloudformation:US-EAST-1:123456789012:stack/s/u', 'an upper-case region'],
    [' arn:aws:cloudformation:us-east-1:123456789012:stack/s/u', 'surrounding whitespace'],
    ['arn:aws:cloudformation:us-east-1:123456789012:stack/s/u ', 'a trailing space'],
    ['arn:aws:cloudformation:us-east-1:123456789012:stack/s/u\n', 'a trailing newline'],
    ['arn:aws:cloudformation:us-east-1:123456789012:stack/s/u?x=1', 'a query string'],
    ['arn:aws:cloudformation:us-east-1:123456789012:stack/s/u#frag', 'a fragment'],
    ['arn:aws:cloudformation:us-east-1:123456789012:stack/<s>/u', 'markup in the name'],
    [
      'arn:aws:cloudformation:us-east-1:123456789012:stack/1stack/u',
      'a name starting with a digit',
    ],
    ['arn:aws:cloudformation:us-east-1:123456789012:stack/my_stack/u', 'an underscore in the name'],
    ['not-an-arn', 'not an ARN'],
  ])('rejects %s (%s)', (value) => {
    expect(isCloudFormationStackArn(value)).toBe(false);
  });
});

describe('parseAwsRegionFromArn', () => {
  it.each([
    ['arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/1234-uuid', 'us-east-1'],
    ['arn:aws-cn:cloudformation:cn-north-1:123456789012:stack/s/u', 'cn-north-1'],
    ['arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/fn:*', 'us-east-1'],
  ])('extracts the region from %s', (arn, region) => {
    expect(parseAwsRegionFromArn(arn)).toBe(region);
  });

  it.each([
    [undefined],
    [''],
    ['arn:aws:iam::123456789012:role/MyRole'],
    ['not-an-arn'],
    ['arn:aws:cloudformation: :123456789012:stack/s/u'],
    ['arn:aws:cloudformation:evil.com/#:123456789012:stack/s/u'],
    ['arn:aws:cloudformation:US-EAST-1:123456789012:stack/s/u'],
    ['arn:aws:cloudformation:us-east-1'],
  ])('returns undefined for %p', (value) => {
    expect(parseAwsRegionFromArn(value)).toBeUndefined();
  });
});
