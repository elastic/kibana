/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderedIacBlueprint } from './iac_provisioner';

/**
 * POC: Kibana-managed AWS onboarding.
 *
 * Credential handling follows the existing Fleet output / Bedrock connector model: the
 * `secrets` block is submitted once by an authenticated Fleet admin over the HTTPS internal
 * API, stored in a hidden Encrypted Saved Object (`fleet-aws-onboarding-credentials`, the
 * secret attribute is encrypted with the Kibana encryption key), decrypted only server-side
 * as the internal user when a CloudFormation call is made, and never returned by any route.
 */
/**
 * `fully-managed`: Kibana may discover services and create/update the Federated Identity stack.
 * `partially-managed`: read-only; Kibana discovers and pre-fills, the customer deploys the stack.
 */
export type AwsOnboardingManagementMode = 'fully-managed' | 'partially-managed';

export interface AwsOnboardingCredentialsPublic {
  configured: boolean;
  /** First 4 and last 4 characters of the access key id, e.g. `AKIA…WXYZ`. Never the secret. */
  accessKeyIdMasked?: string;
  region?: string;
  stackNamePrefix?: string;
  /** Bootstrap stack ARN, when given: removing the credentials deletes that stack first. */
  bootstrapStackArn?: string;
  /** Derived from which roles are stored. */
  mode?: AwsOnboardingManagementMode;
  discoveryRoleArn?: string;
  provisioningRoleArn?: string;
}

/** Write-only; see the module comment for how `secrets` is stored and used. */
export interface PutAwsOnboardingCredentialsRequest {
  accessKeyId: string;
  region: string;
  stackNamePrefix?: string;
  bootstrapStackArn?: string;
  /** Read-only role Kibana assumes per discovery call (stand-in for a delegated session). */
  discoveryRoleArn: string;
  /** Read-write role for stack create/update; absent in partially-managed mode. */
  provisioningRoleArn?: string;
  secrets: {
    /** Encrypted at rest (Encrypted Saved Object); never logged or echoed back. */
    secretAccessKey: string;
  };
}

export interface DeleteAwsOnboardingCredentialsResponse {
  /** `skipped` when no bootstrap stack ARN is stored, the stack is already gone, or `force` was set. */
  bootstrapStack: 'deletion_started' | 'skipped';
}

/** What Kibana found in the customer account with the read-only discovery role. */
export interface AwsOnboardingDiscoveryResponse {
  accountId?: string;
  region: string;
  /** Cost Explorer service names with usage in the last 30 days, e.g. "AWS CloudTrail". */
  servicesInUse: string[];
  cloudtrail: Array<{
    name?: string;
    s3BucketName?: string;
    isMultiRegion?: boolean;
    homeRegion?: string;
  }>;
  guarddutyDetectorIds: string[];
  /** Individual lookups that failed (e.g. Cost Explorer not enabled); the rest is still returned. */
  errors: Array<{ source: 'sts' | 'costExplorer' | 'cloudtrail' | 'guardduty'; message: string }>;
}

/** Result of assuming the stored roles once, to confirm the request was approved. */
export interface AwsOnboardingVerifyResponse {
  accountId?: string;
  mode: AwsOnboardingManagementMode;
  discovery: { ok: boolean; error?: string };
  /** Absent in partially-managed mode. */
  provisioning?: { ok: boolean; error?: string };
}

/** Where the CloudFormation template came from. `iacp` carries the digest to persist as `iac_key`. */
export interface AwsOnboardingTemplateInfo {
  source: 'iacp' | 'static';
  templateSha?: string;
  blueprint?: RenderedIacBlueprint;
}

export interface CreateAwsOnboardingStackResponse {
  stackId: string;
  stackName: string;
  template: AwsOnboardingTemplateInfo;
}

export type AwsOnboardingStackStatus = 'in_progress' | 'complete' | 'failed' | 'not_found';

export interface GetAwsOnboardingStackResponse {
  status: AwsOnboardingStackStatus;
  /** Raw CloudFormation StackStatus, e.g. CREATE_IN_PROGRESS. */
  stackStatus?: string;
  reason?: string;
  /** The newest CloudFormation resource event; `reason` is set only for failed events. */
  latestEvent?: { resource: string; status: string; timestamp: string; reason?: string };
  /** Each resource's newest event, oldest first; empty when the events could not be read. */
  resources: Array<{ logicalId: string; status: string; reason?: string; updatedAt: string }>;
  /** Present only when `status` is `complete`. */
  outputs?: {
    roleArn?: string;
    oidcProviderArn?: string;
  };
}

export type GetAwsOnboardingBootstrapLaunchResponse =
  | {
      kind: 'quick_create';
      /** CloudFormation console link that pre-fills the bootstrap stack; embeds a short-lived signed template URL. */
      quickCreateUrl: string;
      expiresAt: string;
      blueprint: { id: string; version: string };
    }
  | {
      /** The provisioner cannot serve the bootstrap blueprint; download the Kibana-hosted template instead. */
      kind: 'download';
    };

export interface GetAwsOnboardingBootstrapTemplateResponse {
  filename: string;
  /** CloudFormation YAML with the ManagementMode default pre-set to the requested mode. */
  template: string;
}
