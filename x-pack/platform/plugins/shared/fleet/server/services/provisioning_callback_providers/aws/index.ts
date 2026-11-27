/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { gte, valid } from 'semver';

import type {
  CloudConnectorCallbackIdentity,
  CloudConnectorCallbackReceivedValues,
  CloudConnectorCallerIdentityProof,
} from '../../../../common/types/models/provisioning_callback';
import { AwsReportSchema } from '../../../types/rest_spec/provisioning_callback_providers/aws';
import type { ProvisioningCallbackSOAttributes } from '../../../types/so_attributes';

import type { ProvisioningCallbackProvider } from '../types';

import { verifyCallerIdentity } from './caller_identity';

const CONNECTOR_NAME_MAX_LENGTH = 255;

/**
 * The blueprint version from which the stack's Lambda sends `origin_proof`, per blueprint id as
 * the provisioner reports it at render time and the browser stores it on the record at launch.
 */
const ORIGIN_PROOF_SINCE = new Map<string, string>([['aws/workload_identity_federation', '1.5.0']]);

const requiresOriginProof = ({
  iac_blueprint_id: blueprintId,
  iac_blueprint_version: version,
}: CloudConnectorCallbackIdentity): boolean => {
  const since = blueprintId ? ORIGIN_PROOF_SINCE.get(blueprintId) : undefined;
  return since !== undefined && !!version && valid(version) !== null && gte(version, since);
};

const partitionOfArn = (arn: string): string | undefined => arn.split(':')[1];
const accountIdOfArn = (arn: string): string | undefined => arn.split(':')[4];

/** Last path segment of an IAM role ARN, used when the browser has not named the identity yet. */
const roleNameFromArn = (roleArn: string): string => {
  const resource = roleArn.split(':role/')[1] ?? '';
  const name = resource.split('/').pop()?.trim() ?? '';
  return name.slice(0, CONNECTOR_NAME_MAX_LENGTH) || 'aws-workload-identity';
};

/**
 * AWS: the CloudFormation stack's Lambda reports the IAM role and the stack it created, and
 * proves its account with a signed STS `GetCallerIdentity` request that Kibana replays. The
 * account is what is proven; the signer's names are checked against the stack's, which anyone
 * in the account could arrange.
 */
export const awsProvisioningCallbackProvider: ProvisioningCallbackProvider<
  CloudConnectorCallbackReceivedValues,
  CloudConnectorCallerIdentityProof
> = {
  provider: 'aws',

  reportSchema: AwsReportSchema,

  requiresOriginProof,

  validateReport: (report) => {
    if (partitionOfArn(report.role_arn) !== partitionOfArn(report.stack_arn)) {
      return 'role_arn and stack_arn must be in the same AWS partition';
    }
    if (accountIdOfArn(report.role_arn) !== accountIdOfArn(report.stack_arn)) {
      return 'role_arn and stack_arn must be in the same AWS account';
    }
  },

  verifyOrigin: async (proof, expectation, { verifierUrl }) => {
    const verification = await verifyCallerIdentity(proof, expectation, { stsUrl: verifierUrl });
    return verification.verified
      ? { verified: true, account: verification.account, principal: verification.arn }
      : verification;
  },

  storedFields: (report) => ({ role_arn: report.role_arn, stack_arn: report.stack_arn }),

  storedReport: (attributes: ProvisioningCallbackSOAttributes) =>
    attributes.role_arn && attributes.stack_arn
      ? { role_arn: attributes.role_arn, stack_arn: attributes.stack_arn }
      : undefined,

  toConnector: (report, identity) => ({
    name:
      identity.connector_name?.trim().slice(0, CONNECTOR_NAME_MAX_LENGTH) ||
      roleNameFromArn(report.role_arn),
    cloudProvider: 'aws',
    ...(identity.account_type ? { accountType: identity.account_type } : {}),
    vars: { role_arn: { type: 'text', value: report.role_arn } },
    iac_deployment_id: report.stack_arn,
    ...(identity.iac_key !== undefined ? { iac_key: identity.iac_key } : {}),
    ...(identity.iac_blueprint_id !== undefined
      ? { iac_blueprint_id: identity.iac_blueprint_id }
      : {}),
    ...(identity.iac_blueprint_version !== undefined
      ? { iac_blueprint_version: identity.iac_blueprint_version }
      : {}),
  }),
};
