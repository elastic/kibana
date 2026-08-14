/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Utilities for building AWS CloudFormation Quick Create URLs for the Elastic Cloud Forwarder (ECF).
 *
 * ECF deploys as one or more CloudFormation stacks in the user's AWS account, forwarding logs to
 * Elastic via an OTLP endpoint.  The wizard collects the necessary parameters (S3 buckets,
 * CloudWatch log groups, global region, OTLP endpoint) across Steps 1–3 so that the Launch button
 * in Step 4 can open the AWS console with everything pre-filled.
 *
 * Reference templates:
 *   Unified (multi-signal): https://github.com/elastic/edot-cloud-forwarder-aws/tree/main/templates/release/ecs_logs-cloudformation.yaml
 *   CrowdStrike FDR:        https://github.com/elastic/edot-cloud-forwarder-aws/tree/main/templates/release/crowdstrike_fdr_cloudformation.yaml
 */

import type { EcfLogType } from './aws_service_matrix';
import { AWS_SERVICES_MAP } from './aws_service_matrix';
import type { ServiceVars } from './step_components/service_settings_step/use_service_settings';

// ── Template URLs ─────────────────────────────────────────────────────────────

/**
 * S3 URL for the unified multi-signal ECF CloudFormation template.
 * Supports VPC Flow Logs, CloudTrail, ELB access logs, WAF, GuardDuty, and Netskope.
 */
export const ECF_UNIFIED_TEMPLATE_URL =
  'https://edot-cloud-forwarder.s3.amazonaws.com/v1/latest/cloudformation/ecs_logs-cloudformation.yaml';

/**
 * S3 URL for the CrowdStrike FDR dedicated ECF CloudFormation template.
 * Uses a separate stack with CrowdStrike-specific parameters.
 */
export const ECF_CROWDSTRIKE_TEMPLATE_URL =
  'https://edot-cloud-forwarder.s3.amazonaws.com/v1/latest/cloudformation/crowdstrike_fdr_cloudformation.yaml';

/** Default stack name for the unified multi-signal ECF stack. */
export const ECF_UNIFIED_STACK_NAME = 'edot-cloud-forwarder';

/** Default stack name for the CrowdStrike FDR dedicated ECF stack. */
export const ECF_CROWDSTRIKE_STACK_NAME = 'edot-cloud-forwarder-crowdstrike-fdr';

// ── Type helpers ──────────────────────────────────────────────────────────────

export interface EcfServiceConfig {
  /** Service ID from the AWS service matrix. */
  serviceId: string;
  /** ECF log type identifier for the unified template `LogTypes` parameter. */
  ecfLogType: EcfLogType;
  /** S3 bucket ARN configured for this service (when using the S3 transport). */
  bucketArn?: string;
  /** CloudWatch log group ARN configured for this service (when using the CloudWatch transport).
   *  Must end in `:*` as required by the ECF template; the builder appends it if absent. */
  logGroupArn?: string;
}

// ── ECF param derivation ──────────────────────────────────────────────────────

/**
 * Derives ECF configuration for each selected service that supports the unified template.
 * Returns only entries for services that have an `ecfLogType` defined.
 *
 * @param selectedServiceIds  Service IDs chosen by the user in Step 1.
 * @param serviceVars         Per-service field values from Step 2 (bucket ARNs, log group ARNs).
 */
export const getEcfServiceConfigs = (
  selectedServiceIds: string[],
  serviceVars: Record<string, ServiceVars>
): EcfServiceConfig[] => {
  const configs: EcfServiceConfig[] = [];

  for (const serviceId of selectedServiceIds) {
    const entry = AWS_SERVICES_MAP.get(serviceId);
    if (!entry?.ecfLogType) continue;

    const vars = serviceVars[serviceId]?.vars ?? {};
    configs.push({
      serviceId,
      ecfLogType: entry.ecfLogType,
      bucketArn: vars.bucket_arn?.trim() || undefined,
      logGroupArn: vars.log_group_arn?.trim() || undefined,
    });
  }

  return configs;
};

// ── URL builders ──────────────────────────────────────────────────────────────

/**
 * Ensures a CloudWatch log group ARN ends with `:*` as required by the ECF template's
 * `CloudWatchLogGroups` parameter.
 */
