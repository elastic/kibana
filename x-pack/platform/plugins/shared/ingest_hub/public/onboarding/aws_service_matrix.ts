/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// AWS service deployment matrix.
// Source of truth for deployment mechanism, signal types, auth, and required config per AWS service.
// Drives the Services UI badges and Deployment UI stack composition in the AWS onboarding flow.

import {
  AWS_SERVICE_PROVIDER_PERMISSIONS,
  type ProviderPermissions,
} from './aws_provider_permissions';

export type SignalType = 'logs' | 'metrics';

export type DeploymentMethod = 'managed_integration' | 'ecf' | 'agent_based';

export type AuthType = 'identity_federation' | 'api_key';

export type Badge = 'technical_preview' | 'beta';

export type ServiceCategory =
  | 'Analytics'
  | 'Application Integration'
  | 'Cloud Financial Management'
  | 'Compute'
  | 'Containers'
  | 'Databases'
  | 'Machine Learning'
  | 'Management and Governance'
  | 'Networking and Content Delivery'
  | 'Security, Identity and Compliance'
  | 'Storage';

export interface DeploymentMethodEntry {
  method: DeploymentMethod;
  /** When true, this is the mechanism used by default in the onboarding deployment step.
   *  Exactly one entry per service should be preferred. */
  preferred?: boolean;
}

export interface AwsServiceMatrixEntry {
  /** Data stream identifier, matching packages/<packageName>/data_stream/<id> */
  id: string;
  name: string;
  category: ServiceCategory;
  signalType: SignalType;
  deploymentMethods: DeploymentMethodEntry[];
  /** Authentication types available per deployment method. Populated once IF rollout status is confirmed. */
  authTypes?: AuthType[];
  /** Whether OIDC-based IAM role assumption is supported.
   *  Derived from the package manifest: true when none of the service's inputs hide
   *  the 'identity_federation' option in the 'credential_type' var_group. */
  identityFederationSupported?: boolean;
  /** Fleet integration input types required by this data stream (e.g. 'aws-s3', 'aws-cloudwatch') */
  inputs?: string[];
  /** Manifest var names the user must configure to activate this data stream */
  requiredConfig?: string[];
  /** Manifest var names that are optional but surfaced in the UI (e.g. regions, metrics) */
  optionalConfig?: string[];
  /** Boolean manifest vars that are required: true in the package but have default values */
  mandatoryFields?: string[];
  packageName: string;
  /** Fleet policy template name (policy_templates[].name in the package manifest) */
  policyTemplate?: string;
  /** Override for the data stream name used in Fleet input stream keys when it differs from `id` */
  dataStream?: string;
  /** Whether the data stream is enabled by default when the integration is installed */
  defaultEnabled: boolean;
  /** Whether this service should be shown in the AWS onboarding UI */
  showInUI: boolean;
  badge?: Badge;
  /** Hardcoded AWS IAM permissions required to ingest this data stream.
   *  Temporary until packages expose provider_permissions in the manifest. */
  providerPermissions?: ProviderPermissions;
}

/**
 * Internal type for the static routing table.
 * For 'aws' package entries, 'managed_integration' is derived at runtime from the Fleet package manifest.
 * For non-aws entries, all deployment methods including 'managed_integration' may appear directly.
 */
type AwsServiceStaticEntry = Omit<
  AwsServiceMatrixEntry,
  'providerPermissions' | 'deploymentMethods'
> & {
  deploymentMethods?: DeploymentMethodEntry[];
};

function enrichWithProviderPermissions(
  entry: Omit<AwsServiceMatrixEntry, 'providerPermissions'>
): AwsServiceMatrixEntry {
  const providerPermissions = AWS_SERVICE_PROVIDER_PERMISSIONS[entry.id];
  return providerPermissions ? { ...entry, providerPermissions } : entry;
}

