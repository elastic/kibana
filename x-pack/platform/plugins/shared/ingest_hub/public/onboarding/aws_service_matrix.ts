/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// AWS service deployment matrix.
// Source of truth for deployment mechanism, signal types, auth, and required config per AWS service.
// Drives the Services UI badges and Deployment UI stack composition in the AWS onboarding flow.

import type { PackageInfo, RegistryVarsEntry } from '@kbn/fleet-plugin/common';
import { DATA_STREAM_DATASET_VAR, DATA_STREAM_TYPE_VAR } from '@kbn/fleet-plugin/common';

import type { ServiceCategory } from './service_categories';

export type { ServiceCategory };

export type SignalType = 'logs' | 'metrics';

export type DeploymentMethod = 'managed_integration' | 'ecf' | 'agent_based';

/**
 * Log type identifiers used by the ECF CloudFormation templates.
 * Services with `ecfLogType` set are deployed via the "Launch CloudFormation" button in the
 * Authenticate & Deploy step (step 3 in the wizard).
 * @see https://github.com/elastic/edot-cloud-forwarder-aws/tree/main/templates/release
 */
export type EcfLogType =
  | 'vpcflow'
  | 'cloudtrail'
  | 'waf'
  | 'networkfirewall'
  | 's3access'
  | 'elbaccess';

/** Whether the service lands data in OpenTelemetry or ECS schema. */
export type DataFormat = 'ecs' | 'otel';

/**
 * Marker for services that use a dedicated ECF CloudFormation template rather than the shared
 * unified ECS template.
 *   - `'otel'`           — OTel multi-signal template (otel_logs-cloudformation.yaml), uses S3SourceBuckets
 *   - `'crowdstrike_fdr'`— CrowdStrike FDR dedicated template
 */
export type EcfDedicatedTemplate = 'otel' | 'crowdstrike_fdr';

export type Badge = 'technical_preview' | 'beta';

function releaseToBadge(release: string | undefined): Badge | undefined {
  if (release === 'experimental') return 'technical_preview';
  if (release === 'beta') return 'beta';
  return undefined;
}

export interface DeploymentMethodEntry {
  method: DeploymentMethod;
  /** When true, this is the mechanism used by default in the onboarding deployment step.
   *  Exactly one entry per service should be preferred. */
  preferred?: boolean;
}

/**
 * Per-data-stream metadata derived from the Fleet package manifest.
 * Used by the settings flyout to render per-data-stream sections.
 */
export interface DataStreamInfo {
  /** Data stream display title from the manifest. */
  title?: string;
  /** Whether this data stream produces logs or metrics. */
  type?: SignalType;
  /** Fleet input types used by this data stream. */
  inputs: string[];
  /** Inputs enabled by default (stream.enabled !== false in the manifest). */
  defaultEnabledInputs: string[];
  /** Data stream dataset value (e.g. "aws.vpcflow"). Used to build index patterns. */
  dataset?: string;
  /** Manifest var definitions keyed by input type, then var name. */
  varDefsByInput: Record<string, Record<string, RegistryVarsEntry>>;
  /** Var names the user must configure to activate this data stream. */
  requiredConfig?: string[];
  /** Var names that are optional and surfaced in the UI. */
  optionalConfig?: string[];
}

