/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Output, TemplateAgentPolicyInput } from '../../types';
import type {
  FullAgentPolicyInput,
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
import { hasDynamicSignalTypes } from '../epm/packages/input_type_packages';

const AGGREGATED_OTEL_METRICS_PIPELINE = 'metrics/aggregated-otel-metrics';

// Generate OTel Collector policy
export function generateOtelcolConfig(
  inputs: FullAgentPolicyInput[] | TemplateAgentPolicyInput[],
  dataOutput?: Output,
  packageInfoCache?: Map<string, PackageInfo>
): OTelCollectorConfig {
  const otelConfigs: OTelCollectorConfig[] = inputs
    .filter((input) => input.type === OTEL_COLLECTOR_INPUT_TYPE)
    .flatMap((input) => {
      // Get package info from input meta if available
      let packageInfo: PackageInfo | undefined;

      if (packageInfoCache && 'meta' in input && (input as FullAgentPolicyInput).meta?.package) {
        const pkgKey = pkgToPkgKey({
          name: (input as FullAgentPolicyInput).meta?.package?.name || '',
          version: (input as FullAgentPolicyInput).meta?.package?.version || '',
        });
        packageInfo = packageInfoCache.get(pkgKey);
      }

      const otelInputs: OTelCollectorConfig[] = (input?.streams ?? []).map((stream) => {
        // Avoid dots in keys, as they can create subobjects in agent config.
        const suffix = (input.id + '-' + stream.id).replaceAll('.', '-');
        const attributesTransform = generateOTelAttributesTransform(
          stream.data_stream.type ? stream.data_stream.type : 'logs',
          stream.data_stream.dataset,
          'data_stream' in input
            ? (input as FullAgentPolicyInput).data_stream.namespace
            : 'default',
          suffix,
          packageInfo,
          stream.service?.pipelines
        );

        const shouldAddAPMConfig =
          stream.data_stream.type === dataTypes.Traces && stream[USE_APM_VAR_NAME] === true;

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
                      addSuffixToOtelcolPipelinesComponents(stream.service.pipelines, suffix)
                    ).pipelines ?? {},
                    shouldAddAPMConfig
                  ),
                },
              }
            : {}),
        };

        otelConfig = appendOtelComponents(otelConfig, 'processors', [attributesTransform]);

        if (stream.data_stream.type === dataTypes.Traces && stream[USE_APM_VAR_NAME] === true) {
          if (!otelConfig?.connectors) {
            otelConfig.connectors = {};
          }
          if (!otelConfig?.processors) {
            otelConfig.processors = {};
          }

          otelConfig.connectors.elasticapm = {};
          otelConfig.processors.elasticapm = {};

          otelConfig.service!.pipelines![AGGREGATED_OTEL_METRICS_PIPELINE] = {
            receivers: ['elasticapm'],
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

function generateOtelTypeTransforms(
  type: string,
  dataset: string,
  namespace: string
): Record<string, any> {
  switch (type) {
    case 'logs':
      return {
        log_statements: [
          {
            context: 'log',
            statements: [
              `set(attributes["data_stream.type"], "logs")`,
              `set(attributes["data_stream.dataset"], "${dataset}")`,
              `set(attributes["data_stream.namespace"], "${namespace}")`,
            ],
          },
        ],
      };
    case 'metrics':
      return {
        metric_statements: [
          {
            context: 'datapoint',
            statements: [
              `set(attributes["data_stream.type"], "metrics")`,
              `set(attributes["data_stream.dataset"], "${dataset}")`,
              `set(attributes["data_stream.namespace"], "${namespace}")`,
            ],
          },
        ],
      };
    case 'traces':
      return {
        trace_statements: [
          {
            context: 'span',
            statements: [
              `set(attributes["data_stream.type"], "traces")`,
              `set(attributes["data_stream.dataset"], "${dataset}")`,
              `set(attributes["data_stream.namespace"], "${namespace}")`,
            ],
          },
          {
            context: 'spanevent',
            statements: [
              `set(attributes["data_stream.type"], "logs")`,
              `set(attributes["data_stream.namespace"], "${namespace}")`,
            ],
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
    if (signalType && ['logs', 'metrics', 'traces'].includes(signalType)) {
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
  packageInfo?: PackageInfo,
  streamPipelines?: Record<OTelCollectorPipelineID, OTelCollectorPipeline>
): Record<OTelCollectorComponentID, any> {
  const dynamicSignalTypes = hasDynamicSignalTypes(packageInfo);

  let transformStatements: Record<string, any> = {};

  if (dynamicSignalTypes && streamPipelines) {
    // When dynamic_signal_types is true, extract signal types from pipeline IDs
    // and generate transforms for each. This allows the collector to route data
    // to the appropriate datastreams based on the pipelines configured in the policy.
    const signalTypes = extractSignalTypesFromPipelines(streamPipelines);
    // Generate transforms for each signal type found in pipelines
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
  shouldAddAPMConfig: boolean
): Record<OTelCollectorPipelineID, any> {
  if (!shouldAddAPMConfig) {
    return pipelines;
  }
  pipelines = addCompomentToPipelines(pipelines, 'elasticapm', 'exporters');
  pipelines = addCompomentToPipelines(pipelines, 'elasticapm', 'processors');
  return pipelines;
}

function addCompomentToPipelines(
  pipelines: any,
  componentId: string,
  type: string
): Record<OTelCollectorPipelineID, any> {
  for (const pipelineId in pipelines) {
    if (pipelines[pipelineId][type]) {
      pipelines[pipelineId][type] = pipelines[pipelineId][type].concat([componentId]);
    } else {
      pipelines[pipelineId][type] = [componentId];
    }
  }
  return pipelines;
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
