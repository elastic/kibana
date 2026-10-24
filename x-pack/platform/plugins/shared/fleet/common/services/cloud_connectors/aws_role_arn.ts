/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * An IAM role ARN: `arn:<partition>:iam::<account>:role/<path/><name>`. IAM is global, so the
 * region segment is empty. Following AWS's IAM grammar, the optional path (slashes included, at
 * most 512 characters) allows any printable ASCII, while the role name is limited to
 * `[\w+=,.@-]` and 64 characters.
 */
const IAM_ROLE_ARN_PATTERN =
  /^arn:aws(?:-[a-z]+)*:iam::\d{12}:role\/(?:[\x21-\x7E]{0,510}\/)?[\w+=,.@-]{1,64}$/;

/**
 * Whether `value` is an IAM role ARN. Shared by the browser's Role ARN field and the connector
 * API's `role_arn` validation, so what the UI accepts is what the server stores.
 */
export const isIamRoleArn = (value: string | undefined): boolean =>
  value !== undefined && IAM_ROLE_ARN_PATTERN.test(value);
