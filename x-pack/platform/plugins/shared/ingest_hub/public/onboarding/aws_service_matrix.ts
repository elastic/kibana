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

import type { ServiceCategory } from './service_categories';

export type { ServiceCategory };

export type SignalType = 'logs' | 'metrics';

export type DeploymentMethod = 'managed_integration' | 'ecf' | 'agent_based';

/**
 * Log type identifiers used by the ECF CloudFormation templates.
 * Services with `ecfLogType` set are deployed via the "Launch CloudFormation" button in Step 4.
 * @see https://github.com/elastic/edot-cloud-forwarder-aws/tree/main/templates/release
 */
export type EcfLogType = 'vpcflow' | 'cloudtrail' | 'waf';

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

/** A manifest var definition plus the input types it appears under. */
export interface ServiceVarDef {
  def: RegistryVarsEntry;
  /** streams[].input values this var appears under, e.g. ['aws-s3'] */
  inputs: string[];
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
  /** Manifest var type by name — 'bool', 'text', 'integer', etc. Derived from the package manifest. */
  varTypes?: Record<string, string>;
  /** Full manifest var definitions keyed by name, with the inputs each var appears under. Derived from the package manifest. */
  varDefs?: Record<string, ServiceVarDef>;
  packageName: string;
  /** Fleet policy template name derived from policy_templates[].data_streams lookup in the manifest. */
  policyTemplate?: string;
  /** Whether the data stream is enabled by default when the integration is installed. Derived from the package manifest. */
  defaultEnabled: boolean;
  /**
   * Input types that are enabled by default (stream.enabled !== false in the manifest).
   * Used to seed enabledInputs when a user first opens a service — inputs explicitly
   * marked enabled:false in the manifest are excluded.
   */
  defaultEnabledInputs: string[];
  /** Whether this service should be shown in the AWS onboarding UI. Defaults to true. */
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
}

/**
 * Internal type for the static routing table.
 * signalType, defaultEnabled, and defaultEnabledInputs are derived at runtime from the Fleet package manifest.
 */
