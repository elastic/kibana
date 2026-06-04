/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface IamPolicyDocument {
  Version: string;
  Statement: Array<{
    Sid: string;
    Effect: 'Allow';
    Resource: string;
    Action: string[];
  }>;
}

/**
 * Builds a minimal IAM policy document for display or attachment to an IAM user.
 * Resource is scoped to "*" in V1 — ARNs are not known at the Connect step.
 */
export function buildIamPolicyDocument(actions: string[]): IamPolicyDocument {
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'ElasticAWSGrants',
        Effect: 'Allow',
        Resource: '*',
        Action: [...actions].sort(),
      },
    ],
  };
}

export function formatIamPolicyDocument(actions: string[]): string {
  return JSON.stringify(buildIamPolicyDocument(actions), null, 2);
}
