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

export type Badge = 'technical_preview' | 'beta';

function releaseToBadge(release: string | undefined): Badge | undefined {
  if (release === 'experimental') return 'technical_preview';
  if (release === 'beta') return 'beta';
  return undefined;
}

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
  /** Whether OIDC-based IAM role assumption is supported.
   *  Derived from the package manifest: true when none of the service's inputs hide
   *  the 'identity_federation' option in the 'credential_type' var_group. */
  identityFederationSupported?: boolean;
  /** Fleet integration input types required by this data stream (e.g. 'aws-s3', 'aws-cloudwatch') */
  inputs?: string[];
  /** Manifest var names the user must configure to activate this data stream */
  requiredConfig?: string[];
  /** Manifest var names that are optional and surfaced in the UI. Derived from manifest vars with required: false && show_user: true. */
  optionalConfig?: string[];
  /** Boolean manifest vars that are required: true in the package but have default values */
  mandatoryFields?: string[];
  /** Manifest var type by name — 'bool', 'text', 'integer', etc. Derived from the package manifest. */
  varTypes?: Record<string, string>;
  packageName: string;
  /** Fleet policy template name derived from policy_templates[].data_streams lookup in the manifest. */
  policyTemplate?: string;
  /** Whether the data stream is enabled by default when the integration is installed. Derived from the package manifest. */
  defaultEnabled: boolean;
  /** Whether this service should be shown in the AWS onboarding UI. Defaults to true. */
  showInUI: boolean;
  badge?: Badge;
}

/**
 * Internal type for the static routing table.
 * signalType and defaultEnabled are derived at runtime from the Fleet package manifest.
 */
type AwsServiceStaticEntry = Omit<
  AwsServiceMatrixEntry,
  'deploymentMethods' | 'signalType' | 'defaultEnabled' | 'showInUI' | 'optionalConfig' | 'name'
> & {
  deploymentMethods?: DeploymentMethodEntry[];
  signalType?: SignalType;
  showInUI?: boolean;
  /** Override when the data stream title from the manifest isn't the right display name. */
  name?: string;
};

// TODO aws_cloudwatch_input_otel for otel versions