export interface AwsServiceMatrixEntry {
  /** Policy template identifier, matching packages/<packageName>/policy_templates[].name. */
  id: string;
  /** Data stream ids included under this policy template (derived from the manifest). */
  dataStreams: string[];
  name: string;
  category: ServiceCategory;
  /** Signal types produced by this policy template (may include both logs and metrics). */
  signalTypes: SignalType[];
  deploymentMethods: DeploymentMethodEntry[];
  /** Whether OIDC-based IAM role assumption is supported.
   *  Derived from the package manifest: true when none of the service's inputs hide
   *  the 'identity_federation' option in the 'credential_type' var_group. */
  identityFederationSupported?: boolean;
  /** Fleet integration input types across all data streams (union; acts as an allowlist when set statically). */
  inputs?: string[];
  /** Manifest var names the user must configure (union across all data streams). */
  requiredConfig?: string[];
  /** Manifest var names that are optional and surfaced in the UI (union). */
  optionalConfig?: string[];
  /**
   * Manifest var definitions grouped by input type, then var name (union across all data streams).
   * Mirrors Fleet's positional scoping. Used by resolveFieldMeta and ECF config builders.
   */
  varDefsByInput?: Record<string, Record<string, RegistryVarsEntry>>;
  /**
   * Per-data-stream var metadata. Keys are data stream ids.
   * Used by the settings flyout to render per-data-stream sections with their own input toggles.
   */
  varDefsByDataStream?: Record<string, DataStreamInfo>;
  packageName: string;
  /** Display titles for each input type, sourced from policy_templates[].inputs[].title. */
  inputTitles?: Record<string, string>;
  /** Whether the service is enabled by default when the integration is installed. */
  defaultEnabled: boolean;
  /**
   * Input types that are enabled by default across all data streams (union).
   * Used to seed enabledInputs when a user first opens a service.
   */
  defaultEnabledInputs: string[];
  /** Whether this service should be shown in the AWS onboarding UI. */
  showInUI: boolean;
  badge?: Badge;
  /**
   * ECF log type identifier passed as the `LogTypes` parameter in the CloudFormation template.
   * Present only for services deployable via the Elastic Cloud Forwarder (ECF).
   */
  ecfLogType?: EcfLogType;
  /**
   * When set, this service uses a dedicated ECF CloudFormation template instead of the unified one.
   */
  ecfDedicatedTemplate?: EcfDedicatedTemplate;
  /** Whether the service produces OTel-native or ECS-compatible data. Absent implies 'ecs'. */
  dataFormat?: DataFormat;
  /**
   * Manifest policy-template name, when it differs from `id`.
   * OTel twin entries alias the ECS policy template (the aws package has no *_otel PTs),
   * so this is load-bearing for manifest resolution in buildAwsServiceMatrix and service_icon.tsx.
   */
  policyTemplate?: string;
  /**
   * Data-stream id the ECF trigger vars (bucket_arn / log_group_arn) live under, when it
   * differs from `id`. Required for multi-DS policy templates where the DS path != entry.id.
   */
  ecfDataStream?: string;
  /**
   * Force ECF-only deployment, suppressing a manifest-derived managed_integration flag.
   * Needed for OTel twins that alias agentless-enabled policy templates (e.g. s3, elb) — without
   * this gate they would inherit managed_integration and be POSTed to Fleet with an unknown input.
   */
  ecfOnly?: boolean;
}

/**
 * Internal type for the static routing table.
 * Derived fields (signalTypes, dataStreams, defaultEnabled, defaultEnabledInputs, etc.) are omitted
 * and computed at runtime from the Fleet package manifest.
 */
type AwsServiceStaticEntry = Omit<
  AwsServiceMatrixEntry,
  | 'deploymentMethods'
  | 'signalTypes'
  | 'dataStreams'
  | 'defaultEnabled'
  | 'defaultEnabledInputs'
  | 'showInUI'
  | 'optionalConfig'
  | 'name'
  | 'varDefsByInput'
  | 'varDefsByDataStream'
> & {
  deploymentMethods?: DeploymentMethodEntry[];
  showInUI?: boolean;
  /** Override when the policy template title from the manifest isn't the right display name. */
  name?: string;
  /** Data stream ids to exclude from this policy template (e.g. firewall_metrics until agentless ships). */
  excludedDataStreams?: string[];
  /** Override which inputs are enabled by default when the manifest doesn't differentiate. */
  defaultEnabledInputs?: string[];
};

