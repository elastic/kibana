/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssumeRoleCommand, GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

import { FleetError } from '../../errors';
import { appContextService } from '../app_context';

import type { AwsOnboardingCredentials } from './credentials';

/** Shortest session STS allows; every operation gets its own and nothing is kept afterwards. */
const SESSION_DURATION_SECONDS = 900;

export type OnboardingRole = 'discovery' | 'provisioning';

/** Temporary credentials for one operation. Same shape a delegated session would provide. */
export interface AwsSessionCredentials {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration?: Date;
}

/**
 * Stand-in for AWS IAM temporary delegation: the stored key may only assume the two scoped roles
 * from the bootstrap stack. Swapping this for `GetDelegatedAccessToken` later changes nothing
 * downstream, since every client is built from the returned session.
 */
export async function assumeOnboardingRole(
  credentials: AwsOnboardingCredentials,
  role: OnboardingRole,
  purpose: string
): Promise<AwsSessionCredentials> {
  const roleArn =
    role === 'discovery' ? credentials.discoveryRoleArn : credentials.provisioningRoleArn;
  if (!roleArn) {
    throw new FleetError(
      role === 'provisioning'
        ? 'Managed onboarding is partially managed (read-only): deploy the stack from the AWS console'
        : 'Managed onboarding credentials have no discovery role'
    );
  }
  const sts = new STSClient({
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
    maxAttempts: 3,
  });
  const result = await sts.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: `kibana-onboarding-${purpose}`.slice(0, 64),
      DurationSeconds: SESSION_DURATION_SECONDS,
    })
  );
  const c = result.Credentials;
  if (!c?.AccessKeyId || !c.SecretAccessKey || !c.SessionToken) {
    throw new FleetError(`AssumeRole for the ${role} role returned no credentials`);
  }
  appContextService
    .getLogger()
    .get('AwsOnboarding')
    .debug(`Assumed ${role} role for ${purpose} (expires ${c.Expiration?.toISOString()})`);
  return {
    region: credentials.region,
    accessKeyId: c.AccessKeyId,
    secretAccessKey: c.SecretAccessKey,
    sessionToken: c.SessionToken,
    expiration: c.Expiration,
  };
}

export async function getCallerAccountId(
  session: AwsSessionCredentials
): Promise<string | undefined> {
  const sts = new STSClient({ region: session.region, credentials: session, maxAttempts: 2 });
  const identity = await sts.send(new GetCallerIdentityCommand({}));
  return identity.Account;
}