const AWS_SERVICES_MATRIX_RAW: AwsServiceStaticEntry[] = [
  // ── aws package — Application Integration ──────────────────────────────
  {
    id: 'apigateway_logs',
    category: 'Networking and Content Delivery',
    packageName: 'aws',
  },
  {
    id: 'apigateway_metrics',
    category: 'Networking and Content Delivery',
    packageName: 'aws',
  },
  {
    id: 'lambda',
    category: 'Compute',
    packageName: 'aws',
  },
  {
    id: 'lambda_logs',
    category: 'Compute',
    packageName: 'aws',
  },

  // ── aws package — Compute ───────────────────────────────────────────────
  {
    id: 'ec2_logs',
    category: 'Compute',
    packageName: 'aws',
  },
  {
    id: 'ec2_metrics',
    category: 'Compute',
    packageName: 'aws',
  },
  {
    id: 'ecs_metrics',
    category: 'Compute',
    packageName: 'aws',
  },
  {
    id: 'emr_logs',
    category: 'Compute',
    packageName: 'aws',
  },
  {
    id: 'emr_metrics',
    category: 'Compute',
    packageName: 'aws',
  },

  // ── aws package — Management and Governance ──────────────────────────────
  {
    id: 'awshealth',
    category: 'Management and Governance',
    packageName: 'aws',
  },
  {
    id: 'cloudwatch_logs',
    category: 'Management and Governance',
    packageName: 'aws',
  },
  {
    id: 'cloudwatch_metrics',
    category: 'Management and Governance',
    packageName: 'aws',
  },

  // ── aws package — Cloud Financial Management ────────────────────────────
  {
    id: 'billing',
    category: 'Cloud Financial Management',
    packageName: 'aws',
  },
  {
    id: 'usage',
    category: 'Cloud Financial Management',
    packageName: 'aws',
  },

  // ── aws package — Management and Governance / Security, Identity and Compliance ──
  {
    id: 'cloudtrail',
    category: 'Management and Governance',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    packageName: 'aws',
  },
  {
    id: 'config',
    // name: 'AWS Config',
    category: 'Security, Identity and Compliance',
    packageName: 'aws',
  },
  {
    id: 'guardduty',
    // name: 'AWS GuardDuty',
    category: 'Security, Identity and Compliance',
    packageName: 'aws',
  },
  {
    id: 'inspector',
    // name: 'AWS Inspector',
    category: 'Security, Identity and Compliance',
    packageName: 'aws',
  },
  {
    id: 'firewall_logs',
    category: 'Security, Identity and Compliance',
    packageName: 'aws',
  },
  {
    id: 'firewall_metrics',
    category: 'Security, Identity and Compliance',
    deploymentMethods: [{ method: 'agent_based', preferred: true }],
    packageName: 'aws',
    showInUI: false, // TODO confirm if only agent_based and if should be included in onboarding flow
  },
  {
    id: 'securityhub_findings',
    // name: 'AWS Security Hub',
    category: 'Security, Identity and Compliance',
    packageName: 'aws',
  },
  {
    id: 'securityhub_findings_full_posture',
    // name: 'AWS Security Hub (Full Posture / CSPM)',
    category: 'Security, Identity and Compliance',
    packageName: 'aws',
  },
  {
    id: 'securityhub_insights',
    // name: 'AWS Security Hub (Insights)',
    category: 'Security, Identity and Compliance',
    packageName: 'aws',
  },
  {
    id: 'waf',
    category: 'Security, Identity and Compliance',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    packageName: 'aws',
  },

  // ── aws package — Networking and Content Delivery ─────────────────────────
  {
    id: 'cloudfront_logs',
    category: 'Networking and Content Delivery',
    // ECF: CloudFront is in the edot-cloud-forwarder-aws#452 DoD but no released template yet
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    showInUI: false,
    packageName: 'aws',
  },
  {
    id: 'elb_logs',
    category: 'Networking and Content Delivery',
    packageName: 'aws',
  },
  {
    id: 'elb_metrics',
    category: 'Networking and Content Delivery',
    packageName: 'aws',
  },
  {
    id: 'natgateway',
    category: 'Networking and Content Delivery',
    packageName: 'aws',
  },
  {
    id: 'route53_public_logs',
    category: 'Networking and Content Delivery',
    packageName: 'aws',
  },
  {
    id: 'route53_resolver_logs',
    category: 'Networking and Content Delivery',
    packageName: 'aws',
  },
  {
    id: 'transitgateway',
    category: 'Networking and Content Delivery',
    packageName: 'aws',
  },
  {
    id: 'vpcflow',
    category: 'Networking and Content Delivery',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    packageName: 'aws',
  },
  {
    id: 'vpn',
    category: 'Networking and Content Delivery',
    packageName: 'aws',
  },

  // ── aws package — Storage ───────────────────────────────────────────────
  {
    id: 'ebs',
    category: 'Storage',
    packageName: 'aws',
  },
  {
    id: 's3_daily_storage',
    category: 'Storage',
    packageName: 'aws',
  },
  {
    id: 's3_request',
    category: 'Storage',
    packageName: 'aws',
  },
  {
    id: 's3access',
    category: 'Storage',
    packageName: 'aws',
  },
  {
    id: 's3_storage_lens',
    category: 'Storage',
    packageName: 'aws',
  },

  // ── aws package — Databases ──────────────────────────────────────────────
  {
    id: 'dynamodb',
    category: 'Databases',
    packageName: 'aws',
  },
  {
    id: 'rds',
    category: 'Databases',
    packageName: 'aws',
  },
  {
    id: 'redshift',
    category: 'Databases',
    packageName: 'aws',
  },

  // ── aws package — Analytics / Application Integration ───────────────────
  {
    id: 'kafka_metrics',
    category: 'Management and Governance',
    packageName: 'aws',
  },
  {
    id: 'kinesis',
    category: 'Management and Governance',
    packageName: 'aws',
  },
  {
    id: 'sns',
    category: 'Management and Governance',
    packageName: 'aws',
  },
  {
    id: 'sqs',
    category: 'Management and Governance',
    packageName: 'aws',
  },

  // ── aws_bedrock package — Machine Learning ──────────────────────────────
  {
    id: 'guardrails',
    // name: 'AWS Bedrock (Guardrails)',
    category: 'Machine Learning',
    packageName: 'aws_bedrock',
  },
  {
    id: 'invocation',
    // name: 'AWS Bedrock (Invocation)',
    category: 'Machine Learning',
    packageName: 'aws_bedrock',
  },
  {
    id: 'runtime',
    // name: 'AWS Bedrock (Runtime)',
    category: 'Machine Learning',
    packageName: 'aws_bedrock',
  },
  // TODO(PM): deployment method and signal type TBD — awaiting PM ratification
  {
    id: 'bedrock_agentcore',
    // name: 'AWS Bedrock AgentCore',
    category: 'Machine Learning',
    packageName: 'aws_bedrock_agentcore',
    showInUI: false,
  },

  // ── awsfargate package — Containers ─────────────────────────────────────
  {
    id: 'task_stats',
    // name: 'AWS Fargate',
    category: 'Containers',
    packageName: 'awsfargate',
  },

  // ── aws_mq package — Application Integration ────────────────────────────
  // TODO(PM): deployment method and signal type TBD — awaiting PM ratification
  {
    id: 'mq',
    // name: 'AWS MQ',
    category: 'Application Integration',
    packageName: 'aws_mq',
    showInUI: false,
  },

  // ── aws_logs package — Management and Governance ──────────────────────────
  {
    id: 'aws_logs',
    // name: 'AWS Logs (Generic)',
    category: 'Management and Governance',
    packageName: 'aws_logs',
  },
];