const AWS_SERVICES_MATRIX_RAW: AwsServiceStaticEntry[] = [
  // ── aws package — Application Integration ──────────────────────────────
  {
    id: 'apigateway',
    category: 'networking_content_delivery',
    packageName: 'aws',
  },
  {
    id: 'lambda',
    category: 'compute',
    packageName: 'aws',
  },

  // ── aws package — Compute ───────────────────────────────────────────────
  {
    id: 'ec2',
    category: 'compute',
    packageName: 'aws',
  },
  {
    id: 'ecs',
    category: 'compute',
    packageName: 'aws',
  },
  {
    id: 'emr',
    category: 'compute',
    packageName: 'aws',
  },

  // ── aws package — Management and Governance ──────────────────────────────
  {
    id: 'awshealth',
    category: 'management_governance',
    packageName: 'aws',
  },
  {
    id: 'cloudwatch',
    category: 'management_governance',
    packageName: 'aws',
  },

  // ── aws package — Cloud Financial Management ────────────────────────────
  {
    id: 'billing',
    category: 'cloud_financial_management',
    packageName: 'aws',
  },
  {
    id: 'usage',
    category: 'cloud_financial_management',
    packageName: 'aws',
  },

  // ── aws package — management_governance / security_identity_compliance ──
  {
    id: 'cloudtrail',
    category: 'management_governance',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    packageName: 'aws',
    ecfLogType: 'cloudtrail',
  },
  {
    id: 'cloudtrail_otel',
    name: 'AWS CloudTrail',
    category: 'management_governance',
    dataFormat: 'otel',
    policyTemplate: 'cloudtrail',
    ecfDataStream: 'cloudtrail',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    ecfOnly: true,
    defaultEnabledInputs: ['aws-s3'],
    packageName: 'aws',
    ecfLogType: 'cloudtrail',
    ecfDedicatedTemplate: 'otel',
  },
  {
    id: 'config',
    category: 'security_identity_compliance',
    packageName: 'aws',
  },
  {
    id: 'guardduty',
    category: 'security_identity_compliance',
    packageName: 'aws',
  },
  {
    id: 'inspector',
    category: 'security_identity_compliance',
    packageName: 'aws',
  },
  {
    id: 'firewall',
    category: 'security_identity_compliance',
    packageName: 'aws',
    // firewall_metrics has no agentless support yet (tracked: elastic/integrations#19301).
    excludedDataStreams: ['firewall_metrics'],
  },
  {
    id: 'firewall_otel',
    name: 'AWS Network Firewall',
    category: 'security_identity_compliance',
    dataFormat: 'otel',
    policyTemplate: 'firewall',
    ecfDataStream: 'firewall_logs',
    excludedDataStreams: ['firewall_metrics'],
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    ecfOnly: true,
    packageName: 'aws',
    ecfLogType: 'networkfirewall',
    ecfDedicatedTemplate: 'otel',
    inputs: ['aws-s3'],
  },
  {
    id: 'securityhub',
    category: 'security_identity_compliance',
    packageName: 'aws',
  },
  {
    id: 'waf',
    category: 'security_identity_compliance',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    packageName: 'aws',
    ecfLogType: 'waf',
    // ECF only supports S3 for WAF; CloudWatch input is intentionally excluded.
    inputs: ['aws-s3'],
  },
  {
    id: 'waf_otel',
    name: 'AWS WAF',
    category: 'security_identity_compliance',
    dataFormat: 'otel',
    policyTemplate: 'waf',
    ecfDataStream: 'waf',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    ecfOnly: true,
    packageName: 'aws',
    ecfLogType: 'waf',
    ecfDedicatedTemplate: 'otel',
    inputs: ['aws-s3'],
  },

  // ── aws package — Networking and Content Delivery ─────────────────────────
  {
    id: 'cloudfront',
    category: 'networking_content_delivery',
    // ECF: CloudFront is in the edot-cloud-forwarder-aws#452 DoD but no released template yet
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    showInUI: false,
    packageName: 'aws',
  },
  {
    id: 'elb',
    category: 'networking_content_delivery',
    packageName: 'aws',
  },
  {
    id: 'elb_otel',
    name: 'AWS ELB',
    category: 'networking_content_delivery',
    dataFormat: 'otel',
    policyTemplate: 'elb',
    ecfDataStream: 'elb_logs',
    excludedDataStreams: ['elb_metrics'],
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    ecfOnly: true,
    packageName: 'aws',
    ecfLogType: 'elbaccess',
    ecfDedicatedTemplate: 'otel',
    inputs: ['aws-s3'],
  },
  {
    id: 'natgateway',
    category: 'networking_content_delivery',
    packageName: 'aws',
  },
  {
    id: 'route53',
    category: 'networking_content_delivery',
    packageName: 'aws',
  },
  {
    id: 'transitgateway',
    category: 'networking_content_delivery',
    packageName: 'aws',
  },
  {
    id: 'vpcflow',
    category: 'networking_content_delivery',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    packageName: 'aws',
    ecfLogType: 'vpcflow',
  },
  {
    id: 'vpcflow_otel',
    name: 'AWS VPC Flow Logs',
    category: 'networking_content_delivery',
    dataFormat: 'otel',
    policyTemplate: 'vpcflow',
    ecfDataStream: 'vpcflow',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    ecfOnly: true,
    defaultEnabledInputs: ['aws-s3'],
    packageName: 'aws',
    ecfLogType: 'vpcflow',
    ecfDedicatedTemplate: 'otel',
  },
  {
    id: 'vpn',
    category: 'networking_content_delivery',
    packageName: 'aws',
  },

  // ── aws package — Storage ───────────────────────────────────────────────
  {
    id: 'ebs',
    category: 'storage',
    packageName: 'aws',
  },
  {
    id: 's3',
    category: 'storage',
    packageName: 'aws',
  },
  {
    id: 's3access_otel',
    name: 'Amazon S3 Access Logs',
    category: 'storage',
    dataFormat: 'otel',
    policyTemplate: 's3',
    ecfDataStream: 's3access',
    excludedDataStreams: ['s3_daily_storage', 's3_request'],
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    ecfOnly: true,
    packageName: 'aws',
    ecfLogType: 's3access',
    ecfDedicatedTemplate: 'otel',
    inputs: ['aws-s3'],
  },
  {
    id: 's3_storage_lens',
    category: 'storage',
    packageName: 'aws',
  },

  // ── aws package — Databases ──────────────────────────────────────────────
  {
    id: 'dynamodb',
    category: 'databases',
    packageName: 'aws',
  },
  {
    id: 'rds',
    category: 'databases',
    packageName: 'aws',
  },
  {
    id: 'redshift',
    category: 'databases',
    packageName: 'aws',
  },

  // ── aws package — Messaging / Analytics ─────────────────────────────────
  {
    id: 'kafka',
    category: 'management_governance',
    packageName: 'aws',
  },
  {
    id: 'kinesis',
    category: 'management_governance',
    packageName: 'aws',
  },
  {
    id: 'sns',
    category: 'management_governance',
    packageName: 'aws',
  },
  {
    id: 'sqs',
    category: 'management_governance',
    packageName: 'aws',
  },

  // ── aws_bedrock package — Machine Learning ──────────────────────────────
  {
    id: 'aws_bedrock',
    category: 'machine_learning',
    packageName: 'aws_bedrock',
  },
  // TODO(PM): deployment method and signal type TBD — awaiting PM ratification
  {
    id: 'aws_bedrock_agentcore',
    category: 'machine_learning',
    packageName: 'aws_bedrock_agentcore',
    showInUI: false,
  },

  // ── awsfargate package — Containers ─────────────────────────────────────
  {
    id: 'awsfargate',
    category: 'containers',
    packageName: 'awsfargate',
  },

  // ── aws_mq package — application_integration ────────────────────────────
  // TODO(PM): deployment method and signal type TBD — awaiting PM ratification
  {
    id: 'amazon_mq',
    category: 'application_integration',
    packageName: 'aws_mq',
    showInUI: false,
  },

  // ── aws_logs package — Management and Governance ──────────────────────────
  {
    id: 'aws_logs',
    category: 'management_governance',
    packageName: 'aws_logs',
  },

  // ── aws_cloudwatch_input_otel package — OTel metrics (managed integration) ──
  // Input package: signal type is declared on each policy template (pt.type = 'metrics').
  {
    id: 'ec2_otel',
    name: 'Amazon EC2',
    category: 'compute',
    dataFormat: 'otel',
    policyTemplate: 'aws.ec2',
    packageName: 'aws_cloudwatch_input_otel',
  },
  {
    id: 'lambda_otel',
    name: 'AWS Lambda',
    category: 'compute',
    dataFormat: 'otel',
    policyTemplate: 'aws.lambda',
    packageName: 'aws_cloudwatch_input_otel',
  },
  {
    id: 'rds_otel',
    name: 'Amazon RDS',
    category: 'databases',
    dataFormat: 'otel',
    policyTemplate: 'aws.rds',
    packageName: 'aws_cloudwatch_input_otel',
  },
  {
    id: 'sqs_otel',
    name: 'Amazon SQS',
    category: 'application_integration',
    dataFormat: 'otel',
    policyTemplate: 'aws.sqs',
    packageName: 'aws_cloudwatch_input_otel',
  },
  {
    id: 'elb_alb_otel',
    name: 'Application Load Balancer',
    category: 'networking_content_delivery',
    dataFormat: 'otel',
    policyTemplate: 'aws.elb',
    packageName: 'aws_cloudwatch_input_otel',
  },
  {
    id: 'elb_clb_otel',
    name: 'Classic Load Balancer',
    category: 'networking_content_delivery',
    dataFormat: 'otel',
    policyTemplate: 'aws.elb_classic',
    packageName: 'aws_cloudwatch_input_otel',
  },
  {
    id: 'elb_nlb_otel',
    name: 'Network Load Balancer',
    category: 'networking_content_delivery',
    dataFormat: 'otel',
    policyTemplate: 'aws.elb_network',
    packageName: 'aws_cloudwatch_input_otel',
  },
  {
    id: 'elb_gwlb_otel',
    name: 'Gateway Load Balancer',
    category: 'networking_content_delivery',
    dataFormat: 'otel',
    policyTemplate: 'aws.elb_gateway',
    packageName: 'aws_cloudwatch_input_otel',
  },
  {
    id: 'ecs_otel',
    name: 'Amazon ECS',
    category: 'containers',
    dataFormat: 'otel',
    policyTemplate: 'aws.ecs',
    packageName: 'aws_cloudwatch_input_otel',
  },
];

