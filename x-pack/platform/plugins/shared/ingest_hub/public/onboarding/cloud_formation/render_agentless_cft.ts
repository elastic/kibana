/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dump } from 'js-yaml';

import { assertActionsAreSecure, assertManagedPolicyArnsAreValid } from './permission_security';
import { resolveProviderPermissions } from './resolve_provider_permissions';

const ELASTIC_AWS_USER_LOGICAL_ID = 'ElasticAWSUser';
const ELASTIC_AWS_ACCESS_KEY_LOGICAL_ID = 'ElasticAWSAccessKey';

interface IamUserProperties {
  UserName: string;
  Policies: Array<{
    PolicyName: string;
    PolicyDocument: {
      Version: string;
      Statement: Array<{
        Effect: string;
        Resource: string;
        Action: string[];
      }>;
    };
  }>;
  ManagedPolicyArns?: string[];
}

function createBaseTemplate(userNameSuffix: string) {
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'Elastic agentless AWS integration IAM user with read-only provider permissions',
    Resources: {
      [ELASTIC_AWS_USER_LOGICAL_ID]: {
        Type: 'AWS::IAM::User',
        Properties: {
          UserName: `elastic-agentless-${userNameSuffix}`,
          Policies: [
            {
              PolicyName: 'ElasticAWSGrants',
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Resource: '*',
                    Action: [] as string[],
                  },
                ],
              },
            },
          ],
        } satisfies IamUserProperties,
      },
      [ELASTIC_AWS_ACCESS_KEY_LOGICAL_ID]: {
        Type: 'AWS::IAM::AccessKey',
        Properties: {
          UserName: { Ref: ELASTIC_AWS_USER_LOGICAL_ID },
        },
      },
    },
    Outputs: {
      AwsAccessKeyId: {
        Description: 'Access key ID for the Elastic agentless IAM user',
        Value: { Ref: ELASTIC_AWS_ACCESS_KEY_LOGICAL_ID },
      },
      AwsSecretAccessKey: {
        Description: 'Secret access key for the Elastic agentless IAM user',
        Value: { 'Fn::GetAtt': [ELASTIC_AWS_ACCESS_KEY_LOGICAL_ID, 'SecretAccessKey'] },
      },
    },
  };
}

function generateUserNameSuffix(): string {
  return Math.random().toString(16).slice(2, 10);
}

export function mergeProviderPermissions(serviceIds: string[]): {
  actions: string[];
  managedPolicyArns: string[];
} {
  const actions = new Set<string>();
  const managedPolicyArns = new Set<string>();

  for (const serviceId of serviceIds) {
    const permissions = resolveProviderPermissions(serviceId);
    permissions.actions.forEach((action) => actions.add(action));
    permissions.managedPolicyArns.forEach((arn) => managedPolicyArns.add(arn));
  }

  return {
    actions: [...actions].sort(),
    managedPolicyArns: [...managedPolicyArns].sort(),
  };
}

/**
 * Renders an agentless CloudFormation template for the given selected service IDs.
 * Returns an empty string when no permissions resolve.
 */
export function renderAgentlessCft(serviceIds: string[]): string {
  const { actions, managedPolicyArns } = mergeProviderPermissions(serviceIds);

  if (actions.length === 0 && managedPolicyArns.length === 0) {
    return '';
  }

  // Fail closed: never emit a malformed or privilege-escalating policy, even if the
  // permission map or resolver seam regresses.
  assertActionsAreSecure(actions);
  assertManagedPolicyArnsAreValid(managedPolicyArns);

  const template = createBaseTemplate(generateUserNameSuffix());
  const userResource: IamUserProperties =
    template.Resources[ELASTIC_AWS_USER_LOGICAL_ID].Properties;

  if (actions.length > 0) {
    userResource.Policies[0].PolicyDocument.Statement[0].Action = actions;
  } else {
    userResource.Policies = [];
  }

  if (managedPolicyArns.length > 0) {
    userResource.ManagedPolicyArns = managedPolicyArns;
  }

  return dump(template, { lineWidth: -1, noRefs: true });
}

export const CLOUDFORMATION_TEMPLATE_FILENAME = 'elastic-stack.cloudformation.yml';

export { ELASTIC_AWS_ACCESS_KEY_LOGICAL_ID, ELASTIC_AWS_USER_LOGICAL_ID };
