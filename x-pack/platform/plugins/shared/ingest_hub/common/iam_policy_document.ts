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

/** Sid used when the policy aggregates permissions across all selected integrations. */
export const ALL_INTEGRATIONS_SID = 'ElasticAWSIntegration';

/**
 * Derives an IAM statement Sid from an integration name.
 * Sids must be alphanumeric, so the name is stripped of non-alphanumeric characters
 * and prefixed with "Elastic" (e.g. "AWS GuardDuty" -> "ElasticAWSGuardDuty").
 * Falls back to the aggregated Sid when no name is provided.
 */
export const getIntegrationSid = (integrationName?: string): string => {
  if (!integrationName) {
    return ALL_INTEGRATIONS_SID;
  }

  const sanitized = integrationName.replace(/[^a-zA-Z0-9]/g, '');
  return sanitized ? `Elastic${sanitized}` : ALL_INTEGRATIONS_SID;
};

/**
 * Builds a minimal IAM policy document for display or attachment to an IAM user.
 * Resource is scoped to "*" in V1 — ARNs are not known at the Connect step.
 */
export const buildIamPolicyDocument = (
  actions: string[],
  sid: string = ALL_INTEGRATIONS_SID
): IamPolicyDocument => ({
  Version: '2012-10-17',
  Statement: [
    {
      Sid: sid,
      Effect: 'Allow',
      Resource: '*',
      Action: Array.from(new Set(actions)).sort(),
    },
  ],
});

export const formatIamPolicyDocument = (
  actions: string[],
  sid: string = ALL_INTEGRATIONS_SID
): string => JSON.stringify(buildIamPolicyDocument(actions, sid), null, 2);
