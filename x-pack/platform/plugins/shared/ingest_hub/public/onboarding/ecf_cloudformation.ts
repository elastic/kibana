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
 * Three template families are supported, each producing its own Launch button in Step 4:
 *   - Unified ECS (multi-signal): ecs_logs-cloudformation.yaml   → ECS data streams
 *   - OTel (multi-signal):        otel_logs-cloudformation.yaml  → OpenTelemetry data streams (different S3 param name)
 *   - CrowdStrike FDR (dedicated): crowdstrike_fdr_cloudformation.yaml
 *
 * Reference templates:
 *   https://github.com/elastic/edot-cloud-forwarder-aws/tree/main/templates/release
 */

import type { EcfLogType } from './aws_service_matrix';
import { AWS_SERVICES_MAP } from './aws_service_matrix';
import type {
  ServiceInstance,
  ServiceVars,
} from './step_components/service_settings_step/use_service_settings';

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

/**
 * S3 URL for the OTel multi-signal ECF CloudFormation template.
 * Supports VPC Flow Logs, CloudTrail, ELB access logs, WAF, Network Firewall, and S3 access logs
 * routed to OpenTelemetry-compatible data streams.
 * Note: uses `S3SourceBuckets` instead of `S3Buckets` compared to the ECS unified template.
 */
export const ECF_OTEL_TEMPLATE_URL =
  'https://edot-cloud-forwarder.s3.amazonaws.com/v1/latest/cloudformation/otel_logs-cloudformation.yaml';

/** Default stack name for the unified multi-signal ECF stack. */
export const ECF_OTEL_STACK_NAME = 'edot-cloud-forwarder-otel';

/** Default stack name for the CrowdStrike FDR dedicated ECF stack. */
export const ECF_CROWDSTRIKE_STACK_NAME = 'edot-cloud-forwarder-crowdstrike-fdr';

// ── Type helpers ──────────────────────────────────────────────────────────────

export interface EcfServiceConfig {
  /** Service ID from the AWS service matrix. */
  serviceId: string;
  /** ECF log type identifier for the unified template `LogTypes` parameter. */
  ecfLogType: EcfLogType;
  /**
   * S3 bucket ARNs from all instances of this service (base + duplicates).
   * Multiple entries occur when the user duplicated a service in Step 2 to collect from
   * more than one bucket.
   */
  bucketArns: string[];
  /**
   * CloudWatch log group ARNs from all instances of this service.
   * Each entry ends in `:*` as required by the ECF template (appended by the builder if absent).
   */
  logGroupArns: string[];
}

// ── ECF param derivation ──────────────────────────────────────────────────────

/**
 * Derives ECF configuration for each selected service that supports the ECF template.
 * Returns one entry per unique service ID, with ARNs aggregated across all instances
 * (base + duplicates) so that duplicate instances — used when a service collects from
 * more than one S3 bucket or log group — each contribute their ARN to the launch URL.
 *
 * @param instances    All service instances from Step 2 (including duplicates).
 * @param serviceVars  Per-instance field values from Step 2, keyed by instanceId.
 */
export const getEcfServiceConfigs = (
  instances: ServiceInstance[],
  serviceVars: Record<string, ServiceVars>
): EcfServiceConfig[] => {
  const configsByServiceId = new Map<string, EcfServiceConfig>();

  for (const { serviceId, instanceId } of instances) {
    const entry = AWS_SERVICES_MAP.get(serviceId);
    if (!entry?.ecfLogType) continue;

    const entryVars = serviceVars[instanceId];

    // ECF services are single-DS. Read ARNs from the first DS's varsByInput.
    // Fall back to entry.id when dataStreams is empty (AWS_SERVICES_MAP populates dataStreams
    // only after the manifest is fetched; at module-load time the array is []).
    const dsId = entry.dataStreams?.[0] ?? entry.id;
    const dsVars = entryVars?.varsByDataStream?.[dsId];
    const enabledInputs = dsVars?.enabledInputs ?? [];

    // Gate each ARN on the enabled inputs so stale values from a previous transport
    // selection don't end up in the launch URL and misconfigure the ECF stack.
    // Both vars are multi-value; split the comma-joined draft string into individual ARNs
    // so each can be normalised independently (e.g. log-group `:*` suffix per ARN).
    const splitArns = (raw: string | undefined): string[] =>
      raw
        ? raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const bucketArns = enabledInputs.includes('aws-s3')
      ? splitArns(dsVars?.varsByInput?.['aws-s3']?.bucket_arn)
      : [];
    const logGroupArns = enabledInputs.includes('aws-cloudwatch')
      ? splitArns(dsVars?.varsByInput?.['aws-cloudwatch']?.log_group_arn)
      : [];

    const existing = configsByServiceId.get(serviceId);
    if (existing) {
      existing.bucketArns.push(...bucketArns);
      existing.logGroupArns.push(...logGroupArns);
    } else {
      configsByServiceId.set(serviceId, {
        serviceId,
        ecfLogType: entry.ecfLogType,
        bucketArns,
        logGroupArns,
      });
    }
  }

  return [...configsByServiceId.values()];
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
  const s3BucketArns = ecfConfigs.flatMap((c) => c.bucketArns);
  const logGroupArns = ecfConfigs.flatMap((c) => c.logGroupArns.map(normaliseLogGroupArn));
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

/**
 * Builds a CloudFormation Quick Create URL for the OTel multi-signal ECF template.
 *
 * The OTel template uses `S3SourceBuckets` instead of `S3Buckets` (unlike the ECS unified
 * template). All other parameters — `CloudWatchLogGroups`, `LogTypes`, `OTLPEndpoint` — share
 * the same names and semantics.
 *
 * `ElasticAPIKey` is intentionally NOT pre-filled for the same security reasons as the unified
 * template: it must not appear in browser history or URL logs.
 *
 * @param ecfConfigs    ECF service configurations (from `getEcfServiceConfigs`).
 * @param region        AWS region for the CloudFormation stack.
 * @param otlpEndpoint  Managed OTLP endpoint URL from `cloud.managedOtlp?.url`.
 */
export const buildEcfOtelCloudFormationUrl = ({
  ecfConfigs,
  region,
  otlpEndpoint,
}: {
  ecfConfigs: EcfServiceConfig[];
  region: string;
  otlpEndpoint?: string;
}): string => {
  const s3BucketArns = ecfConfigs.flatMap((c) => c.bucketArns);
  const logGroupArns = ecfConfigs.flatMap((c) => c.logGroupArns.map(normaliseLogGroupArn));
  const logTypes = ecfConfigs.map((c) => c.ecfLogType);

  const url = new URL('https://console.aws.amazon.com/cloudformation/home');

  if (region) {
    url.searchParams.set('region', region);
  }

  const hashParams = new URLSearchParams();
  hashParams.set('templateURL', ECF_OTEL_TEMPLATE_URL);
  hashParams.set('stackName', ECF_OTEL_STACK_NAME);

  if (otlpEndpoint) {
    hashParams.set('param_OTLPEndpoint', otlpEndpoint);
  }
  // OTel template uses S3SourceBuckets, not S3Buckets
  if (s3BucketArns.length > 0) {
    hashParams.set('param_S3SourceBuckets', s3BucketArns.join(','));
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
