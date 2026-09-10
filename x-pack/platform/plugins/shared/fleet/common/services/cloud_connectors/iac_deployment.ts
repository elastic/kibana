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