// ── Private helpers ──────────────────────────────────────────────────────────

/** Derive var definitions for a single data stream from its manifest streams. */
function computeDataStreamInfo(
  entry: AwsServiceStaticEntry,
  ds: any,
  dsId: string
): DataStreamInfo {
  const dsStreams: Array<{ input?: string; enabled?: boolean; vars?: RegistryVarsEntry[] }> =
    ds?.streams ?? [];
  const dsManifestInputs = [...new Set(dsStreams.map((s) => s.input as string).filter(Boolean))];

  // Static entry inputs act as an allowlist — restrict per-DS inputs when set (e.g. WAF → S3 only).
  const dsEffectiveInputs =
    entry.inputs && dsManifestInputs.some((i) => entry.inputs!.includes(i))
      ? entry.inputs.filter((i) => dsManifestInputs.includes(i))
      : dsManifestInputs;

  const dsDefaultEnabledInputs = dsEffectiveInputs.filter((input) => {
    const stream = dsStreams.find((s) => s.input === input);
    return stream?.enabled !== false;
  });

  // Build per-DS var defs: input → varName → definition. First-wins within each input bucket.
  const dsVarDefsByInput: Record<string, Record<string, RegistryVarsEntry>> = {};
  for (const s of dsStreams) {
    if (!s.input || !dsEffectiveInputs.includes(s.input)) continue;
    const bucket = (dsVarDefsByInput[s.input] ??= {});
    for (const v of (s.vars ?? []) as RegistryVarsEntry[]) {
      if (!(v as any).name) continue;
      bucket[(v as any).name] ??= v;
    }
  }

  const dsAllVars = Object.values(dsVarDefsByInput).flatMap((byName) => Object.values(byName));
  const dsReqVars = [
    ...new Set(dsAllVars.filter((v: any) => v.required).map((v: any) => v.name as string)),
  ];
  const dsReqVarSet = new Set(dsReqVars);
  const dsOptVars = [
    ...new Set(
      dsAllVars
        .filter((v: any) => !v.required && !dsReqVarSet.has(v.name as string))
        .map((v: any) => v.name as string)
    ),
  ];

  return {
    title: ds?.title as string | undefined,
    type: ds?.type as SignalType | undefined,
    dataset: ds?.dataset as string | undefined,
    inputs: dsEffectiveInputs,
    defaultEnabledInputs: dsDefaultEnabledInputs,
    varDefsByInput: dsVarDefsByInput,
    requiredConfig: dsReqVars.length > 0 ? dsReqVars : undefined,
    optionalConfig: dsOptVars.length > 0 ? dsOptVars : undefined,
  };
}

