/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Deliberately conservative: known AWS partitions (commercial, GovCloud, China, ISO family,
// European Sovereign Cloud). The account id must be 12 digits.
//
// IAM role ARNs are `:role` + optional path segments + a final role name. Path and name use
// different character sets and length limits (AWS docs):
//   - path segments: printable ASCII except `/` (e.g. `team!prod`); entire path ≤ 512 chars
//   - role name: `A-Za-z0-9_+=,.@-` only, 1–64 chars
// Putting `/` into one repeated class conflates the two and accepts `role/MyRole/` (empty name)
// while rejecting legitimate paths that contain `!`.
const IAM_PATH_SEGMENT = '[\\x21-\\x2E\\x30-\\x7E]+'; // printable ASCII except `/` (\x2F)
const IAM_ROLE_NAME = '[\\w+=,.@-]{1,64}';
const IAM_ROLE_ARN_REGEX = new RegExp(
  `^arn:(aws|aws-us-gov|aws-cn|aws-eusc|aws-iso|aws-iso-b|aws-iso-e|aws-iso-f):iam::\\d{12}:role((?:\\/${IAM_PATH_SEGMENT})*)\\/(${IAM_ROLE_NAME})$`
);

/** IAM path maximum length, including leading and trailing `/` where present. */
const IAM_PATH_MAX_LENGTH = 512;

/**
 * True for a value that is a valid IAM role ARN in any known AWS partition.
 *
 * Line terminators are rejected explicitly: in JavaScript `$` can match before a final `\n`,
 * which would otherwise let `…:role/MyRole\n` through.
 */
export const isIamRoleArn = (value: string | undefined): boolean => {
  if (typeof value !== 'string' || /[\r\n\u2028\u2029]/.test(value)) {
    return false;
  }
  const match = IAM_ROLE_ARN_REGEX.exec(value);
  if (!match) {
    return false;
  }
  // Path is the optional segments plus the slash before the role name (or just `/` when none).
  const pathSegments = match[2] ?? '';
  const path = `${pathSegments}/`;
  return path.length <= IAM_PATH_MAX_LENGTH;
};
