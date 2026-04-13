/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'js-yaml';

import type { Logger } from '@kbn/logging';

import type { FleetProxy, Output, TemplateAgentPolicyInput } from '../../types';
import type {
  FullAgentPolicyInput,
  FullAgentPolicyInputStream,
  OTelCollectorComponentID,
  OTelCollectorConfig,
  OTelCollectorPipeline,
  OTelCollectorPipelineID,
  PackageInfo,
} from '../../../common/types';
import {
  dataTypes,
  OTEL_COLLECTOR_INPUT_TYPE,
  outputType,
  USE_APM_VAR_NAME,
} from '../../../common/constants';
import { FleetError } from '../../errors';
import { getOutputIdForAgentPolicy } from '../../../common/services/output_helpers';
import { pkgToPkgKey } from '../epm/registry';
import { hasDynamicSignalTypes } from '../../../common/services';

/**
 * Builds OpenTelemetry Collector fragments merged into the full agent policy.
 *
 * **Dataset and namespace:** Routing transforms use `stream.data_stream` from
 * the merged policy (after `getFullInputStreams`, which applies
 * `data_stream.dataset` / `data_stream.type` stream vars for `otelcol` inputs
 * verbatim). OTTL statements set `data_stream.*` attributes as string literals;
 * Fleet does not append the `.otel` Elasticsearch template suffix here — that
 * suffix is only applied in EPM via `getRegistryDataStreamAssetBaseName(..., isOtelInputType)`.
 *
 * **Package shape:** `hasDynamicSignalTypes` distinguishes OTLP-style packages
 * (`dynamic_signal_types: true`) from receiver-specific integrations; both
 * paths still emit routing transforms from this module, with behaviour covered
 * by API integration tests.
 *
 * @see `dev_docs/data_streams.md` (OpenTelemetry integrations and the `.otel` suffix)
 * @see `x-pack/platform/test/fleet_api_integration/apis/agent_policy/agent_policy_otel_routing.ts`
 */