type AwsServiceStaticEntry = Omit<
  AwsServiceMatrixEntry,
  | 'deploymentMethods'
  | 'signalType'
  | 'defaultEnabled'
  | 'defaultEnabledInputs'
  | 'showInUI'
  | 'optionalConfig'
  | 'name'
  | 'varDefs'
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
    category: 'networking_content_delivery',
    packageName: 'aws',
  },
  {
    id: 'apigateway_metrics',
    category: 'networking_content_delivery',
    packageName: 'aws',
  },
  {
    id: 'lambda',
    category: 'compute',
    packageName: 'aws',
  },
  {
    id: 'lambda_logs',
    category: 'compute',
    packageName: 'aws',
  },

  // ── aws package — Compute ───────────────────────────────────────────────
  {
    id: 'ec2_logs',
    category: 'compute',
    packageName: 'aws',
  },
  {
    id: 'ec2_metrics',
    category: 'compute',
    packageName: 'aws',
  },
  {
    id: 'ecs_metrics',
    category: 'compute',
    packageName: 'aws',
  },
  {
    id: 'emr_logs',
    category: 'compute',
    packageName: 'aws',
  },
  {
    id: 'emr_metrics',
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
    id: 'cloudwatch_logs',
    category: 'management_governance',
    packageName: 'aws',
  },
  {
    id: 'cloudwatch_metrics',
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
    name: 'AWS CloudTrail',
    category: 'management_governance',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    packageName: 'aws',
    ecfLogType: 'cloudtrail',
  },
  // TODO otel variants should be enabled when the Data format selector is added in ingest-dev#8530
  {
    id: 'cloudtrail_otel',
    category: 'management_governance',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    packageName: 'aws',
    ecfLogType: 'cloudtrail',
    showInUI: false,
    ecfDedicatedTemplate: 'otel',
  },
  {
    id: 'config',
    name: 'AWS Config',
    category: 'security_identity_compliance',
    packageName: 'aws',
  },
  {
    id: 'guardduty',
    name: 'AWS GuardDuty',
    category: 'security_identity_compliance',
    packageName: 'aws',
  },
  {
    id: 'inspector',
    name: 'AWS Inspector',
    category: 'security_identity_compliance',
    packageName: 'aws',
  },
  {
    id: 'firewall_logs',
    category: 'security_identity_compliance',
    packageName: 'aws',
  },
  {
    id: 'firewall_metrics',
    category: 'security_identity_compliance',
    deploymentMethods: [{ method: 'agent_based', preferred: true }],
    packageName: 'aws',
    showInUI: false, // TODO confirm if only agent_based and if should be included in onboarding flow
  },
  {
    id: 'securityhub_findings',
    name: 'AWS Security Hub',
    category: 'security_identity_compliance',
    packageName: 'aws',
  },
  {
    id: 'securityhub_findings_full_posture',
    name: 'AWS Security Hub (Full Posture / CSPM)',
    category: 'security_identity_compliance',
    packageName: 'aws',
  },
  {
    id: 'securityhub_insights',
    name: 'AWS Security Hub (Insights)',
    category: 'security_identity_compliance',
    packageName: 'aws',
  },
  {
    id: 'waf',
    name: 'AWS WAF',
    category: 'security_identity_compliance',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    packageName: 'aws',
    ecfLogType: 'waf',
    // TODO: WAF only supports S3 input in ECF deployment mode
    // if users choose Agent-based deployment, cloudwatch should become available
    // and all package vars should be displayed
  },
  // TODO otel variants should be enabled when the Data format selector is added in ingest-dev#8530
  {
    id: 'waf_otel',
    category: 'management_governance',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    packageName: 'aws',
    ecfLogType: 'waf',
    showInUI: false,
    ecfDedicatedTemplate: 'otel',
  },

  // ── aws package — Networking and Content Delivery ─────────────────────────
  {
    id: 'cloudfront_logs',
    category: 'networking_content_delivery',
    // ECF: CloudFront is in the edot-cloud-forwarder-aws#452 DoD but no released template yet
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    showInUI: false,
    packageName: 'aws',
  },
  {
    id: 'elb_logs',
    category: 'networking_content_delivery',
    packageName: 'aws',
  },
  {
    id: 'elb_metrics',
    category: 'networking_content_delivery',
    packageName: 'aws',
  },
  {
    id: 'natgateway',
    category: 'networking_content_delivery',
    packageName: 'aws',
  },
  {
    id: 'route53_public_logs',
    category: 'networking_content_delivery',
    packageName: 'aws',
  },
  {
    id: 'route53_resolver_logs',
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
    name: 'AWS VPC Flow',
    category: 'networking_content_delivery',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    packageName: 'aws',
    ecfLogType: 'vpcflow',
  },
  // TODO otel variants should be enabled when the Data format selector is added in ingest-dev#8530
  {
    id: 'vpcflow_otel',
    category: 'management_governance',
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    packageName: 'aws',
    ecfLogType: 'vpcflow',
    showInUI: false,
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
    id: 's3_daily_storage',
    category: 'storage',
    packageName: 'aws',
  },
  {
    id: 's3_request',
    category: 'storage',
    packageName: 'aws',
  },
  {
    id: 's3access',
    category: 'storage',
    packageName: 'aws',
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

  // ── aws package — management_governance ─────────────────────────────────
  {
    id: 'kafka_metrics',
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
    id: 'guardrails',
    name: 'AWS Bedrock (Guardrails)',
    category: 'machine_learning',
    packageName: 'aws_bedrock',
  },
  {
    id: 'invocation',
    name: 'AWS Bedrock (Invocation)',
    category: 'machine_learning',
    packageName: 'aws_bedrock',
  },
  {
    id: 'runtime',
    name: 'AWS Bedrock (Runtime)',
    category: 'machine_learning',
    packageName: 'aws_bedrock',
  },
  // TODO(PM): deployment method and signal type TBD — awaiting PM ratification
  {
    id: 'bedrock_agentcore',
    name: 'AWS Bedrock AgentCore',
    category: 'machine_learning',
    packageName: 'aws_bedrock_agentcore',
    showInUI: false,
  },

  // ── awsfargate package — Containers ─────────────────────────────────────
  {
    id: 'task_stats',
    name: 'AWS Fargate',
    category: 'containers',
    packageName: 'awsfargate',
  },

  // ── aws_mq package — application_integration ────────────────────────────
  // TODO(PM): deployment method and signal type TBD — awaiting PM ratification
  {
    id: 'mq',
    name: 'AWS MQ',
    category: 'application_integration',
    packageName: 'aws_mq',
    showInUI: false,
    policyTemplate: 'amazon_mq',
  },

  // ── aws_logs package — Management and Governance ──────────────────────────
  {
    id: 'aws_logs',
    name: 'AWS Logs (Generic)',
    category: 'management_governance',
    packageName: 'aws_logs',
  },
];

