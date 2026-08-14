/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// AWS service deployment matrix.
// Source of truth for deployment mechanism, signal types, auth, and required config per AWS service.
// Drives the Services UI badges and Deployment UI stack composition in the AWS onboarding flow.

import type { PackageInfo } from '@kbn/fleet-plugin/common';

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
}

/**
 * Internal type for the static routing table.
 * signalType and defaultEnabled are optional — derived at runtime from the Fleet package manifest.
 * For non-aws packages where manifest derivation is not yet fully applied, static fallbacks remain.
 */
type AwsServiceStaticEntry = Omit<
  AwsServiceMatrixEntry,
  'deploymentMethods' | 'signalType' | 'defaultEnabled'
> & {
  deploymentMethods?: DeploymentMethodEntry[];
  signalType?: SignalType;
  defaultEnabled?: boolean;
};

const AWS_SERVICES_MATRIX_RAW: AwsServiceStaticEntry[] = [
  // ── aws package — Application Integration ──────────────────────────────
  {
    id: 'apigateway_logs',
    name: 'AWS API Gateway',
    category: 'Networking and Content Delivery',
    // TODO: remove once elastic/integrations sets deployment_modes.agentless.enabled on 'apigateway' policy template
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    packageName: 'aws',
    policyTemplate: 'apigateway',
    showInUI: true,
  },
  {
    id: 'apigateway_metrics',
    name: 'AWS API Gateway',
    category: 'Networking and Content Delivery',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'apigateway',
    showInUI: true,
  },
  {
    id: 'lambda',
    name: 'AWS Lambda',
    category: 'Compute',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'lambda',
    showInUI: true,
  },
  {
    id: 'lambda_logs',
    name: 'AWS Lambda',
    category: 'Compute',
    packageName: 'aws',
    policyTemplate: 'lambda',
    showInUI: true,
  },

  // ── aws package — Compute ───────────────────────────────────────────────
  {
    id: 'ec2_logs',
    name: 'AWS EC2',
    category: 'Compute',
    packageName: 'aws',
    policyTemplate: 'ec2',
    showInUI: true,
  },
  {
    id: 'ec2_metrics',
    name: 'AWS EC2',
    category: 'Compute',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'ec2',
    showInUI: true,
  },
  {
    id: 'ecs_metrics',
    name: 'AWS ECS',
    category: 'Compute',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'ecs',
    showInUI: true,
  },
  {
    id: 'emr_logs',
    name: 'AWS EMR',
    category: 'Compute',
    // TODO: remove once elastic/integrations sets deployment_modes.agentless.enabled on 'emr' policy template
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    packageName: 'aws',
    policyTemplate: 'emr',
    showInUI: true,
  },
  {
    id: 'emr_metrics',
    name: 'AWS EMR',
    category: 'Compute',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'emr',
    showInUI: true,
  },

  // ── aws package — Management and Governance ──────────────────────────────
  {
    id: 'awshealth',
    name: 'AWS Health',
    category: 'Management and Governance',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'awshealth',
    showInUI: true,
  },
  {
    id: 'cloudwatch_logs',
    name: 'AWS CloudWatch',
    category: 'Management and Governance',
    packageName: 'aws',
    policyTemplate: 'cloudwatch',
    showInUI: true,
  },
  {
    id: 'cloudwatch_metrics',
    name: 'AWS CloudWatch',
    category: 'Management and Governance',
    optionalConfig: ['regions', 'metrics'],
    packageName: 'aws',
    policyTemplate: 'cloudwatch',
    showInUI: true,
  },

  // ── aws package — Cloud Financial Management ────────────────────────────
  {
    id: 'billing',
    name: 'AWS Billing',
    category: 'Cloud Financial Management',
    packageName: 'aws',
    policyTemplate: 'billing',
    showInUI: true,
  },
  {
    id: 'usage',
    name: 'AWS Usage',
    category: 'Cloud Financial Management',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'usage',
    showInUI: true,
  },

  // ── aws package — Management and Governance / Security, Identity and Compliance ──
  {
    id: 'cloudtrail',
    name: 'AWS CloudTrail',
    category: 'Management and Governance',
    // TODO: remove once elastic/integrations sets deployment_modes.agentless.enabled on 'cloudtrail' policy template
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    packageName: 'aws',
    policyTemplate: 'cloudtrail',
    showInUI: true,
  },
  {
    id: 'config',
    name: 'AWS Config',
    category: 'Security, Identity and Compliance',
    packageName: 'aws',
    policyTemplate: 'config',
    showInUI: true,
  },
  {
    id: 'guardduty',
    name: 'AWS GuardDuty',
    category: 'Security, Identity and Compliance',
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    packageName: 'aws',
    policyTemplate: 'guardduty',
    showInUI: true,
  },
  {
    id: 'inspector',
    name: 'AWS Inspector',
    category: 'Security, Identity and Compliance',
    packageName: 'aws',
    policyTemplate: 'inspector',
    showInUI: true,
  },
  {
    id: 'firewall_logs',
    name: 'AWS Network Firewall',
    category: 'Security, Identity and Compliance',
    // TODO: remove once elastic/integrations sets deployment_modes.agentless.enabled on 'firewall' policy template
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    packageName: 'aws',
    policyTemplate: 'firewall',
    showInUI: true,
  },
  {
    id: 'firewall_metrics',
    name: 'AWS Network Firewall',
    category: 'Security, Identity and Compliance',
    deploymentMethods: [{ method: 'agent_based', preferred: true }],
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'firewall',
    showInUI: true,
  },
  {
    id: 'securityhub_findings',
    name: 'AWS Security Hub',
    category: 'Security, Identity and Compliance',
    packageName: 'aws',
    policyTemplate: 'securityhub',
    showInUI: true,
  },
  {
    id: 'securityhub_findings_full_posture',
    name: 'AWS Security Hub (Full Posture / CSPM)',
    category: 'Security, Identity and Compliance',
    packageName: 'aws',
    policyTemplate: 'securityhub',
    showInUI: true,
  },
  {
    id: 'securityhub_insights',
    name: 'AWS Security Hub (Insights)',
    category: 'Security, Identity and Compliance',
    packageName: 'aws',
    policyTemplate: 'securityhub',
    showInUI: true,
  },
  {
    id: 'waf',
    name: 'AWS WAF',
    category: 'Security, Identity and Compliance',
    // TODO: remove once elastic/integrations sets deployment_modes.agentless.enabled on 'waf' policy template
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    packageName: 'aws',
    policyTemplate: 'waf',
    showInUI: true,
  },

  // ── aws package — Networking and Content Delivery ─────────────────────────
  {
    id: 'cloudfront_logs',
    name: 'AWS CloudFront',
    category: 'Networking and Content Delivery',
    // ECF: CloudFront is in the edot-cloud-forwarder-aws#452 DoD but no released template yet
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    packageName: 'aws',
    policyTemplate: 'cloudfront',
    showInUI: true,
  },
  {
    id: 'elb_logs',
    name: 'AWS ELB',
    category: 'Networking and Content Delivery',
    packageName: 'aws',
    policyTemplate: 'elb',
    showInUI: true,
  },
  {
    id: 'elb_metrics',
    name: 'AWS ELB',
    category: 'Networking and Content Delivery',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'elb',
    showInUI: true,
  },
  {
    id: 'natgateway',
    name: 'AWS NAT Gateway',
    category: 'Networking and Content Delivery',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'natgateway',
    showInUI: true,
  },
  {
    id: 'route53_public_logs',
    name: 'AWS Route 53 Public DNS',
    category: 'Networking and Content Delivery',
    // TODO: remove once elastic/integrations sets deployment_modes.agentless.enabled on 'route53' policy template
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    packageName: 'aws',
    policyTemplate: 'route53',
    showInUI: true,
  },
  {
    id: 'route53_resolver_logs',
    name: 'AWS Route 53 Resolver',
    category: 'Networking and Content Delivery',
    // TODO: remove once elastic/integrations sets deployment_modes.agentless.enabled on 'route53' policy template
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    packageName: 'aws',
    policyTemplate: 'route53',
    showInUI: true,
  },
  {
    id: 'transitgateway',
    name: 'AWS Transit Gateway',
    category: 'Networking and Content Delivery',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'transitgateway',
    showInUI: true,
  },
  {
    id: 'vpcflow',
    name: 'AWS VPC Flow',
    category: 'Networking and Content Delivery',
    // TODO: remove once elastic/integrations sets deployment_modes.agentless.enabled on 'vpcflow' policy template
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    packageName: 'aws',
    policyTemplate: 'vpcflow',
    showInUI: true,
  },
  {
    id: 'vpn',
    name: 'AWS VPN',
    category: 'Networking and Content Delivery',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'vpn',
    showInUI: true,
  },

  // ── aws package — Storage ───────────────────────────────────────────────
  {
    id: 'ebs',
    name: 'AWS EBS',
    category: 'Storage',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'ebs',
    showInUI: true,
  },
  {
    id: 's3_daily_storage',
    name: 'AWS S3 (Storage metrics)',
    category: 'Storage',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 's3',
    showInUI: true,
  },
  {
    id: 's3_request',
    name: 'AWS S3 (Request metrics)',
    category: 'Storage',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 's3',
    showInUI: true,
  },
  {
    id: 's3access',
    name: 'AWS S3 (Access logs)',
    category: 'Storage',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    packageName: 'aws',
    policyTemplate: 's3',
    showInUI: true,
  },
  {
    id: 's3_storage_lens',
    name: 'AWS S3 Storage Lens',
    category: 'Storage',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 's3_storage_lens',
    showInUI: true,
  },

  // ── aws package — Databases ──────────────────────────────────────────────
  {
    id: 'dynamodb',
    name: 'AWS DynamoDB',
    category: 'Databases',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'dynamodb',
    showInUI: true,
  },
  {
    id: 'rds',
    name: 'AWS RDS',
    category: 'Databases',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'rds',
    showInUI: true,
  },
  {
    id: 'redshift',
    name: 'AWS Redshift',
    category: 'Databases',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'redshift',
    showInUI: true,
  },

  // ── aws package — Analytics / Application Integration ───────────────────
  {
    id: 'kafka_metrics',
    name: 'AWS MSK (Kafka)',
    category: 'Management and Governance',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'kafka',
    showInUI: true,
  },
  {
    id: 'kinesis',
    name: 'AWS Kinesis',
    category: 'Management and Governance',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'kinesis',
    showInUI: true,
  },
  {
    id: 'sns',
    name: 'AWS SNS',
    category: 'Management and Governance',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'sns',
    showInUI: true,
  },
  {
    id: 'sqs',
    name: 'AWS SQS',
    category: 'Management and Governance',
    optionalConfig: ['regions'],
    packageName: 'aws',
    policyTemplate: 'sqs',
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
    // TODO: remove once elastic/integrations sets deployment_modes.agentless.enabled on 'aws_bedrock' policy template
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
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
    // TODO: remove once elastic/integrations sets deployment_modes.agentless.enabled on 'aws_logs' policy template
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    inputs: ['aws-s3', 'aws-cloudwatch'],
    requiredConfig: ['bucket_arn', 'log_group_arn', 'region', 'region_name'],
    packageName: 'aws_logs',
    defaultEnabled: false,
    showInUI: true,
    policyTemplate: 'aws_logs',
  },
];