export function generateOtelcolConfig({
  inputs,
  dataOutput,
  packageInfoCache,
  proxy,
  logger,
  defaultPackageInfo,
}: {
  inputs: FullAgentPolicyInput[] | TemplateAgentPolicyInput[];
  dataOutput?: Output;
  packageInfoCache?: Map<string, PackageInfo>;
  proxy?: FleetProxy;
  logger?: Logger;
  defaultPackageInfo?: PackageInfo;
}): OTelCollectorConfig {
  const otelConfigs: OTelCollectorConfig[] = inputs
    .filter((input) => input.type === OTEL_COLLECTOR_INPUT_TYPE)
    .flatMap((input) => {
      // Get package info from input meta if available, fall back to defaultPackageInfo
      // (used for template inputs which have no meta.package)
      let packageInfo: PackageInfo | undefined = defaultPackageInfo;

      if (packageInfoCache && 'meta' in input && (input as FullAgentPolicyInput).meta?.package) {
        const pkgKey = pkgToPkgKey({
          name: (input as FullAgentPolicyInput).meta?.package?.name || '',
          version: (input as FullAgentPolicyInput).meta?.package?.version || '',
        });
        packageInfo = packageInfoCache.get(pkgKey) ?? defaultPackageInfo;
      }

      // Per-input dynamic signal types (policy_template + inputType); if policy_template is unset,
      // hasDynamicSignalTypes does not filter by template name (see otelcol_helpers).
      const policyTemplateName =
        'meta' in input
          ? (input as FullAgentPolicyInput).meta?.package?.policy_template
          : undefined;
      const inputDynamicSignalTypes = packageInfo
        ? hasDynamicSignalTypes(packageInfo, {
            policyTemplateName,
            inputType: input.type,
          })
        : false;

      const otelInputs: OTelCollectorConfig[] = (input?.streams ?? []).map((stream) => {
        // Avoid dots in keys, as they can create subobjects in agent config.
        const suffix = (input.id + '-' + stream.id).replaceAll('.', '-');
        const namespace =
          'data_stream' in input
            ? (input as FullAgentPolicyInput).data_stream.namespace
            : 'default';
        // Extract signal types from pipeline IDs
        const signalTypes = stream.service?.pipelines
          ? extractSignalTypesFromPipelines(stream.service?.pipelines)
          : [];
        const hasTracesPipeline = signalTypes.includes('traces');

        const shouldAddAPMConfig =
          (stream.data_stream.type === dataTypes.Traces || hasTracesPipeline) &&
          stream[USE_APM_VAR_NAME] === true;

        const attributesTransform = generateOTelAttributesTransform(
          stream.data_stream.type ? stream.data_stream.type : 'logs',
          stream.data_stream.dataset,
          namespace,
          suffix,
          inputDynamicSignalTypes,
          signalTypes
        );

        let otelConfig: OTelCollectorConfig = {
          ...addSuffixToOtelcolComponentsConfig('extensions', suffix, stream?.extensions),
          ...addSuffixToOtelcolComponentsConfig('receivers', suffix, stream?.receivers),
          ...addSuffixToOtelcolComponentsConfig('processors', suffix, stream?.processors),
          ...addSuffixToOtelcolComponentsConfig('connectors', suffix, stream?.connectors),
          ...addSuffixToOtelcolComponentsConfig('exporters', suffix, stream?.exporters),
          ...(stream?.service
            ? {
                service: {
                  ...stream.service,
                  pipelines: conditionallyAddApmToPipelines(
                    addSuffixToOtelcolComponentsConfig(
                      'pipelines',
                      suffix,
                      addSuffixToOtelcolPipelinesComponents(
                        alignPipelineSignalType(stream, inputDynamicSignalTypes),
                        suffix
                      )
                    ).pipelines ?? {},
                    shouldAddAPMConfig,
                    namespace
                  ),
                },
              }
            : {}),
        };

        // Must run before the APM block below so the aggregated metrics pipeline
        // does not receive the per-stream routing transform.
        otelConfig = appendOtelComponents(otelConfig, 'processors', [attributesTransform]);

        if (shouldAddAPMConfig) {
          otelConfig.connectors ??= {};
          otelConfig.processors ??= {};
          otelConfig.service ??= { pipelines: {} };
          otelConfig.connectors[`elasticapm/${namespace}`] = {};
          otelConfig.processors[`elasticapm/${namespace}`] = {};
          otelConfig.processors[`transform/${namespace}-apm-namespace-routing`] = {
            metric_statements: [
              {
                context: 'datapoint',
                statements: [`set(attributes["data_stream.namespace"], "${namespace}")`],
              },
            ],
          };
          otelConfig.service.pipelines![`metrics/${namespace}-aggregated-apm-metrics`] = {
            receivers: [`elasticapm/${namespace}`],
            processors: [`transform/${namespace}-apm-namespace-routing`],
          };
        }

        return otelConfig;
      });

      return otelInputs;
    });

  if (otelConfigs.length === 0) {
    return {};
  }

  const config = mergeOtelcolConfigs(otelConfigs);
  return attachOtelcolExporter(config, dataOutput, proxy, logger);
}

function buildDataStreamStatements(type: string, dataset: string, namespace: string): string[] {
  return [
    `set(attributes["data_stream.type"], "${type}")`,
    `set(attributes["data_stream.dataset"], "${dataset}")`,
    `set(attributes["data_stream.namespace"], "${namespace}")`,
  ];
}