/**
 * Merge the static routing table with data from any Fleet package manifest.
 * Derives managed_integration, signalType, inputs, requiredConfig, optionalConfig,
 * defaultEnabled, and identityFederationSupported from the manifest.
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
    let defaultEnabled = true;
    let defaultEnabledInputs: string[] = [];
    let identityFederationSupported: boolean | undefined;
    let managedIntegrations = false;
    let pt: any;
    const varTypes: Record<string, string> = {};
    const varDefs: Record<string, ServiceVarDef> = {};

    const packageInfo = packages[entry.packageName];
    const badge = entry.badge ?? releaseToBadge((packageInfo as any)?.release);
    if (packageInfo) {
      pt =
        (packageInfo.policy_templates ?? []).find((p: any) =>
          (p.data_streams ?? []).includes(entry.id)
        ) ?? packageInfo.policy_templates?.[0];
      const ds = (packageInfo.data_streams ?? []).find((d: any) => d.path === entry.id);

      // Agentless is read at the policy-template level, which may cover both logs and metrics
      // data streams (e.g. ec2 has ec2_logs + ec2_metrics under one template; dynamodb, rds,
      // and s3 are similar). Both signal types inherit managed_integration from the same flag,
      // which is the correct behaviour today — all those templates are intended for agentless.
      // The latent risk is a future template that covers signal types with different deployment
      // requirements; the clean fix for that case is per-data-stream deployment fields in the
      // manifest.
      managedIntegrations = (pt as any)?.deployment_modes?.agentless?.enabled === true;

      if (!name && (ds as any)?.title) {
        name = (ds as any).title as string;
      }

      if ((ds as any)?.type === 'logs' || (ds as any)?.type === 'metrics') {
        signalType = (ds as any).type as SignalType;
      }

      const dsStreams: Array<{ input?: string; enabled?: boolean }> = (ds as any)?.streams ?? [];
      const dsInputs: string[] = [...new Set(dsStreams.map((s) => s.input as string))];
      if (dsInputs.length > 0) {
        inputs = dsInputs;
        defaultEnabledInputs = dsInputs.filter((input) => {
          const stream = dsStreams.find((s) => s.input === input);
          return stream?.enabled !== false;
        });
      }

      // Walk streams preserving input attribution and full var definitions.
      // First-wins on name collision: when a var appears under multiple inputs,
      // the definition from the first stream wins and the additional input is appended.
      for (const s of ((ds as any)?.streams ?? []) as Array<{
        input?: string;
        vars?: RegistryVarsEntry[];
      }>) {
        for (const v of s.vars ?? []) {
          if (!v.name) continue;
          const existing = varDefs[v.name];
          if (existing) {
            if (s.input && !existing.inputs.includes(s.input)) existing.inputs.push(s.input);
            continue;
          }
          varDefs[v.name] = { def: v, inputs: s.input ? [s.input] : [] };
        }
      }

      const allVars: RegistryVarsEntry[] = Object.values(varDefs).map((d) => d.def);

      for (const v of allVars) {
        if (v.name && v.type) varTypes[v.name] = v.type;
      }

      // All required vars (shown or hidden) go into requiredConfig. field_config functions
      // use show_user from varDefs to split them into user-visible and mandatory-hidden sections.
      const reqVars: string[] = [
        ...new Set(allVars.filter((v: any) => v.required).map((v: any) => v.name as string)),
      ];
      if (reqVars.length > 0) {
        requiredConfig = reqVars;
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
    // managed_integration is always preferred when present; static methods are demoted.
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
    const deploymentMethods: DeploymentMethodEntry[] = methods;

    // When managed_integration is absent, ensure exactly one static method is preferred.
    if (
      !managedIntegrations &&
      deploymentMethods.length > 0 &&
      !deploymentMethods.some((dm) => dm.preferred)
    ) {
      deploymentMethods[0] = { ...deploymentMethods[0], preferred: true };
    }

    // Auto-hide when no deployment methods are available and not explicitly shown.
    // Once agentless is enabled in the manifest or ECF is added statically, the service
    // gets deployment methods and becomes visible without a manual showInUI update.
    const showInUI = entry.showInUI ?? deploymentMethods.length > 0;

    // For ECF-only services, ECF manages all configuration internally.
    // Only the trigger-source var needs user input: bucket_arn (S3) or log_group_arn (CloudWatch).
    // Suppress the rest of the manifest vars so the flyout stays minimal.
    const ECF_TRIGGER_VARS = new Set(['bucket_arn', 'log_group_arn']);
    if (deploymentMethods.length > 0 && deploymentMethods.every((m) => m.method === 'ecf')) {
      const ecfVarNames = Object.keys(varDefs).filter((v) => ECF_TRIGGER_VARS.has(v));
      if (ecfVarNames.length > 0) {
        requiredConfig = ecfVarNames;
        optionalConfig = undefined;
      }
    }

    const merged = {
      ...rest,
      name: (name ?? entry.id) as string,
      policyTemplate: (pt as any)?.name as string | undefined,
      deploymentMethods,
      signalType: (signalType ?? entry.signalType) as SignalType,
      inputs,
      requiredConfig,
      optionalConfig,
      varTypes: Object.keys(varTypes).length > 0 ? varTypes : undefined,
      varDefs: Object.keys(varDefs).length > 0 ? varDefs : undefined,
      defaultEnabled,
      defaultEnabledInputs,
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
