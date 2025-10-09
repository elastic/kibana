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
  OTelCollectorPipelineID,
} from '../../../common/types';
import { OTEL_COLLECTOR_INPUT_TYPE, outputType } from '../../../common/constants';
import { FleetError } from '../../errors';
import { getOutputIdForAgentPolicy } from '../../../common/services/output_helpers';

// Generate OTel Collector policy
export function generateOtelcolConfig(
  inputs: FullAgentPolicyInput[] | TemplateAgentPolicyInput[],
  dataOutput?: Output
): OTelCollectorConfig {
  const otelConfigs: OTelCollectorConfig[] = inputs
    .filter((input) => input.type === OTEL_COLLECTOR_INPUT_TYPE)
    .flatMap((input) => {
      const otelInputs: OTelCollectorConfig[] = (input?.streams ?? []).map((stream) => {
        // Avoid dots in keys, as they can create subobjects in agent config.
        const suffix = (input.id + '-' + stream.id).replaceAll('.', '-');
        const attributesTransform = generateOTelAttributesTransform(
          stream.data_stream.type ? stream.data_stream.type : 'logs',
          stream.data_stream.dataset,
          'data_stream' in input
            ? (input as FullAgentPolicyInput).data_stream.namespace
            : 'default',
          suffix
        );
        return appendOtelComponents(
          {
            ...addSuffixToOtelcolComponentsConfig('extensions', suffix, stream?.extensions),
            ...addSuffixToOtelcolComponentsConfig('receivers', suffix, stream?.receivers),
            ...addSuffixToOtelcolComponentsConfig('processors', suffix, stream?.processors),
            ...addSuffixToOtelcolComponentsConfig('connectors', suffix, stream?.connectors),
            ...addSuffixToOtelcolComponentsConfig('exporters', suffix, stream?.exporters),
            ...(stream?.service
              ? {
                  service: {
                    ...stream.service,
                    ...addSuffixToOtelcolComponentsConfig(
                      'pipelines',
                      suffix,
                      addSuffixToOtelcolPipelinesComponents(stream.service.pipelines, suffix)
                    ),
                  },
                }
              : {}),
          },
          'processors',
          [attributesTransform]
        );
      });

      return otelInputs;
    });

  if (otelConfigs.length === 0) {
    return {};
  }

  const config = mergeOtelcolConfigs(otelConfigs);
  return attachOtelcolExporter(config, dataOutput);
}

function generateOTelAttributesTransform(
  type: string,
  dataset: string,
  namespace: string,
  suffix: string
): Record<OTelCollectorComponentID, any> {
  let otelType: string;
  let context: string;
  switch (type) {
    case 'logs':
      otelType = 'log';
      context = 'log';
      break;
    case 'metrics':
      otelType = 'metric';
      context = 'datapoint';
      break;
    case 'traces':
      otelType = 'trace';
      context = 'span';
      break;
    default:
      throw new FleetError(`unexpected data stream type ${type}`);
  }
  return {
    [`transform/${suffix}-routing`]: {
      [`${otelType}_statements`]: [
        {
          context,
          statements: [
            `set(attributes["data_stream.type"], "${type}")`,
            `set(attributes["data_stream.dataset"], "${dataset}")`,
            `set(attributes["data_stream.namespace"], "${namespace}")`,
          ],
        },
      ],
    },
  };
}

function appendOtelComponents(
  config: OTelCollectorConfig,
  type: string,
  components: Record<string, Record<string, any>>[]
): OTelCollectorConfig {
  components.forEach((component) => {
    Object.assign(config, config, {
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
      signalTypes.add(signalType(id));
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

function signalType(id: string): string {
  return id.substring(0, id.indexOf('/'));
}
