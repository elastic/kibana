/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { getParentId, isRoot } from '@kbn/streams-schema';
import { convertConditionToOTTL } from './condition_to_ottl';
import { convertStreamlangProcessorsToOTTL } from './conversions';
import { flattenSteps } from '../shared/flatten_steps';
import type { OTELConfig, OTELConfigGeneratorOptions } from './types';
import { getPipelineName, sanitizePipelineName } from './ottl_helpers';

/**
 * Converts a hierarchy of wired streams to a complete OTEL collector configuration
 *
 * This generates:
 * - Receivers (filelog or otlp)
 * - Processors (transform processors for each stream's processing steps)
 * - Connectors (routing connectors for stream hierarchy)
 * - Exporters (Elasticsearch and optionally debug)
 * - Service pipelines (connecting everything together)
 *
 * @param streams Array of wired stream definitions
 * @param options Configuration options
 * @returns Complete OTEL collector configuration
 */
export function convertToOtelConfig(
  streams: Streams.WiredStream.Definition[],
  options: OTELConfigGeneratorOptions = {}
): OTELConfig {
  const config: OTELConfig = {
    receivers: {},
    processors: {},
    connectors: {},
    exporters: {},
    service: {
      pipelines: {},
    },
  };

  // Setup receivers
  if (options.receiverType === 'otlp') {
    config.receivers.otlp = {
      protocols: {
        grpc: {},
        http: {},
      },
    };
  } else {
    config.receivers.filelog = {
      include: options.filelogInclude || ['**/*.log'],
    };
  }

  // Setup exporters
  config.exporters.elasticsearch = {
    endpoints: [options.elasticsearchEndpoint || 'http://localhost:9200'],
    ...(options.elasticsearchApiKey ? { api_key: options.elasticsearchApiKey } : {}),
    logs_index: options.outputIndex || 'logs',
    mapping: {
      mode: 'otel',
    },
  };

  if (options.includeDebugExporter) {
    config.exporters.debug = {
      verbosity: 'detailed',
    };
  }

  // Filter streams if requested
  const filteredStreams = options.includeOnlyStreamsWithProcessing
    ? filterStreamsWithProcessing(streams)
    : streams;

  // Add JSON parsing processor for root stream
  if (options.includeJsonParsing) {
    config.processors['transform/json_parsing'] = {
      error_mode: 'ignore',
      log_statements: [
        {
          context: 'log',
          conditions: ['body != nil and Substring(body, 0, 2) == "{"'],
          statements: [
            'set(cache, ParseJSON(body))',
            'flatten(cache, "")',
            'merge_maps(attributes, cache, "upsert")',
          ],
        },
      ],
    };
  }

  // Create output pipeline
  const outputPipelineName = getPipelineName('output');
  config.service.pipelines[outputPipelineName] = {
    receivers: filteredStreams.map((stream) => `routing/${sanitizePipelineName(stream.name)}`),
    processors: [],
    exporters: ['elasticsearch', ...(options.includeDebugExporter ? ['debug'] : [])],
  };

  // Process each stream
  filteredStreams.forEach((streamDef) => {
    const streamName = streamDef.name;
    const sanitizedStreamName = sanitizePipelineName(streamName);

    // Create routing connector
    let routingTable = streamDef.ingest.wired.routing
      .filter((routing) => {
        // Only include routes to streams that are in our filtered list
        return filteredStreams.some((s) => s.name === routing.destination);
      })
      .filter((routing) => {
        // Filter out disabled routes
        return routing.status !== 'disabled';
      })
      .map((routing) => ({
        context: 'log' as const,
        condition: convertConditionToOTTL(routing.where),
        pipelines: [getPipelineName(routing.destination)],
      }));

    // If no routing rules, route to output
    if (routingTable.length === 0) {
      routingTable = [
        {
          context: 'log' as const,
          condition: 'true',
          pipelines: [outputPipelineName],
        },
      ];
    }

    config.connectors[`routing/${sanitizedStreamName}`] = {
      match_once: true,
      default_pipelines: [outputPipelineName],
      table: routingTable,
    };

    // Convert Streamlang processing to OTTL
    const flattenedSteps = flattenSteps(streamDef.ingest.processing.steps);
    const ottlStatements = convertStreamlangProcessorsToOTTL(flattenedSteps, streamName, options);
    const ottlProcessor = {
      error_mode: options.ignoreUnsupportedProcessors
        ? ('ignore' as const)
        : ('propagate' as const),
      log_statements: ottlStatements,
    };

    // Add processing transform if there are statements
    if (ottlProcessor.log_statements.length > 0) {
      config.processors[`transform/${sanitizedStreamName}_processing`] = ottlProcessor;
    }

    // Add stream metadata processor
    config.processors[`transform/${sanitizedStreamName}_metadata`] = {
      log_statements: [
        {
          context: 'log',
          statements: [
            `set(attributes["stream.name"], "${streamName}")`,
            `set(attributes["target_stream"], "${streamName}")`,
          ],
        },
      ],
    };

    // Create pipeline
    const processorList: string[] = [];

    // JSON parsing for root stream
    if (isRoot(streamName) && options.includeJsonParsing) {
      processorList.push('transform/json_parsing');
    }

    // Stream-specific processing
    if (ottlProcessor.log_statements.length > 0) {
      processorList.push(`transform/${sanitizedStreamName}_processing`);
    }

    // Metadata tagging
    processorList.push(`transform/${sanitizedStreamName}_metadata`);

    config.service.pipelines[getPipelineName(streamName)] = {
      receivers: [
        isRoot(streamName)
          ? options.receiverType || 'filelog'
          : `routing/${sanitizePipelineName(getParentId(streamName)!)}`,
      ],
      processors: processorList,
      exporters: [`routing/${sanitizedStreamName}`],
    };
  });

  return config;
}

/**
 * Filters streams to only include those with processing or that are ancestors/descendants
 * of streams with processing
 */
function filterStreamsWithProcessing(
  streams: Streams.WiredStream.Definition[]
): Streams.WiredStream.Definition[] {
  const hasProcessing = (s: Streams.WiredStream.Definition) => s.ingest.processing.steps.length > 0;

  return streams.filter((stream) => {
    return (
      isRoot(stream.name) ||
      hasProcessing(stream) ||
      streams.some(
        (s) =>
          hasProcessing(s) &&
          // Check if the stream is a child of the current stream or vice versa
          (stream.name.startsWith(`${s.name}.`) || s.name.startsWith(`${stream.name}.`))
      )
    );
  });
}
