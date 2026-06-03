/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** IAM action format: service:ActionName (Action may end with *). */
export const IAM_ACTION_PATTERN = /^[a-z0-9-]+:[A-Za-z0-9*]+$/;

/** Valid AWS managed policy ARN format. */
export const MANAGED_POLICY_ARN_PATTERN = /^arn:aws:iam::aws:policy\/[\w+=,.@-]+$/;

const DENY_LIST_PATTERNS: RegExp[] = [
  /^iam:(?!List|Get)/,
  /^sts:AssumeRole/,
  /:PassRole$/,
  /:Create/,
  /:Put/,
  /:Update/,
  /:Attach/,
  /:Write$/,
];

const ALLOWED_EXCEPTIONS = new Set(['sqs:DeleteMessage']);

export function isDeniedIamAction(action: string): boolean {
  if (action === '*') {
    return true;
  }
  if (ALLOWED_EXCEPTIONS.has(action)) {
    return false;
  }
  return DENY_LIST_PATTERNS.some((pattern) => pattern.test(action));
}

export function assertActionsAreSecure(actions: string[]): void {
  for (const action of actions) {
    if (!IAM_ACTION_PATTERN.test(action)) {
      throw new Error(`Invalid IAM action format: ${action}`);
    }
    if (isDeniedIamAction(action)) {
      throw new Error(`Denied IAM action: ${action}`);
    }
  }
}