/**
 * Merge the static routing table with data from any Fleet package manifest.
 * Derives managed_integration, signalType, inputs, requiredConfig, optionalConfig,
 * mandatoryFields, defaultEnabled, and identityFederationSupported from the manifest.
 * Static fallback values are used when the manifest does not provide a field.
 */
export function buildAwsServiceMatrix(
  packages: Record<string, PackageInfo>,
  staticEntries: AwsServiceStaticEntry[]
): AwsServiceMatrixEntry[] {
  return staticEntries.map((entry) => {
    const { deploymentMethods: staticMethods, ...rest } = entry;

    let name = entry.name;
    let signalType = entry.signalType;
    let inputs = entry.inputs;
    let requiredConfig = entry.requiredConfig;
    let optionalConfig: string[] | undefined;
    let mandatoryFields = entry.mandatoryFields;
    let defaultEnabled = true;
    let identityFederationSupported: boolean | undefined;
    let managedIntegrations = false;
    let pt: any;
    const varTypes: Record<string, string> = {};

    const packageInfo = packages[entry.packageName];
    const badge = entry.badge ?? releaseToBadge((packageInfo as any)?.release);
    if (packageInfo) {
      pt =
        (packageInfo.policy_templates ?? []).find((p: any) =>
          (p.data_streams ?? []).includes(entry.id)
        ) ?? packageInfo.policy_templates?.[0];
      const ds = (packageInfo.data_streams ?? []).find((d: any) => d.path === entry.id);

      managedIntegrations = (pt as any)?.deployment_modes?.agentless?.enabled === true;

      if (!name && (ds as any)?.title) {
        name = (ds as any).title as string;
      }

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

      for (const v of allVars) {
        if (v.name && v.type) varTypes[v.name as string] = v.type as string;
      }

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

      const optVars: string[] = [
        ...new Set(
          allVars.filter((v: any) => !v.required && v.show_user).map((v: any) => v.name as string)
        ),
      ];
      if (optVars.length > 0) {
        optionalConfig = optVars;
      }

      if ((ds as any)?.streams?.length > 0) {
        defaultEnabled = !(ds as any).streams.some((s: any) => s.enabled === false);
      }

      // Derive identityFederationSupported: true when at least one of this data stream's
      // inputs does NOT hide 'identity_federation' in the 'credential_type' var_group.
      // False only when every applicable input blocks it (no IF-compatible input path exists).
      const ptInputs: any[] = (pt as any)?.inputs ?? [];
      const dsInputTypes = new Set(((ds as any)?.streams ?? []).map((s: any) => s.input as string));
      if (ptInputs.length > 0 && dsInputTypes.size > 0) {
        const relevantInputs = ptInputs.filter((i: any) => dsInputTypes.has(i.type));
        if (relevantInputs.length > 0) {
          identityFederationSupported = relevantInputs.some(
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

    // Auto-hide when no deployment methods are available and not explicitly shown.
    // Once agentless is enabled in the manifest or ECF is added statically, the service
    // gets deployment methods and becomes visible without a manual showInUI update.
    const showInUI = entry.showInUI ?? deploymentMethods.length > 0;

    const merged = {
      ...rest,
      name: (name ?? entry.id) as string,
      policyTemplate: (pt as any)?.name as string | undefined,
      deploymentMethods,
      signalType: (signalType ?? entry.signalType) as SignalType,
      inputs,
      requiredConfig,
      optionalConfig,
      mandatoryFields,
      varTypes: Object.keys(varTypes).length > 0 ? varTypes : undefined,
      defaultEnabled,
      showInUI,
      badge,
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
 * Note: signalType and defaultEnabled are derived from the manifest at runtime;
 * values here are placeholders — use useAwsServicesMap() where these fields matter.
 */
export const AWS_SERVICES_MAP = new Map<string, AwsServiceMatrixEntry>(
  AWS_SERVICES_STATIC.map((entry) => {
    const { deploymentMethods: staticMethods, ...rest } = entry;
    const deploymentMethods: DeploymentMethodEntry[] = staticMethods ?? [];
    const base = {
      ...rest,
      name: (entry.name ?? entry.id) as string,
      deploymentMethods,
      showInUI: entry.showInUI ?? true,
      defaultEnabled: true,
    } as unknown as AwsServiceMatrixEntry;
    return [entry.id, base];
  })
);
