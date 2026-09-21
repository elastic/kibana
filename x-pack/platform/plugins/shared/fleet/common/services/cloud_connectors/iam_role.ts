/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Deliberately conservative: known AWS partitions (commercial, GovCloud, China, ISO family,
// European Sovereign Cloud). The account id must be 12 digits; the role name must be non-empty
// and use the character set AWS accepts for IAM role names (including slashes for role paths and
// service-linked roles). Widened only when a customer report demands it.
const IAM_ROLE_ARN_REGEX =
  /^arn:(aws|aws-us-gov|aws-cn|aws-eusc|aws-iso|aws-iso-b|aws-iso-e|aws-iso-f):iam::\d{12}:role\/[\w+=,.@/-]+$/;

/** True for a value that is a valid IAM role ARN in any known AWS partition. */
export const isIamRoleArn = (value: string | undefined): boolean =>
  typeof value === 'string' && IAM_ROLE_ARN_REGEX.test(value);
