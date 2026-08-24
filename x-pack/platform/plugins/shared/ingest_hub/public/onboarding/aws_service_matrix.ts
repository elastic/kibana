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
};

// TODO aws_cloudwatch_input_otel for otel versions

const AWS_SERVICES_MATRIX_RAW: AwsServiceStaticEntry[] = [
  // ── aws package — Application Integration ──────────────────────────────
  {
    id: 'apigateway',
    name: 'AWS API Gateway',
    category: 'networking_content_delivery',
    packageName: 'aws',
  },
  {
    id: 'lambda',
    name: 'AWS Lambda',
    category: 'compute',
    packageName: 'aws',
  },

  // ── aws package — Compute ───────────────────────────────────────────────
  {
    id: 'ec2',
    name: 'Amazon EC2',
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
    name: 'Amazon EMR',
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
    id: 'firewall',
    name: 'AWS Network Firewall',
    category: 'security_identity_compliance',
    packageName: 'aws',
    // firewall_metrics has no agentless support yet (tracked: elastic/integrations#19301).
    excludedDataStreams: ['firewall_metrics'],
  },
  {
    id: 'securityhub',
    name: 'AWS Security Hub',
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
    // ECF only supports S3 for WAF; CloudWatch input is intentionally excluded.
    inputs: ['aws-s3'],
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
    id: 'cloudfront',
    category: 'networking_content_delivery',
    // ECF: CloudFront is in the edot-cloud-forwarder-aws#452 DoD but no released template yet
    deploymentMethods: [{ method: 'ecf', preferred: true }],
    showInUI: false,
    packageName: 'aws',
  },
  {
    id: 'elb',
    name: 'AWS ELB',
    category: 'networking_content_delivery',
    packageName: 'aws',
  },
  {
    id: 'natgateway',
    category: 'networking_content_delivery',
    packageName: 'aws',
  },
  {
    id: 'route53',
    name: 'AWS Route 53',
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
    id: 's3',
    name: 'Amazon S3',
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
    name: 'AWS Bedrock',
    category: 'machine_learning',
    packageName: 'aws_bedrock',
  },
  // TODO(PM): deployment method and signal type TBD — awaiting PM ratification
  {
    id: 'aws_bedrock_agentcore',
    name: 'AWS Bedrock AgentCore',
    category: 'machine_learning',
    packageName: 'aws_bedrock_agentcore',
    showInUI: false,
  },

  // ── awsfargate package — Containers ─────────────────────────────────────
  {
    id: 'awsfargate',
    name: 'AWS Fargate',
    category: 'containers',
    packageName: 'awsfargate',
  },

  // ── aws_mq package — application_integration ────────────────────────────
  // TODO(PM): deployment method and signal type TBD — awaiting PM ratification
  {
    id: 'amazon_mq',
    name: 'AWS MQ',
    category: 'application_integration',
    packageName: 'aws_mq',
    showInUI: false,
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
    let managedIntegrations = false;
    let pt: any;
    const varDefsByInput: Record<string, Record<string, RegistryVarsEntry>> = {};
    const varDefsByDataStream: Record<string, DataStreamInfo> = {};
    const signalTypesSet = new Set<SignalType>();
    const dataStreams: string[] = [];

    const packageInfo = packages[entry.packageName];
    const badge = entry.badge ?? releaseToBadge((packageInfo as any)?.release);

    if (packageInfo) {
      // Find the policy template by name (entry.id IS the PT name).
      pt = (packageInfo.policy_templates ?? []).find((p: any) => p.name === entry.id);

      if (pt) {
        // Agentless is read at the policy-template level, which may cover both logs and metrics
        // data streams (e.g. ec2 has ec2_logs + ec2_metrics under one template). Both signal
        // types inherit managed_integration from the same flag, which is the correct behaviour
        // today — all those templates are intended for agentless.
        managedIntegrations = (pt as any)?.deployment_modes?.agentless?.enabled === true;

        if (!name && (pt as any)?.title) {
          name = (pt as any).title as string;
        }

        // Collect all data streams for this policy template, excluding any blocked ones.
        const ptDataStreamIds: string[] = (pt as any).data_streams ?? [];
        const includedDsIds = ptDataStreamIds.filter(
          (dsId) => !(excludedDataStreams ?? []).includes(dsId)
        );

        for (const dsId of includedDsIds) {
          const ds = (packageInfo.data_streams ?? []).find((d: any) => d.path === dsId);
          if (!ds) continue;

          dataStreams.push(dsId);

          if ((ds as any)?.type === 'logs' || (ds as any)?.type === 'metrics') {
            signalTypesSet.add((ds as any).type as SignalType);
          }

          const dsStreams: Array<{
            input?: string;
            enabled?: boolean;
            vars?: RegistryVarsEntry[];
          }> = (ds as any)?.streams ?? [];
          const dsManifestInputs: string[] = [
            ...new Set(dsStreams.map((s) => s.input as string).filter(Boolean)),
          ];

          // Static entry inputs act as an allowlist — restrict per-DS inputs when the static
          // entry already sets them (e.g. WAF → S3 only for ECF).
          const dsEffectiveInputs =
            entry.inputs && dsManifestInputs.some((i) => entry.inputs!.includes(i))
              ? entry.inputs.filter((i) => dsManifestInputs.includes(i))
              : dsManifestInputs;

          const dsDefaultEnabledInputs = dsEffectiveInputs.filter((input) => {
            const stream = dsStreams.find((s) => s.input === input);
            return stream?.enabled !== false;
          });

          // Build per-DS var defs (input → varName → definition). First-wins within each input
          // bucket when the same var name appears in multiple streams of the same input type.
          const dsVarDefsByInput: Record<string, Record<string, RegistryVarsEntry>> = {};
          for (const s of dsStreams) {
            if (!s.input || !dsEffectiveInputs.includes(s.input)) continue;
            const bucket = (dsVarDefsByInput[s.input] ??= {});
            for (const v of (s.vars ?? []) as RegistryVarsEntry[]) {
              if (!(v as any).name) continue;
              bucket[(v as any).name] ??= v;
            }
          }

          // Derive per-DS required/optional config.
          const dsAllVars: RegistryVarsEntry[] = Object.values(dsVarDefsByInput).flatMap((byName) =>
            Object.values(byName)
          );
          const dsReqVars: string[] = [
            ...new Set(dsAllVars.filter((v: any) => v.required).map((v: any) => v.name as string)),
          ];
          const dsReqVarSet = new Set(dsReqVars);
          const dsOptVars: string[] = [
            ...new Set(
              dsAllVars
                .filter(
                  (v: any) => !v.required && v.show_user && !dsReqVarSet.has(v.name as string)
                )
                .map((v: any) => v.name as string)
            ),
          ];

          varDefsByDataStream[dsId] = {
            title: (ds as any).title as string | undefined,
            type: (ds as any).type as SignalType | undefined,
            inputs: dsEffectiveInputs,
            defaultEnabledInputs: dsDefaultEnabledInputs,
            varDefsByInput: dsVarDefsByInput,
            requiredConfig: dsReqVars.length > 0 ? dsReqVars : undefined,
            optionalConfig: dsOptVars.length > 0 ? dsOptVars : undefined,
          };

          // Merge into the union varDefsByInput (first-wins per input+var).
          for (const [input, byName] of Object.entries(dsVarDefsByInput)) {
            const bucket = (varDefsByInput[input] ??= {});
            for (const [varName, varDef] of Object.entries(byName)) {
              bucket[varName] ??= varDef;
            }
          }

          // Accumulate the inputs union (only when not overridden by a static allowlist).
          if (!entry.inputs) {
            for (const input of dsEffectiveInputs) {
              if (!inputs) inputs = [];
              if (!inputs.includes(input)) inputs.push(input);
            }
          }

          // Merge defaultEnabledInputs into the union.
          for (const input of dsDefaultEnabledInputs) {
            if (!defaultEnabledInputs.includes(input)) defaultEnabledInputs.push(input);
          }
        }

        // Derive union requiredConfig / optionalConfig from all data streams' vars.
        const allVars: RegistryVarsEntry[] = Object.values(varDefsByInput).flatMap((byName) =>
          Object.values(byName)
        );

        const reqVars: string[] = [
          ...new Set(allVars.filter((v: any) => v.required).map((v: any) => v.name as string)),
        ];
        if (reqVars.length > 0) {
          requiredConfig = reqVars;
        }

        const reqVarSet = new Set(reqVars);
        const optVars: string[] = [
          ...new Set(
            allVars
              .filter((v: any) => !v.required && v.show_user && !reqVarSet.has(v.name as string))
              .map((v: any) => v.name as string)
          ),
        ];
        if (optVars.length > 0) {
          optionalConfig = optVars;
        }

        // defaultEnabled: true unless the PT has no enabled inputs at all.
        if (dataStreams.length > 0) {
          defaultEnabled = defaultEnabledInputs.length > 0;
        }

        // Derive identityFederationSupported: true when at least one of the PT's inputs does NOT
        // hide 'identity_federation' in the 'credential_type' var_group.
        const ptInputs: any[] = (pt as any)?.inputs ?? [];
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

    if (
      !managedIntegrations &&
      deploymentMethods.length > 0 &&
      !deploymentMethods.some((dm) => dm.preferred)
    ) {
      deploymentMethods[0] = { ...deploymentMethods[0], preferred: true };
    }

    // Auto-hide when no deployment methods are available and not explicitly shown.
    const showInUI = entry.showInUI ?? deploymentMethods.length > 0;

    // For ECF-only services, ECF manages all configuration internally.
    // Only the trigger-source var needs user input: bucket_arn (S3) or log_group_arn (CloudWatch).
    // Restrict to the effective inputs so services with a static input allowlist (e.g. WAF → S3
    // only) don't surface trigger vars from inputs they don't support.
    const ECF_TRIGGER_VARS = new Set(['bucket_arn', 'log_group_arn']);
    if (deploymentMethods.length > 0 && deploymentMethods.every((m) => m.method === 'ecf')) {
      const effectiveInputSet = new Set(inputs ?? []);
      const ecfVarNames = [
        ...new Set(
          Object.entries(varDefsByInput)
            .filter(([input]) => effectiveInputSet.size === 0 || effectiveInputSet.has(input))
            .flatMap(([, byName]) => Object.keys(byName))
            .filter((v) => ECF_TRIGGER_VARS.has(v))
        ),
      ];
      if (ecfVarNames.length > 0) {
        requiredConfig = ecfVarNames;
        optionalConfig = undefined;
      }
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
  return {
    ...service,
    dataStreams: [dsId],
    signalTypes: dsInfo.type ? [dsInfo.type] : service.signalTypes,
    inputs: dsInfo.inputs,
    defaultEnabledInputs: dsInfo.defaultEnabledInputs,
    requiredConfig: dsInfo.requiredConfig,
    optionalConfig: dsInfo.optionalConfig,
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