function generateOtelTypeTransforms(
  type: string,
  dataset: string,
  namespace: string
): Record<string, any> {
  switch (type) {
    case 'logs':
      return {
        log_statements: [
          { context: 'log', statements: buildDataStreamStatements('logs', dataset, namespace) },
        ],
      };
    case 'metrics':
      return {
        metric_statements: [
          {
            context: 'datapoint',
            statements: buildDataStreamStatements('metrics', dataset, namespace),
          },
        ],
      };
    case 'traces':
      return {
        trace_statements: [
          // Spans are routed to traces-* per the OTel Elastic mapping spec:
          // https://github.com/elastic/opentelemetry-dev/blob/f01e7a6ec1c133367eadccb01ddd54426d69e486/docs/ingest/mapping/traces-mapping.md
          // The dataset defaults to 'generic.otel' but can be overridden via the
          // data_stream.dataset policy variable when the package declares it.
          { context: 'span', statements: buildDataStreamStatements('traces', dataset, namespace) },
          {
            // Span events are routed to logs-* even though they originate from a traces signal type.
            // In the OTel data model, span events are log records enriched with span context
            // (attributes and timestamp, but no start/end time or duration). Storing them in
            // traces-* would cause index mapping conflicts with the span document schema.
            //
            // Per the OTel Elastic mapping spec, span events belong in logs-generic.otel-* by
            // default, but the dataset can be overridden via the data_stream.dataset policy
            // variable — the same override that applies to spans above.
            // https://github.com/elastic/opentelemetry-dev/blob/main/docs/ingest/mapping/traces-mapping.md#span-events
            //
            // The APM UI queries span events via logs-*.otel-* (not logs-generic.otel-*
            // specifically), so any dataset value is compatible with APM visibility.
            // See: x-pack/platform/plugins/shared/apm_sources_access/common/config_schema.ts
            context: 'spanevent',
            statements: buildDataStreamStatements('logs', dataset, namespace),
          },
        ],
      };
    case 'profiles':
      return {
        profile_statements: [
          {
            context: 'profile',
            statements: buildDataStreamStatements('profiles', dataset, namespace),
          },
        ],
      };
    default:
      throw new FleetError(`unexpected data stream type ${type}`);
  }
}

export function extractSignalTypesFromPipelines(
  pipelines: Record<OTelCollectorPipelineID, OTelCollectorPipeline>
): string[] {
  const signalTypes = new Set<string>();
  Object.keys(pipelines).forEach((pipelineId) => {
    const signalType = getSignalType(pipelineId);
    if (signalType && ['logs', 'metrics', 'traces', 'profiles'].includes(signalType)) {
      signalTypes.add(signalType);
    }
  });
  return Array.from(signalTypes);
}

function generateOTelAttributesTransform(
  type: string,
  dataset: string,
  namespace: string,
  suffix: string,
  dynamicSignalTypes: boolean,
  signalTypes?: string[]
): Record<OTelCollectorComponentID, any> {
  let transformStatements: Record<string, any> = {};

  if (dynamicSignalTypes && signalTypes) {
    signalTypes.forEach((signalType) => {
      const typeTransforms = generateOtelTypeTransforms(signalType, dataset, namespace);
      Object.assign(transformStatements, typeTransforms);
    });
  } else {
    // Default: single signal type from stream.data_stream.type
    transformStatements = generateOtelTypeTransforms(type, dataset, namespace);
  }
  return {
    [`transform/${suffix}-routing`]: transformStatements,
  };
}

function appendOtelComponents(
  config: OTelCollectorConfig,
  type: string,
  components: Record<string, Record<string, any>>[]
): OTelCollectorConfig {
  components.forEach((component) => {
    Object.assign(config, {
      [type]: {
        ...Object.entries(config).find(([key]) => key === type)?.[1],
        ...component,
      },
    });
    if (config.service?.pipelines) {
      Object.values(config.service.pipelines).forEach((pipeline) => {
        Object.keys(component).forEach((id) => {
          pipeline.processors = (pipeline.processors ? pipeline.processors : []).concat([id]);
        });
      });
    }
  });

  return config;
}

function addSuffixToOtelcolComponentsConfig(
  type: string,
  suffix: string,
  components: Record<string, any>
): Record<OTelCollectorComponentID, any> {
  if (!components) {
    return {};
  }

  const generated: Record<string, any> = {};
  Object.entries(components).forEach(([id, config]) => {
    generated[id + '/' + suffix] = { ...config };
  });

  return { [type]: generated };
}

function conditionallyAddApmToPipelines(
  pipelines: Record<OTelCollectorPipelineID, any>,
  shouldAddAPMConfig: boolean,
  namespace: string
): Record<OTelCollectorPipelineID, any> {
  if (!shouldAddAPMConfig) {
    return pipelines;
  }
  const result: Record<OTelCollectorPipelineID, any> = {};
  Object.entries(pipelines as Record<OTelCollectorPipelineID, Record<string, string[]>>).forEach(
    ([pipelineID, pipeline]) => {
      const signalType = getSignalType(pipelineID);
      if (signalType === 'traces') {
        pipeline.exporters = [...(pipeline.exporters || []), `elasticapm/${namespace}`];
        pipeline.processors = [...(pipeline.processors || []), `elasticapm/${namespace}`];
      }
      result[pipelineID] = pipeline;
    }
  );
  return result;
}

