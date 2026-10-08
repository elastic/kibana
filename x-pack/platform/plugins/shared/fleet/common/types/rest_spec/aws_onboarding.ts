/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderIacTemplateIntegration, RenderedIacBlueprint } from './iac_provisioner';

/**
 * POC: Kibana-managed AWS onboarding.
 *
 * Credential handling follows the existing Fleet output / Bedrock connector model: the
 * `secrets` block is submitted once by an authenticated Fleet admin over the HTTPS internal
 * API, stored in a hidden Encrypted Saved Object (`fleet-aws-onboarding-credentials`, the
 * secret attribute is encrypted with the Kibana encryption key), decrypted only server-side
 * as the internal user when a CloudFormation call is made, and never returned by any route.
 */
export interface AwsOnboardingCredentialsPublic {
  configured: boolean;
  /** First 4 and last 4 characters of the access key id, e.g. `AKIA…WXYZ`. Never the secret. */
  accessKeyIdMasked?: string;
  region?: string;
  stackNamePrefix?: string;
  /** Bootstrap stack ARN, when given: removing the credentials deletes that stack first. */
  bootstrapStackArn?: string;
}

/** Write-only; see the module comment for how `secrets` is stored and used. */
export interface PutAwsOnboardingCredentialsRequest {
  accessKeyId: string;
  region: string;
  stackNamePrefix?: string;
  bootstrapStackArn?: string;
  secrets: {
    /** Encrypted at rest (Encrypted Saved Object); never logged or echoed back. */
    secretAccessKey: string;
  };
}

export interface DeleteAwsOnboardingCredentialsRequestQuery {
  /** Remove the credentials even if the bootstrap stack cannot be deleted (or should be kept). */
  force?: boolean;
}

export interface DeleteAwsOnboardingCredentialsResponse {
  /** `skipped` when no bootstrap stack ARN is stored, the stack is already gone, or `force` was set. */
  bootstrapStack: 'deletion_started' | 'skipped';
}

/** Where the CloudFormation template came from. `iacp` carries the digest to persist as `iac_key`. */
export interface AwsOnboardingTemplateInfo {
  source: 'iacp' | 'static';
  templateSha?: string;
  blueprint?: RenderedIacBlueprint;
}

export interface CreateAwsOnboardingStackRequest {
  integrations: RenderIacTemplateIntegration[];
  /** Raw CloudFormation template URL (the `templateURL` of the package's quick-create link). Used when IaCP is off. */
  templateUrl?: string;
  /** Stack parameters Kibana knows (ElasticOrganizationId, ElasticCloudRegion, …); undeclared ones are dropped server-side. */
  parameters: Record<string, string>;
}

export interface CreateAwsOnboardingStackResponse {
  stackId: string;
  stackName: string;
  template: AwsOnboardingTemplateInfo;
}

export interface UpdateAwsOnboardingStackRequest {
  integrations: RenderIacTemplateIntegration[];
  templateUrl?: string;
  parameters?: Record<string, string>;
}

export type UpdateAwsOnboardingStackResponse =
  | { status: 'up_to_date' }
  | { status: 'updating'; stackId: string; template: AwsOnboardingTemplateInfo };

export type AwsOnboardingStackStatus = 'in_progress' | 'complete' | 'failed' | 'not_found';

export interface GetAwsOnboardingStackResponse {
  status: AwsOnboardingStackStatus;
  /** Raw CloudFormation StackStatus, e.g. CREATE_IN_PROGRESS. */
  stackStatus?: string;
  reason?: string;
  /** Present only when `status` is `complete`. */
  outputs?: {
    roleArn?: string;
    oidcProviderArn?: string;
  };
}

export interface GetAwsOnboardingBootstrapTemplateResponse {
  filename: string;
  /** CloudFormation YAML the customer uploads once to create the bootstrap identity. */
  template: string;
}
