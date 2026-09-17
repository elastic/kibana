/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Charset guard, not AWS region grammar (which changes): rejects whitespace and every URL/HTML
// metacharacter so a stored ARN can never inject into a console deep link.
const AWS_REGION_PATTERN = /^[a-z0-9-]{1,64}$/;

/**
 * A CloudFormation stack ARN: `arn:<partition>:cloudformation:<region>:<account>:stack/<name>/<id>`.
 * Partition variants (`aws-us-gov`, `aws-cn`, ...) are allowed; any other service (an IAM role, a
 * CloudWatch Logs group) is not, even though it has a region. Name and id follow AWS's own
 * grammar (letters, digits, hyphens; the name starts with a letter), which also keeps whitespace
 * and URL metacharacters out of a value that is deep-linked into the console.
 */
const CLOUDFORMATION_STACK_ARN_PATTERN =
  /^arn:aws(?:-[a-z]+)*:cloudformation:[a-z0-9-]{1,64}:\d{12}:stack\/[A-Za-z][A-Za-z0-9-]*\/[A-Za-z0-9-]+$/;

/**
 * Extracts the region segment from an AWS ARN (`arn:partition:service:region:account:resource`);
 * returns undefined when the ARN has no region, as IAM ARNs do not, or when the segment fails a
 * conservative charset check.
 */
export const parseAwsRegionFromArn = (arn: string | undefined): string | undefined => {
  if (!arn) {
    return undefined;
  }
  const parts = arn.split(':');
  if (parts.length < 6 || parts[0] !== 'arn') {
    return undefined;
  }
  const region = parts[3];
  return AWS_REGION_PATTERN.test(region) ? region : undefined;
};

/**
 * Whether `value` is a CloudFormation stack ARN. Shared by the browser's stack ARN fields and the
 * connector API's `iac_deployment_id` validation, so what the UI accepts is what the server
 * stores (https://github.com/elastic/ingest-dev/issues/9415).
 */
export const isCloudFormationStackArn = (value: string | undefined): boolean =>
  value !== undefined && CLOUDFORMATION_STACK_ARN_PATTERN.test(value);