/**
 * Adjust the signal type of the pipeline to the data stream type.
 * This is needed when the data stream type is changed by configuration and the pipeline is not dynamic.
 */
function alignPipelineSignalType(
  stream: FullAgentPolicyInputStream,
  inputDynamicSignalTypes: boolean
): Record<OTelCollectorPipelineID, any> {
  const pipelines = stream.service?.pipelines ?? {};
  const dataStreamType = stream.data_stream.type;
  if (!dataStreamType || inputDynamicSignalTypes || Object.keys(pipelines).length !== 1) {
    return pipelines;
  }
  const [[pipelineID, pipeline]] = Object.entries(pipelines);
  const [signalType, ...rest] = pipelineID.split('/');
  if (signalType === dataStreamType) {
    return pipelines;
  }
  const newKey = [dataStreamType, ...rest].join('/') as OTelCollectorPipelineID;
  return { [newKey]: pipeline };
}

function addSuffixToOtelcolPipelinesComponents(
  pipelines: any,
  suffix: string
): Record<OTelCollectorPipelineID, any> {
  const result: Record<OTelCollectorPipelineID, any> = {};
  Object.entries(pipelines as Record<OTelCollectorPipelineID, Record<string, string[]>>).forEach(
    ([pipelineID, pipeline]) => {
      const newPipeline: Record<string, any> = {};
      Object.entries(pipeline).forEach(([type, componentIDs]) => {
        newPipeline[type] = componentIDs.map((id) => id + '/' + suffix);
      });
      result[pipelineID] = newPipeline;
    }
  );
  return result;
}

function mergeOtelcolConfigs(otelConfigs: OTelCollectorConfig[]): OTelCollectorConfig {
  return otelConfigs.reduce((merged, next) => {
    if (!next) {
      return merged;
    }
    const extensions = {
      ...merged.extensions,
      ...next.extensions,
    };
    const receivers = {
      ...merged.receivers,
      ...next.receivers,
    };
    const processors = {
      ...merged.processors,
      ...next.processors,
    };
    const connectors = {
      ...merged.connectors,
      ...next.connectors,
    };
    const exporters = {
      ...merged.exporters,
      ...next.exporters,
    };
    return {
      ...(Object.keys(extensions).length > 0 ? { extensions } : {}),
      ...(Object.keys(receivers).length > 0 ? { receivers } : {}),
      ...(Object.keys(processors).length > 0 ? { processors } : {}),
      ...(Object.keys(connectors).length > 0 ? { connectors } : {}),
      ...(Object.keys(exporters).length > 0 ? { exporters } : {}),
      service: {
        ...merged.service,
        ...(next.service?.extensions
          ? {
              extensions: (merged.service?.extensions ? merged.service.extensions : []).concat(
                next.service.extensions
              ),
            }
          : {}),
        pipelines: {
          ...merged.service?.pipelines,
          ...next.service?.pipelines,
        },
      },
    };
  });
}

function buildBeatsauthConfig(output: Output, proxy?: FleetProxy): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  const ssl: Record<string, unknown> = {};
  if (output.ca_trusted_fingerprint) ssl.ca_trusted_fingerprint = output.ca_trusted_fingerprint;
  if (output.ca_sha256) ssl.ca_sha256 = output.ca_sha256;
  if (output.ssl?.certificate_authorities?.length)
    ssl.certificate_authorities = output.ssl.certificate_authorities;
  if (output.ssl?.certificate) ssl.certificate = output.ssl.certificate;
  // Prefer the secrets-stored key over the plain-text key, mirroring full_agent_policy.ts behaviour
  if (output.ssl?.key && !output.secrets?.ssl?.key) ssl.key = output.ssl.key;
  if (output.ssl?.verification_mode) ssl.verification_mode = output.ssl.verification_mode;
  if (Object.keys(ssl).length > 0) config.ssl = ssl;

  // If the SSL key is stored as a Kibana secret, include it under the secrets namespace
  if (output.secrets?.ssl?.key) {
    config.secrets = { ssl: { key: output.secrets.ssl.key } };
  }

  if (proxy) {
    config.proxy_url = proxy.url;
    if (proxy.proxy_headers) config.proxy_headers = proxy.proxy_headers;
  }

  return config;
}

