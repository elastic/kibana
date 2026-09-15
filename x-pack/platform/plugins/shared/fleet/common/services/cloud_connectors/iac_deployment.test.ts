/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAwsRegionFromArn } from './iac_deployment';

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