/**
 * Build a single synthetic DataStreamInfo for an input package (no data_streams on the PT).
 * PT-level vars (pt.vars) are policy-template-specific config (e.g. period).
 * Package-level vars (pkg.vars) are auth/credentials — excluded here, covered in Step 3.
 */
function computeInputPackageInfo(
  entry: AwsServiceStaticEntry,
  pt: any,
  ptType: string | undefined,
  ptInputType: string
): DataStreamInfo {
  const ptVarList = ((pt as any)?.vars ?? []) as RegistryVarsEntry[];
  const bucket: Record<string, RegistryVarsEntry> = {};
  for (const v of ptVarList) {
    if ((v as any).name) bucket[(v as any).name] = v;
  }
  // Inject Fleet's synthesized stream vars (added by getNormalizedDataStreams for input packages).
  // data_stream.dataset: default = PT name (e.g. 'aws.ec2'), matches the stream key Fleet creates.
  // data_stream.type: default = PT type (e.g. 'metrics'); synthesized for all non-dynamic_signal_types PTs.
  if (!bucket['data_stream.dataset']) {
    bucket['data_stream.dataset'] = {
      ...DATA_STREAM_DATASET_VAR,
      default: (pt as any).name as string,
    } as RegistryVarsEntry;
  }
  if (!bucket['data_stream.type'] && ptType) {
    bucket['data_stream.type'] = {
      ...DATA_STREAM_TYPE_VAR,
      default: ptType,
    } as RegistryVarsEntry;
  }

  const varList = Object.values(bucket) as any[];
  const reqVars = varList.filter((v) => v.required).map((v) => v.name as string);
  const reqVarSet = new Set(reqVars);
  const optVars = varList
    .filter((v) => !v.required && !reqVarSet.has(v.name))
    .map((v) => v.name as string);

  return {
    title: (pt as any).title as string | undefined,
    type: ptType as SignalType | undefined,
    inputs: [ptInputType],
    defaultEnabledInputs: [ptInputType],
    varDefsByInput: { [ptInputType]: bucket },
    requiredConfig: reqVars.length > 0 ? reqVars : undefined,
    optionalConfig: optVars.length > 0 ? optVars : undefined,
  };
}

