/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Output, TemplateAgentPolicyInput } from '../../types';
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

// Generate OTel Collector policy
export function generateOtelcolConfig(
  inputs: FullAgentPolicyInput[] | TemplateAgentPolicyInput[],
  dataOutput?: Output,
  packageInfoCache?: Map<string, PackageInfo>,
  defaultPackageInfo?: PackageInfo
): OTelCollectorConfig {
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
  return attachOtelcolExporter(config, dataOutput);
}

function buildDataStreamStatements(
  type: string,
  dataset: string | null,
  namespace: string
): string[] {
  return [
    `set(attributes["data_stream.type"], "${type}")`,
    ...(dataset !== null ? [`set(attributes["data_stream.dataset"], "${dataset}")`] : []),
    `set(attributes["data_stream.namespace"], "${namespace}")`,
  ];
}

function generateOtelTypeTransforms(
  type: string,
  dataset: string | null,
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
          { context: 'span', statements: buildDataStreamStatements('traces', null, namespace) },
          {
            context: 'spanevent',
            statements: buildDataStreamStatements('logs', null, namespace),
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
    // When dynamic_signal_types is true, do not override data_stream.dataset — defer to the ES
    // exporter's routing logic (scope.name, explicit data_stream.* attrs, or generic.otel default).
    // Only set type and namespace so signals land in the correct namespace.
    signalTypes.forEach((signalType) => {
      const typeTransforms = generateOtelTypeTransforms(signalType, null, namespace);
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

function attachOtelcolExporter(
  config: OTelCollectorConfig,
  dataOutput?: Output
): OTelCollectorConfig {
  if (!dataOutput) {
    return config;
  }

  const exporter = generateOtelcolExporter(dataOutput);
  config.connectors = {
    ...config.connectors,
    forward: {},
  };
  config.exporters = {
    ...config.exporters,
    ...exporter,
  };

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
        exporters: Object.keys(exporter),
      };
    });
  }

  return config;
}

function generateOtelcolExporter(dataOutput: Output): Record<OTelCollectorComponentID, any> {
  switch (dataOutput.type) {
    case outputType.Elasticsearch:
      const outputID = getOutputIdForAgentPolicy(dataOutput);
      return {
        [`elasticsearch/${outputID}`]: {
          endpoints: dataOutput.hosts,
        },
      };
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