const AWS_SERVICES_MATRIX_RAW: AwsServiceStaticEntry[] = [
  // ── aws package — Application Integration ──────────────────────────────
  {
    id: 'apigateway_logs',
    name: 'AWS API Gateway',
    category: 'Networking and Content Delivery',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-s3', 'aws-cloudwatch'],
    requiredConfig: ['bucket_arn', 'log_group_arn', 'region', 'region_name'],
    mandatoryFields: ['collect_s3_logs', 'preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'apigateway',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'apigateway_metrics',
    name: 'AWS API Gateway',
    category: 'Networking and Content Delivery',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'apigateway',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'lambda',
    name: 'AWS Lambda',
    category: 'Compute',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    mandatoryFields: ['collect_esm_metrics'],
    packageName: 'aws',
    policyTemplate: 'lambda',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'lambda_logs',
    name: 'AWS Lambda',
    category: 'Compute',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-cloudwatch'],
    requiredConfig: ['log_group_arn', 'region_name'],
    mandatoryFields: ['preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'lambda',
    defaultEnabled: true,
    showInUI: true,
  },

  // ── aws package — Compute ───────────────────────────────────────────────
  {
    id: 'ec2_logs',
    name: 'AWS EC2',
    category: 'Compute',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-s3', 'aws-cloudwatch'],
    requiredConfig: ['bucket_arn', 'log_group_arn', 'region', 'region_name'],
    mandatoryFields: ['collect_s3_logs', 'preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'ec2',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'ec2_metrics',
    name: 'AWS EC2',
    category: 'Compute',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'ec2',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'ecs_metrics',
    name: 'AWS ECS',
    category: 'Compute',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'ecs',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'emr_logs',
    name: 'AWS EMR',
    category: 'Compute',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-s3', 'aws-cloudwatch'],
    requiredConfig: ['bucket_arn', 'log_group_arn', 'region', 'region_name'],
    mandatoryFields: ['preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'emr',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'emr_metrics',
    name: 'AWS EMR',
    category: 'Compute',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'emr',
    defaultEnabled: true,
    showInUI: true,
  },

  // ── aws package — Management and Governance ──────────────────────────────
  {
    id: 'awshealth',
    name: 'AWS Health',
    category: 'Management and Governance',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'awshealth',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'cloudwatch_logs',
    name: 'AWS CloudWatch',
    category: 'Management and Governance',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-cloudwatch'],
    requiredConfig: ['log_group_arn', 'region_name'],
    mandatoryFields: ['preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'cloudwatch',
    defaultEnabled: false,
    showInUI: true,
  },
  {
    id: 'cloudwatch_metrics',
    name: 'AWS CloudWatch',
    category: 'Management and Governance',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions', 'metrics'],
    packageName: 'aws',
    policyTemplate: 'cloudwatch',
    defaultEnabled: false,
    showInUI: true,
  },

  // ── aws package — Cloud Financial Management ────────────────────────────
  {
    id: 'billing',
    name: 'AWS Billing',
    category: 'Cloud Financial Management',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    requiredConfig: [],
    mandatoryFields: ['leaderelection'],
    packageName: 'aws',
    policyTemplate: 'billing',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'usage',
    name: 'AWS Usage',
    category: 'Cloud Financial Management',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'usage',
    defaultEnabled: true,
    showInUI: true,
  },

  // ── aws package — Management and Governance / Security, Identity and Compliance ──
  {
    id: 'cloudtrail',
    name: 'AWS CloudTrail',
    category: 'Management and Governance',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-s3', 'aws-cloudwatch'],
    requiredConfig: ['bucket_arn', 'log_group_arn', 'region', 'region_name'],
    mandatoryFields: ['collect_s3_logs', 'preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'cloudtrail',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'config',
    name: 'AWS Config',
    category: 'Security, Identity and Compliance',
    signalType: 'logs',
    inputs: ['cel'],
    requiredConfig: ['aws_region'],
    mandatoryFields: ['preserve_duplicate_custom_fields', 'preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'config',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'guardduty',
    name: 'AWS GuardDuty',
    category: 'Security, Identity and Compliance',
    signalType: 'logs',
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    inputs: ['aws-s3', 'httpjson'],
    requiredConfig: ['aws_region', 'detector_id', 'bucket_arn', 'region'],
    mandatoryFields: [
      'collect_s3_logs',
      'preserve_duplicate_custom_fields',
      'preserve_original_event',
    ],
    packageName: 'aws',
    policyTemplate: 'guardduty',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'inspector',
    name: 'AWS Inspector',
    category: 'Security, Identity and Compliance',
    signalType: 'logs',
    inputs: ['httpjson'],
    requiredConfig: ['aws_region'],
    mandatoryFields: ['preserve_duplicate_custom_fields', 'preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'inspector',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'firewall_logs',
    name: 'AWS Network Firewall',
    category: 'Security, Identity and Compliance',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-s3', 'aws-cloudwatch'],
    requiredConfig: ['bucket_arn', 'log_group_arn', 'region', 'region_name'],
    mandatoryFields: ['collect_s3_logs', 'preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'firewall',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'firewall_metrics',
    name: 'AWS Network Firewall',
    category: 'Security, Identity and Compliance',
    signalType: 'metrics',
    deploymentMethods: [{ method: 'agent_based', preferred: true }],
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'firewall',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'securityhub_findings',
    name: 'AWS Security Hub',
    category: 'Security, Identity and Compliance',
    signalType: 'logs',
    inputs: ['httpjson'],
    requiredConfig: ['aws_region'],
    mandatoryFields: ['preserve_duplicate_custom_fields', 'preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'securityhub',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'securityhub_findings_full_posture',
    name: 'AWS Security Hub (Full Posture / CSPM)',
    category: 'Security, Identity and Compliance',
    signalType: 'logs',
    inputs: ['httpjson'],
    requiredConfig: ['aws_region'],
    mandatoryFields: ['preserve_duplicate_custom_fields', 'preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'securityhub',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'securityhub_insights',
    name: 'AWS Security Hub (Insights)',
    category: 'Security, Identity and Compliance',
    signalType: 'logs',
    inputs: ['httpjson'],
    requiredConfig: ['aws_region'],
    mandatoryFields: ['preserve_duplicate_custom_fields', 'preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'securityhub',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'waf',
    name: 'AWS WAF',
    category: 'Security, Identity and Compliance',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-s3', 'aws-cloudwatch'],
    requiredConfig: ['bucket_arn', 'log_group_arn', 'region', 'region_name'],
    mandatoryFields: ['collect_s3_logs', 'preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'waf',
    defaultEnabled: true,
    showInUI: true,
  },

  // ── aws package — Networking and Content Delivery ─────────────────────────
  {
    id: 'cloudfront_logs',
    name: 'AWS CloudFront',
    category: 'Networking and Content Delivery',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-s3'],
    requiredConfig: ['bucket_arn', 'region'],
    mandatoryFields: ['collect_s3_logs', 'preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'cloudfront',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'elb_logs',
    name: 'AWS ELB',
    category: 'Networking and Content Delivery',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-s3', 'aws-cloudwatch'],
    requiredConfig: ['bucket_arn', 'log_group_arn', 'region', 'region_name'],
    mandatoryFields: ['collect_s3_logs', 'preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'elb',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'elb_metrics',
    name: 'AWS ELB',
    category: 'Networking and Content Delivery',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'elb',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'natgateway',
    name: 'AWS NAT Gateway',
    category: 'Networking and Content Delivery',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'natgateway',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'route53_public_logs',
    name: 'AWS Route 53 Public DNS',
    category: 'Networking and Content Delivery',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-cloudwatch'],
    requiredConfig: ['log_group_arn', 'region_name'],
    mandatoryFields: ['preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'route53',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'route53_resolver_logs',
    name: 'AWS Route 53 Resolver',
    category: 'Networking and Content Delivery',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-s3', 'aws-cloudwatch'],
    requiredConfig: ['bucket_arn', 'log_group_arn', 'region', 'region_name'],
    mandatoryFields: ['collect_s3_logs', 'preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'route53',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'transitgateway',
    name: 'AWS Transit Gateway',
    category: 'Networking and Content Delivery',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'transitgateway',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'vpcflow',
    name: 'AWS VPC Flow',
    category: 'Networking and Content Delivery',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-s3', 'aws-cloudwatch'],
    requiredConfig: ['bucket_arn', 'log_group_arn', 'region', 'region_name'],
    mandatoryFields: ['collect_s3_logs', 'preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 'vpcflow',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'vpn',
    name: 'AWS VPN',
    category: 'Networking and Content Delivery',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'vpn',
    defaultEnabled: true,
    showInUI: true,
  },

  // ── aws package — Storage ───────────────────────────────────────────────
  {
    id: 'ebs',
    name: 'AWS EBS',
    category: 'Storage',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'ebs',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 's3_daily_storage',
    name: 'AWS S3 (Storage metrics)',
    category: 'Storage',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 's3',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 's3_request',
    name: 'AWS S3 (Request metrics)',
    category: 'Storage',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 's3',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 's3access',
    name: 'AWS S3 (Access logs)',
    category: 'Storage',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-s3'],
    requiredConfig: ['bucket_arn', 'region'],
    mandatoryFields: ['collect_s3_logs', 'preserve_original_event'],
    packageName: 'aws',
    policyTemplate: 's3',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 's3_storage_lens',
    name: 'AWS S3 Storage Lens',
    category: 'Storage',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 's3_storage_lens',
    defaultEnabled: true,
    showInUI: true,
  },

  // ── aws package — Databases ──────────────────────────────────────────────
  {
    id: 'dynamodb',
    name: 'AWS DynamoDB',
    category: 'Databases',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'dynamodb',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'rds',
    name: 'AWS RDS',
    category: 'Databases',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'rds',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'redshift',
    name: 'AWS Redshift',
    category: 'Databases',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'redshift',
    defaultEnabled: true,
    showInUI: true,
  },

  // ── aws package — Analytics / Application Integration ───────────────────
  {
    id: 'kafka_metrics',
    name: 'AWS MSK (Kafka)',
    category: 'Management and Governance',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'kafka',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'kinesis',
    name: 'AWS Kinesis',
    category: 'Management and Governance',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'kinesis',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'sns',
    name: 'AWS SNS',
    category: 'Management and Governance',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'sns',
    defaultEnabled: true,
    showInUI: true,
  },
  {
    id: 'sqs',
    name: 'AWS SQS',
    category: 'Management and Governance',
    signalType: 'metrics',
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'sqs',
    defaultEnabled: true,
    showInUI: true,
  },

  // ── aws_bedrock package — Machine Learning ──────────────────────────────
  {
    id: 'guardrails',
    name: 'AWS Bedrock (Guardrails)',
    category: 'Machine Learning',
    signalType: 'metrics',
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws_bedrock',
    defaultEnabled: true,
    showInUI: true,
    policyTemplate: 'aws_bedrock',
  },
  {
    id: 'invocation',
    name: 'AWS Bedrock (Invocation)',
    category: 'Machine Learning',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-s3', 'aws-cloudwatch'],
    requiredConfig: ['bucket_arn', 'log_group_arn', 'region', 'region_name'],
    packageName: 'aws_bedrock',
    defaultEnabled: true,
    showInUI: true,
    policyTemplate: 'aws_bedrock',
  },
  {
    id: 'runtime',
    name: 'AWS Bedrock (Runtime)',
    category: 'Machine Learning',
    signalType: 'metrics',
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    inputs: ['aws/metrics'],
    optionalConfig: ['regions'],
    packageName: 'aws_bedrock',
    defaultEnabled: true,
    showInUI: true,
    policyTemplate: 'aws_bedrock',
  },
  // TODO(PM): deployment method and signal type TBD — awaiting PM ratification
  {
    id: 'bedrock_agentcore',
    name: 'AWS Bedrock AgentCore',
    category: 'Machine Learning',
    signalType: 'logs',
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    inputs: [],
    requiredConfig: [],
    packageName: 'aws_bedrock_agentcore',
    defaultEnabled: false,
    showInUI: false,
    policyTemplate: 'aws_bedrock_agentcore',
  },

  // ── awsfargate package — Containers ─────────────────────────────────────
  {
    id: 'fargate',
    name: 'AWS Fargate',
    category: 'Containers',
    signalType: 'metrics',
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    inputs: ['awsfargate/metrics'],
    optionalConfig: ['regions'],
    packageName: 'awsfargate',
    defaultEnabled: true,
    showInUI: true,
    policyTemplate: 'awsfargate',
    dataStream: 'task_stats',
  },

  // ── aws_mq package — Application Integration ────────────────────────────
  // TODO(PM): deployment method and signal type TBD — awaiting PM ratification
  {
    id: 'mq',
    name: 'AWS MQ',
    category: 'Application Integration',
    signalType: 'metrics',
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    inputs: [],
    requiredConfig: [],
    packageName: 'aws_mq',
    defaultEnabled: false,
    showInUI: false,
    policyTemplate: 'amazon_mq',
  },

  // ── OTel packages — Technical preview ───────────────────────────────────
  {
    id: 'cloudtrail_otel',
    name: 'AWS CloudTrail (OTel)',
    category: 'Management and Governance',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: [],
    requiredConfig: [],
    packageName: 'aws_cloudtrail_otel',
    defaultEnabled: false,
    showInUI: true,
    badge: 'technical_preview',
  },
  {
    id: 'vpcflow_otel',
    name: 'AWS VPC Flow (OTel)',
    category: 'Networking and Content Delivery',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: [],
    requiredConfig: [],
    packageName: 'aws_vpcflow_otel',
    defaultEnabled: false,
    showInUI: true,
    badge: 'technical_preview',
  },
  {
    id: 'waf_otel',
    name: 'AWS WAF (OTel)',
    category: 'Security, Identity and Compliance',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: [],
    requiredConfig: [],
    packageName: 'aws_waf_otel',
    defaultEnabled: false,
    showInUI: true,
    badge: 'technical_preview',
  },

  // ── aws_logs package — Management and Governance ──────────────────────────
  {
    id: 'aws_logs',
    name: 'AWS Logs (Generic)',
    category: 'Management and Governance',
    signalType: 'logs',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    inputs: ['aws-s3', 'aws-cloudwatch'],
    requiredConfig: ['bucket_arn', 'log_group_arn', 'region', 'region_name'],
    packageName: 'aws_logs',
    defaultEnabled: false,
    showInUI: true,
    policyTemplate: 'aws_logs',
  },
];

/**
 * Merge the static routing table with data from the Fleet package manifest.
 * For 'aws' package entries, derives managed_integration, signalType, and inputs from the manifest.
 * For non-aws entries, uses the static deploymentMethods directly.
 */
export function buildAwsServiceMatrix(
  packageInfo: PackageInfo,
  staticEntries: AwsServiceStaticEntry[]
): AwsServiceMatrixEntry[] {
  return staticEntries.map((entry) => {
    const { deploymentMethods: staticMethods, ...rest } = entry;

    let signalType = entry.signalType;
    let inputs = entry.inputs;
    let requiredConfig = entry.requiredConfig;
    let mandatoryFields = entry.mandatoryFields;
    let defaultEnabled = entry.defaultEnabled;
    let deploymentMethods: DeploymentMethodEntry[];
    let identityFederationSupported: boolean | undefined;

    if (entry.packageName === 'aws') {
      const pt = (packageInfo.policy_templates ?? []).find(
        (p: any) => 'name' in p && p.name === entry.policyTemplate
      );
      const ds = (packageInfo.data_streams ?? []).find(
        (d: any) => d.path === (entry.dataStream ?? entry.id)
      );

      const managedIntegrations = (pt as any)?.deployment_modes?.agentless?.enabled === true;

      if ((ds as any)?.type === 'logs' || (ds as any)?.type === 'metrics') {
        signalType = (ds as any).type as SignalType;
      }

      const dsInputs: string[] = [
        ...new Set(((ds as any)?.streams ?? []).map((s: any) => s.input as string)),
      ];
      if (dsInputs.length > 0) {
        inputs = dsInputs;
      }

      const allVars: any[] = ((ds as any)?.streams ?? []).flatMap((s: any) => s.vars ?? []);

      const reqVars: string[] = [
        ...new Set(
          allVars.filter((v: any) => v.required && v.show_user).map((v: any) => v.name as string)
        ),
      ];
      if (reqVars.length > 0) {
        requiredConfig = reqVars;
      }

      const mandFields: string[] = [
        ...new Set(
          allVars.filter((v: any) => v.required && !v.show_user).map((v: any) => v.name as string)
        ),
      ];
      if (mandFields.length > 0) {
        mandatoryFields = mandFields;
      }

      if ((ds as any)?.streams?.length > 0) {
        defaultEnabled = !(ds as any).streams.some((s: any) => s.enabled === false);
      }

      // Derive identityFederationSupported: true when none of this data stream's inputs
      // hide 'identity_federation' in the 'credential_type' var_group.
      const ptInputs: any[] = (pt as any)?.inputs ?? [];
      const dsInputTypes = new Set(((ds as any)?.streams ?? []).map((s: any) => s.input as string));
      if (ptInputs.length > 0 && dsInputTypes.size > 0) {
        const relevantInputs = ptInputs.filter((i: any) => dsInputTypes.has(i.type));
        if (relevantInputs.length > 0) {
          identityFederationSupported = relevantInputs.every(
            (i: any) =>
              !(i.hide_in_var_group_options?.credential_type ?? []).includes('identity_federation')
          );
        }
      }

      // Build the merged deploymentMethods array for aws package entries.
      // managed_integration always goes first so it is the preferred method when present.
      const methods: DeploymentMethodEntry[] = [];
      if (managedIntegrations) {
        methods.push({ method: 'managed_integration' });
      }
      if (staticMethods?.length) {
        methods.push(...staticMethods);
      }
      deploymentMethods = methods;
    } else {
      // Non-aws entries: use staticMethods directly (may include managed_integration).
      deploymentMethods = staticMethods ?? [];
    }

    // Ensure exactly one preferred entry — set it on the first if none is marked.
    if (deploymentMethods.length > 0 && !deploymentMethods.some((dm) => dm.preferred)) {
      deploymentMethods[0] = { ...deploymentMethods[0], preferred: true };
    }

    const merged = {
      ...rest,
      deploymentMethods,
      signalType,
      inputs,
      requiredConfig,
      mandatoryFields,
      defaultEnabled,
      // For aws entries, override with manifest-derived value; for others, rest provides it.
      ...(entry.packageName === 'aws' && { identityFederationSupported }),
    } as Omit<AwsServiceMatrixEntry, 'providerPermissions'>;

    return enrichWithProviderPermissions(merged);
  });
}

/** Internal static entries — exported for use by buildAwsServiceMatrix in the hook. */
export const AWS_SERVICES_STATIC: AwsServiceStaticEntry[] = AWS_SERVICES_MATRIX_RAW;

/**
 * Static metadata map for service lookups that do not require the manifest
 * (name, category, showInUI, etc.).
 * For manifest-enriched values (deploymentMethods, identityFederationSupported)
 * use useAwsServicesMap() in React components.
 */
export const AWS_SERVICES_MAP = new Map<string, AwsServiceMatrixEntry>(
  AWS_SERVICES_STATIC.map((entry) => {
    const { deploymentMethods: staticMethods, ...rest } = entry;
    const deploymentMethods: DeploymentMethodEntry[] = staticMethods ?? [];
    const base: Omit<AwsServiceMatrixEntry, 'providerPermissions'> = { ...rest, deploymentMethods };
    return [entry.id, enrichWithProviderPermissions(base)];
  })
);