/** Derive union requiredConfig / optionalConfig from the accumulated varDefsByInput map. */
function deriveUnionConfig(varDefsByInput: Record<string, Record<string, RegistryVarsEntry>>): {
  requiredConfig: string[] | undefined;
  optionalConfig: string[] | undefined;
} {
  const allVars = Object.values(varDefsByInput).flatMap((byName) => Object.values(byName));
  const reqVars = [
    ...new Set(allVars.filter((v: any) => v.required).map((v: any) => v.name as string)),
  ];
  const reqVarSet = new Set(reqVars);
  const optVars = [
    ...new Set(
      allVars
        .filter((v: any) => !v.required && !reqVarSet.has(v.name as string))
        .map((v: any) => v.name as string)
    ),
  ];
  return {
    requiredConfig: reqVars.length > 0 ? reqVars : undefined,
    optionalConfig: optVars.length > 0 ? optVars : undefined,
  };
}

/**
 * Build the merged deploymentMethods array.
 * managed_integration is always preferred when present; static methods are demoted to non-preferred.
 */
function buildDeploymentMethods(
  staticMethods: DeploymentMethodEntry[] | undefined,
  managedIntegrations: boolean
): DeploymentMethodEntry[] {
  const methods: DeploymentMethodEntry[] = [];
  if (managedIntegrations) {
    methods.push({ method: 'managed_integration', preferred: true });
  }
  if (staticMethods?.length) {
    methods.push(
      ...(managedIntegrations
        ? staticMethods.map((m) => ({ ...m, preferred: false }))
        : staticMethods)
    );
  }
  if (!managedIntegrations && methods.length > 0 && !methods.some((dm) => dm.preferred)) {
    methods[0] = { ...methods[0], preferred: true };
  }
  return methods;
}

/**
 * For ECF-only services, restrict requiredConfig to trigger vars (bucket_arn / log_group_arn)
 * and collapse the dataStreams list to the single ecfDataStream when one is declared.
 * Returns undefined when not applicable (non-ECF service).
 */
function applyEcfOnlyConfig(
  entry: AwsServiceStaticEntry,
  deploymentMethods: DeploymentMethodEntry[],
  varDefsByInput: Record<string, Record<string, RegistryVarsEntry>>,
  inputs: string[] | undefined,
  dataStreams: string[]
):
  | { requiredConfig: string[] | undefined; optionalConfig: undefined; dataStreams: string[] }
  | undefined {
  if (!deploymentMethods.length || !deploymentMethods.every((m) => m.method === 'ecf')) {
    return undefined;
  }

  const ECF_TRIGGER_VARS = new Set(['bucket_arn', 'log_group_arn']);
  const effectiveInputSet = new Set(inputs ?? []);
  const ecfVarNames = [
    ...new Set(
      Object.entries(varDefsByInput)
        .filter(([input]) => effectiveInputSet.size === 0 || effectiveInputSet.has(input))
        .flatMap(([, byName]) => Object.keys(byName))
        .filter((v) => ECF_TRIGGER_VARS.has(v))
    ),
  ];

  // For OTel twins aliasing a multi-DS ECS PT, restrict to the single ecfDataStream so the
  // settings panel renders a simple single-ARN form instead of a multi-DS panel.
  const resultDataStreams =
    entry.ecfOnly && entry.ecfDataStream && dataStreams.includes(entry.ecfDataStream)
      ? [entry.ecfDataStream]
      : dataStreams;

  return {
    requiredConfig: ecfVarNames.length > 0 ? ecfVarNames : undefined,
    optionalConfig: undefined,
    dataStreams: resultDataStreams,
  };
}

// ── Main builder ─────────────────────────────────────────────────────────────

/**
 * Merge the static routing table with data from any Fleet package manifest.
 * Derives signalTypes, dataStreams, inputs, requiredConfig, optionalConfig, varDefsByInput,
 * varDefsByDataStream, defaultEnabled, and identityFederationSupported from the manifest.
 * Static fallback values are used when the manifest does not provide a field.
 */