function attachOtelcolExporter(
  config: OTelCollectorConfig,
  dataOutput?: Output,
  proxy?: FleetProxy,
  logger?: Logger
): OTelCollectorConfig {
  if (!dataOutput) {
    return config;
  }

  const { extensions, exporters } = generateOtelcolExporter(dataOutput, proxy, logger);
  config.connectors = {
    ...config.connectors,
    forward: {},
  };
  if (Object.keys(extensions).length > 0) {
    config.extensions = {
      ...config.extensions,
      ...extensions,
    };
  }
  config.exporters = {
    ...config.exporters,
    ...exporters,
  };

  const extensionIDs = Object.keys(extensions);
  if (extensionIDs.length > 0) {
    config.service = {
      ...config.service,
      extensions: [...(config.service?.extensions ?? []), ...extensionIDs],
    };
  }

  if (config.service?.pipelines) {
    const signalTypes = new Set<string>();
    Object.entries(config.service.pipelines).forEach(([id, pipeline]) => {
      config.service!.pipelines![id] = {
        ...pipeline,
        exporters: [...(pipeline.exporters || []), 'forward'],
      };
      signalTypes.add(getSignalType(id));
    });

    signalTypes.forEach((id) => {
      config.service!.pipelines![id] = {
        receivers: ['forward'],
        exporters: Object.keys(exporters),
      };
    });
  }

  return config;
}

function parseOtelExporterConfigYaml(
  yaml: string | null | undefined,
  logger?: Logger
): Record<string, unknown> {
  if (!yaml) return {};
  try {
    const parsed = load(yaml);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    logger?.warn(
      'otel_exporter_config_yaml did not parse to an object, skipping extra exporter config'
    );
    return {};
  } catch (e) {
    // Malformed YAML — skip extra config rather than crashing policy generation.
    // The UI validates YAML before saving; this path is only reachable via direct API writes.
    logger?.warn(
      `Failed to parse otel_exporter_config_yaml, skipping extra exporter config: ${e.message}`
    );
    return {};
  }
}

function generateOtelcolExporter(
  dataOutput: Output,
  proxy?: FleetProxy,
  logger?: Logger
): {
  extensions: Record<OTelCollectorComponentID, any>;
  exporters: Record<OTelCollectorComponentID, any>;
} {
  switch (dataOutput.type) {
    case outputType.Elasticsearch: {
      const outputID = getOutputIdForAgentPolicy(dataOutput);
      const beatsauthConfig = buildBeatsauthConfig(dataOutput, proxy);
      const hasBeatsauthConfig = Object.keys(beatsauthConfig).length > 0;
      const beatsauthID = `beatsauth/${outputID}`;
      const extraExporterConfig = parseOtelExporterConfigYaml(
        dataOutput.otel_exporter_config_yaml,
        logger
      );
      return {
        extensions: hasBeatsauthConfig ? { [beatsauthID]: beatsauthConfig } : {},
        exporters: {
          [`elasticsearch/${outputID}`]: {
            ...extraExporterConfig,
            // endpoints and auth always take precedence over user-supplied YAML
            endpoints: dataOutput.hosts,
            ...(hasBeatsauthConfig ? { auth: { authenticator: beatsauthID } } : {}),
          },
        },
      };
    }
    default:
      throw new FleetError(
        `output type ${dataOutput.type} not supported when policy contains OTel inputs`
      );
  }
}

export function getSignalType(id: string): string {
  const slashIndex = id.indexOf('/');
  // If there's a '/', return the part before it (e.g., 'logs' from 'logs/otlp')
  // If there's no '/', return the whole string (e.g., 'logs')
  return slashIndex > 0 ? id.substring(0, slashIndex) : id;
}