const normaliseLogGroupArn = (arn: string): string => (arn.endsWith(':*') ? arn : `${arn}:*`);

/**
 * Builds a CloudFormation Quick Create URL for the unified multi-signal ECF template.
 *
 * The URL pre-fills:
 *  - `OTLPEndpoint`          – managed OTLP URL from the cloud plugin (when available)
 *  - `S3Buckets`             – comma-separated bucket ARNs from S3-transport services
 *  - `CloudWatchLogGroups`   – comma-separated log group ARNs from CW-transport services
 *  - `LogTypes`              – comma-separated ECF log type identifiers
 *
 * `ElasticAPIKey` is intentionally NOT pre-filled: it is a sensitive credential that should
 * not appear in browser history or URL logs.  The user fills it in the AWS console.
 *
 * TODO: generate a dedicated Elastic API key server-side and pre-fill it (follow-up issue).
 *
 * @param ecfConfigs    ECF service configurations (from `getEcfServiceConfigs`).
 * @param region        AWS region for the CloudFormation stack (the global region from Step 2).
 * @param otlpEndpoint  Managed OTLP endpoint URL from `cloud.managedOtlp?.url`.
 */
export const buildEcfUnifiedCloudFormationUrl = ({
  ecfConfigs,
  region,
  otlpEndpoint,
}: {
  ecfConfigs: EcfServiceConfig[];
  region: string;
  otlpEndpoint?: string;
}): string => {
  const s3BucketArns = ecfConfigs
    .map((c) => c.bucketArn)
    .filter((arn): arn is string => Boolean(arn));

  const logGroupArns = ecfConfigs
    .map((c) => c.logGroupArn)
    .filter((arn): arn is string => Boolean(arn))
    .map(normaliseLogGroupArn);

  const logTypes = ecfConfigs.map((c) => c.ecfLogType);

  const url = new URL('https://console.aws.amazon.com/cloudformation/home');

  // The `?region=` query param pre-selects the AWS region in the console.
  if (region) {
    url.searchParams.set('region', region);
  }

  // The CloudFormation console uses hash-based routing; params go into the fragment.
  const hashParams = new URLSearchParams();
  hashParams.set('templateURL', ECF_UNIFIED_TEMPLATE_URL);
  hashParams.set('stackName', ECF_UNIFIED_STACK_NAME);

  if (otlpEndpoint) {
    hashParams.set('param_OTLPEndpoint', otlpEndpoint);
  }
  if (s3BucketArns.length > 0) {
    hashParams.set('param_S3Buckets', s3BucketArns.join(','));
  }
  if (logGroupArns.length > 0) {
    hashParams.set('param_CloudWatchLogGroups', logGroupArns.join(','));
  }
  if (logTypes.length > 0) {
    hashParams.set('param_LogTypes', logTypes.join(','));
  }

  url.hash = `/stacks/quickcreate?${hashParams.toString()}`;
  return url.toString();
};

/**
 * Builds a CloudFormation Quick Create URL for the CrowdStrike FDR dedicated ECF template.
 *
 * Only `OTLPEndpoint` is pre-filled.  CrowdStrike-specific parameters (FeedClientID, FeedSecret,
 * FeedSQSURL, FeedStorageRegion) are left blank for the user to supply in the AWS console.
 *
 * @param region        AWS region for the CloudFormation stack.
 * @param otlpEndpoint  Managed OTLP endpoint URL.
 */
export const buildEcfCrowdstrikeCloudFormationUrl = ({
  region,
  otlpEndpoint,
}: {
  region: string;
  otlpEndpoint?: string;
}): string => {
  const url = new URL('https://console.aws.amazon.com/cloudformation/home');

  if (region) {
    url.searchParams.set('region', region);
  }

  const hashParams = new URLSearchParams();
  hashParams.set('templateURL', ECF_CROWDSTRIKE_TEMPLATE_URL);
  hashParams.set('stackName', ECF_CROWDSTRIKE_STACK_NAME);

  if (otlpEndpoint) {
    hashParams.set('param_OTLPEndpoint', otlpEndpoint);
  }

  url.hash = `/stacks/quickcreate?${hashParams.toString()}`;
  return url.toString();
};