export function buildAwsServiceMatrix(
  packages: Record<string, PackageInfo>,
  staticEntries: AwsServiceStaticEntry[]
): AwsServiceMatrixEntry[] {
  return staticEntries.map((entry) => {
    const { deploymentMethods: staticMethods, excludedDataStreams, ...rest } = entry;

    let name = entry.name;
    let inputs = entry.inputs;
    let requiredConfig = entry.requiredConfig;
    let optionalConfig: string[] | undefined;
    let defaultEnabled = true;
    const defaultEnabledInputs: string[] = [];
    let identityFederationSupported: boolean | undefined;
    const inputTitles: Record<string, string> = {};
    let managedIntegrations = false;
    const varDefsByInput: Record<string, Record<string, RegistryVarsEntry>> = {};
    const varDefsByDataStream: Record<string, DataStreamInfo> = {};
    const signalTypesSet = new Set<SignalType>();
    const dataStreams: string[] = [];

    const packageInfo = packages[entry.packageName];
    const badge = entry.badge ?? releaseToBadge((packageInfo as any)?.release);

    if (packageInfo) {
      // Find the policy template by name. OTel twins alias an existing ECS policy template via
      // `policyTemplate` — the aws package has no *_otel policy templates on EPR.
      const pt = (packageInfo.policy_templates ?? []).find(
        (p: any) => p.name === (entry.policyTemplate ?? entry.id)
      );

      if (pt) {
        managedIntegrations =
          (pt as any)?.deployment_modes?.agentless?.enabled === true && !entry.ecfOnly;

        if (!name && (pt as any)?.title) {
          name = (pt as any).title as string;
        }

        // Input packages declare signal type on the policy template itself (no data_streams).
        const ptType = (pt as any)?.type as string | undefined;
        if (ptType === 'logs' || ptType === 'metrics') {
          signalTypesSet.add(ptType as SignalType);
        }

        const ptDataStreamIds: string[] = (pt as any).data_streams ?? [];
        const includedDsIds = ptDataStreamIds.filter(
          (dsId) => !(excludedDataStreams ?? []).includes(dsId)
        );

        // Regular package: iterate data streams.
        for (const dsId of includedDsIds) {
          const ds = (packageInfo.data_streams ?? []).find((d: any) => d.path === dsId);
          if (!ds) continue;

          dataStreams.push(dsId);
          if ((ds as any)?.type === 'logs' || (ds as any)?.type === 'metrics') {
            signalTypesSet.add((ds as any).type as SignalType);
          }

          const dsInfo = computeDataStreamInfo(entry, ds, dsId);
          varDefsByDataStream[dsId] = dsInfo;

          // Merge dsVarDefsByInput into the union (first-wins per input+var).
          for (const [input, byName] of Object.entries(dsInfo.varDefsByInput)) {
            const bucket = (varDefsByInput[input] ??= {});
            for (const [varName, varDef] of Object.entries(byName)) {
              bucket[varName] ??= varDef;
            }
          }

          // Accumulate inputs union (only when not overridden by a static allowlist).
          if (!entry.inputs) {
            for (const input of dsInfo.inputs) {
              if (!inputs) inputs = [];
              if (!inputs.includes(input)) inputs.push(input);
            }
          }

          for (const input of dsInfo.defaultEnabledInputs) {
            if (!defaultEnabledInputs.includes(input)) defaultEnabledInputs.push(input);
          }
        }

        // Input package: no data_streams on the PT; use a synthetic DS entry.
        const ptInputType = (pt as any)?.input as string | undefined;
        if (includedDsIds.length === 0 && ptInputType) {
          const inputPkgInfo = computeInputPackageInfo(entry, pt, ptType, ptInputType);
          const syntheticDsId = entry.id;
          dataStreams.push(syntheticDsId);
          varDefsByDataStream[syntheticDsId] = inputPkgInfo;
          varDefsByInput[ptInputType] = inputPkgInfo.varDefsByInput[ptInputType];
          inputs = [ptInputType];
          defaultEnabledInputs.push(ptInputType);
          // Use the PT title as the switch label in the service settings flyout.
          // pt.inputs[] is empty for input packages, so the normal inputTitles loop below
          // never fires. Store pt.title here so getInputDisplayLabel can return it.
          if ((pt as any).title) inputTitles[ptInputType] = (pt as any).title as string;
          // Input packages (e.g. otelcol) have no pt.inputs[] so the IDF derivation below
          // cannot run and leaves identityFederationSupported as undefined. The gate is
          // !== false, so undefined would incorrectly show IDF. Default to false until the
          // package manifest explicitly signals support.
          identityFederationSupported = false;
        }

        // Derive union requiredConfig / optionalConfig.
        ({ requiredConfig, optionalConfig } = deriveUnionConfig(varDefsByInput));

        // defaultEnabled: false only when the manifest explicitly disables all inputs.
        if (dataStreams.length > 0) {
          defaultEnabled = defaultEnabledInputs.length > 0;
        }

        // Static override: restrict which inputs are on by default.
        if (entry.defaultEnabledInputs) {
          defaultEnabledInputs.splice(
            0,
            defaultEnabledInputs.length,
            ...entry.defaultEnabledInputs.filter((i) => inputs?.includes(i) ?? true)
          );
        }

        // Collect per-input display titles.
        const ptInputs: any[] = (pt as any)?.inputs ?? [];
        for (const ptInput of ptInputs) {
          if (ptInput.type && ptInput.title) {
            inputTitles[ptInput.type as string] = ptInput.title as string;
          }
        }

        // Derive identityFederationSupported.
        const allDsInputTypes = new Set(Object.keys(varDefsByInput));
        if (ptInputs.length > 0 && allDsInputTypes.size > 0) {
          const relevantInputs = ptInputs.filter((i: any) => allDsInputTypes.has(i.type));
          if (relevantInputs.length > 0) {
            identityFederationSupported = relevantInputs.some(
              (i: any) =>
                !(i.hide_in_var_group_options?.credential_type ?? []).includes(
                  'identity_federation'
                )
            );
          }
        }
      }
    }

    const signalTypes: SignalType[] = [...signalTypesSet];
    const deploymentMethods = buildDeploymentMethods(staticMethods, managedIntegrations);
    const showInUI = entry.showInUI ?? deploymentMethods.length > 0;

    const ecfConfig = applyEcfOnlyConfig(
      entry,
      deploymentMethods,
      varDefsByInput,
      inputs,
      dataStreams
    );
    if (ecfConfig) {
      ({ requiredConfig, optionalConfig } = ecfConfig);
      dataStreams.splice(0, dataStreams.length, ...ecfConfig.dataStreams);
    }

    return {
      ...rest,
      name: (name ?? entry.id) as string,
      dataStreams,
      signalTypes,
      deploymentMethods,
      inputs,
      requiredConfig,
      optionalConfig,
      varDefsByInput: Object.keys(varDefsByInput).length > 0 ? varDefsByInput : undefined,
      varDefsByDataStream:
        Object.keys(varDefsByDataStream).length > 0 ? varDefsByDataStream : undefined,
      defaultEnabled,
      defaultEnabledInputs,
      inputTitles: Object.keys(inputTitles).length > 0 ? inputTitles : undefined,
      showInUI,
      badge,
      identityFederationSupported,
    } as AwsServiceMatrixEntry;
  });
}