/**
 * Merge the static routing table with data from any Fleet package manifest.
 * Derives managed_integration, signalType, inputs, requiredConfig, mandatoryFields,
 * defaultEnabled, and identityFederationSupported from the manifest for all packages.
 * Static fallback values are used when the manifest does not provide a field.
 */
export function buildAwsServiceMatrix(
  packages: Record<string, PackageInfo>,
  staticEntries: AwsServiceStaticEntry[]
): AwsServiceMatrixEntry[] {
  return staticEntries.map((entry) => {
    const { deploymentMethods: staticMethods, ...rest } = entry;

    let signalType = entry.signalType;
    let inputs = entry.inputs;
    let requiredConfig = entry.requiredConfig;
    let mandatoryFields = entry.mandatoryFields;
    let defaultEnabled = entry.defaultEnabled ?? true;
    let identityFederationSupported: boolean | undefined;
    let managedIntegrations = false;

    const packageInfo = packages[entry.packageName];
    if (packageInfo) {
      const pt = (packageInfo.policy_templates ?? []).find(
        (p: any) => 'name' in p && p.name === entry.policyTemplate
      );
      const ds = (packageInfo.data_streams ?? []).find(
        (d: any) => d.path === (entry.dataStream ?? entry.id)
      );

      managedIntegrations = (pt as any)?.deployment_modes?.agentless?.enabled === true;

      if ((ds as any)?.type === 'logs' || (ds as any)?.type === 'metrics') {
        signalType = (ds as any).type as SignalType;
      }

      const dsInputs: string[] = [
        ...new Set(((ds as any)?.streams ?? []).map((s: any) => s.input as string) as string[]),
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
    }

    // Build the merged deploymentMethods array.
    // managed_integration always goes first so it is the preferred method when present.
    const methods: DeploymentMethodEntry[] = [];
    if (managedIntegrations) {
      methods.push({ method: 'managed_integration' });
    }
    if (staticMethods?.length) {
      methods.push(...staticMethods);
    }
    const deploymentMethods: DeploymentMethodEntry[] = methods.length > 0 ? methods : [];

    // Ensure exactly one preferred entry — set it on the first if none is marked.
    if (deploymentMethods.length > 0 && !deploymentMethods.some((dm) => dm.preferred)) {
      deploymentMethods[0] = { ...deploymentMethods[0], preferred: true };
    }

    const merged = {
      ...rest,
      deploymentMethods,
      signalType: (signalType ?? entry.signalType) as SignalType,
      inputs,
      requiredConfig,
      mandatoryFields,
      defaultEnabled,
      identityFederationSupported,
    } as AwsServiceMatrixEntry;

    return merged;
  });
}

/** Internal static entries — exported for use by buildAwsServiceMatrix in the hook. */
export const AWS_SERVICES_STATIC: AwsServiceStaticEntry[] = AWS_SERVICES_MATRIX_RAW;

/**
 * Static metadata map for service lookups that do not require the manifest
 * (name, category, showInUI, etc.).
 * For manifest-enriched values (deploymentMethods, identityFederationSupported)
 * use useAwsServicesMap() in React components.
 * Note: signalType and defaultEnabled may be absent for aws package entries since
 * those fields are derived from the manifest at runtime.
 */
export const AWS_SERVICES_MAP = new Map<string, AwsServiceMatrixEntry>(
  AWS_SERVICES_STATIC.map((entry) => {
    const { deploymentMethods: staticMethods, ...rest } = entry;
    const deploymentMethods: DeploymentMethodEntry[] = staticMethods ?? [];
    const base = {
      ...rest,
      deploymentMethods,
    } as unknown as AwsServiceMatrixEntry;
    return [entry.id, base];
  })
);
