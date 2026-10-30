/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIamRoleArn } from './aws_role_arn';

describe('isIamRoleArn', () => {
  it.each([
    'arn:aws:iam::123456789012:role/MyRole',
    'arn:aws:iam::123456789012:role/service-role/My.Role+=,@_-1',
    'arn:aws:iam::123456789012:role/a/b/c/MyRole',
    // IAM paths allow any printable ASCII; only the role name is restricted.
    'arn:aws:iam::123456789012:role/team!prod/MyRole',
    'arn:aws:iam::123456789012:role/a~b#c/d$e%f/MyRole',
    `arn:aws:iam::123456789012:role/${'p'.repeat(510)}/MyRole`,
    'arn:aws-us-gov:iam::123456789012:role/MyRole',
    'arn:aws-cn:iam::123456789012:role/MyRole',
    `arn:aws:iam::123456789012:role/${'a'.repeat(64)}`,
  ])('accepts the role ARN %s', (arn) => {
    expect(isIamRoleArn(arn)).toBe(true);
  });

  it.each<[string | undefined, string]>([
    [undefined, 'undefined'],
    ['', 'empty'],
    ['123456', 'not an ARN'],
    ['arn:aws:iam::12345:role/MyRole', 'a short account id'],
    ['arn:aws:iam:us-east-1:123456789012:role/MyRole', 'a region'],
    ['arn:aws:iam::123456789012:user/MyUser', 'an IAM user'],
    ['arn:aws:iam::123456789012:role/', 'no role name'],
    ['arn:aws:iam::123456789012:role/My Role', 'a space in the name'],
    ['arn:aws:iam::123456789012:role/team prod/MyRole', 'a space in the path'],
    ['arn:aws:iam::123456789012:role/team!prod/My!Role', 'path punctuation in the name'],
    [`arn:aws:iam::123456789012:role/${'p'.repeat(511)}/MyRole`, 'a path longer than 512'],
    [`arn:aws:iam::123456789012:role/${'a'.repeat(65)}`, 'a name longer than 64 characters'],
    ['arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/uuid', 'a stack ARN'],
    ['arn:gcp:iam::123456789012:role/MyRole', 'a non-AWS partition'],
    [' arn:aws:iam::123456789012:role/MyRole', 'leading whitespace'],
    ['arn:aws:iam::123456789012:role/MyRole\n', 'a trailing newline'],
  ])('rejects %p (%s)', (value) => {
    expect(isIamRoleArn(value)).toBe(false);
  });
});