/**
 * Create a view of a service scoped to a single data stream.
 * Scopes `inputs`, `defaultEnabledInputs`, `requiredConfig`, `optionalConfig`, and `varDefsByInput`
 * to the given DS so that field-config helpers and the flyout form operate on just that DS.
 */
export function makeDsView(service: AwsServiceMatrixEntry, dsId: string): AwsServiceMatrixEntry {
  const dsInfo = service.varDefsByDataStream?.[dsId];
  if (!dsInfo) return service;
  // ECF-only services have their requiredConfig/optionalConfig already simplified to just the
  // trigger vars (bucket_arn / log_group_arn) at entry level in buildAwsServiceMatrix.
  // Preserve that simplification rather than reverting to the full per-DS manifest vars.
  const isEcfOnly =
    service.deploymentMethods.length > 0 &&
    service.deploymentMethods.every((m) => m.method === 'ecf');
  return {
    ...service,
    dataStreams: [dsId],
    signalTypes: dsInfo.type ? [dsInfo.type] : service.signalTypes,
    inputs: dsInfo.inputs,
    defaultEnabledInputs: isEcfOnly ? service.defaultEnabledInputs : dsInfo.defaultEnabledInputs,
    requiredConfig: isEcfOnly ? service.requiredConfig : dsInfo.requiredConfig,
    optionalConfig: isEcfOnly ? service.optionalConfig : dsInfo.optionalConfig,
    varDefsByInput: dsInfo.varDefsByInput,
    varDefsByDataStream: { [dsId]: dsInfo },
  };
}

/** Internal static entries — exported for use by buildAwsServiceMatrix in the hook. */
export const AWS_SERVICES_STATIC: AwsServiceStaticEntry[] = AWS_SERVICES_MATRIX_RAW;

/**
 * Static metadata map for service lookups that do not require the manifest
 * (name, category, showInUI, etc.).
 * For manifest-enriched values (deploymentMethods, identityFederationSupported)
 * use useAwsServicesMap() in React components.
 * Note: signalTypes, dataStreams, and defaultEnabled are derived from the manifest at runtime;
 * values here are placeholders — use useAwsServicesMap() where these fields matter.
 */
export const AWS_SERVICES_MAP = new Map<string, AwsServiceMatrixEntry>(
  AWS_SERVICES_STATIC.map((entry) => {
    const { deploymentMethods: staticMethods, excludedDataStreams: _excl, ...rest } = entry;
    const deploymentMethods: DeploymentMethodEntry[] = staticMethods ?? [];
    const base = {
      ...rest,
      name: (entry.name ?? entry.id) as string,
      dataStreams: [],
      signalTypes: [],
      deploymentMethods,
      showInUI: entry.showInUI ?? true,
      defaultEnabled: true,
      defaultEnabledInputs: [],
    } as unknown as AwsServiceMatrixEntry;
    return [entry.id, base];
  })
);
