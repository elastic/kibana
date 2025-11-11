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

/**
 * Performs breadth-first traversal of the stream tree
 */
function breadthFirstTraversal(
  streams: Streams.WiredStream.Definition[]
): Streams.WiredStream.Definition[] {
  const result: Streams.WiredStream.Definition[] = [];
  const streamMap = new Map(streams.map((s) => [s.name, s]));
  const visited = new Set<string>();
  const queue: string[] = [];

  // Find root streams
  for (const stream of streams) {
    if (isRoot(stream.name)) {
      queue.push(stream.name);
      visited.add(stream.name);
    }
  }

  // BFS traversal
  while (queue.length > 0) {
    const currentName = queue.shift()!;
    const currentStream = streamMap.get(currentName);

    if (currentStream) {
      result.push(currentStream);

      // Add children to queue
      for (const stream of streams) {
        const parentId = getParentId(stream.name);
        if (parentId === currentName && !visited.has(stream.name)) {
          queue.push(stream.name);
          visited.add(stream.name);
        }
      }
    }
  }

  return result;
}

/**
 * Validates processor configuration
 * @public - Can be used to validate generated processor configs
 */
export function validateProcessorConfig(config: OTELConfig): string[] {
  const errors: string[] = [];

  // Check that the transform/stream_processing processor exists
  if (!config.processors['transform/stream_processing']) {
    errors.push('Missing required processor: transform/stream_processing');
  }

  // Check that it has log_statements
  const processor = config.processors['transform/stream_processing'];
  if (processor && (!processor.log_statements || processor.log_statements.length === 0)) {
    errors.push('Processor transform/stream_processing has no log_statements');
  }

  return errors;
}

/**
 * Converts a hierarchy of wired streams to processor configuration for dynamic injection
 *
 * This generates ONLY processor configurations that will be injected into static pipelines.
 * The static OTEL config (config.sampling.yaml) defines:
 * - Pipeline structure (logs/stream_processing)
 * - Connectors (routing/stream_ingress, routing/stream_egress)
 * - Receivers and exporters
 *
 * This function creates a single transform processor with conditional logic in breadth-first order:
 * 1. Initialize stream.name to root stream (unconditionally)
 * 2. For each stream: process data, add metadata, route to children
 *
 * @example Basic usage
 * ```typescript
 * const config = convertToOtelConfig(streams, {
 *   includeJsonParsing: true,
 *   ignoreUnsupportedProcessors: false
 * });
 * // Returns: { processors: { "transform/stream_processing": {...} } }
 * ```
 *
 * @param streams Array of wired stream definitions
 * @param options Configuration options
 * @returns Processor configuration for Elasticsearch document
 */
export function convertToOtelConfig(
  streams: Streams.WiredStream.Definition[],
  options: OTELConfigGeneratorOptions = {}
): OTELConfig {
  const config: OTELConfig = {
    processors: {},
  };

  // Filter streams if requested
  const filteredStreams = options.includeOnlyStreamsWithProcessing
    ? filterStreamsWithProcessing(streams)
    : streams;

  if (filteredStreams.length === 0) {
    return config;
  }

  // Perform breadth-first traversal to get processing order
  const orderedStreams = breadthFirstTraversal(filteredStreams);

  // Build a single transform processor with all stream logic
  const allStatements: any[] = [];

  // Find the root stream to initialize stream.name
  const rootStream = orderedStreams.find((s) => isRoot(s.name));
  if (rootStream) {
    // Initialize stream.name to root stream unconditionally
    allStatements.push({
      context: 'log',
      statements: [`set(attributes["target_stream"], "${rootStream.name}")`],
    });
  }

  // Add JSON parsing for root streams if requested
  if (options.includeJsonParsing) {
    allStatements.push({
      context: 'log',
      conditions: ['body != nil and Substring(body, 0, 2) == "{"'],
      statements: [
        'set(cache, ParseJSON(body))',
        'flatten(cache, "")',
        'merge_maps(attributes, cache, "upsert")',
      ],
    });
  }

  // Process each stream in breadth-first order
  for (const streamDef of orderedStreams) {
    const streamName = streamDef.name;

    // 1. Process this stream's data (when stream.name == streamName)
    const flattenedSteps = flattenSteps(streamDef.ingest.processing.steps);
    const processingStatements = convertStreamlangProcessorsToOTTL(
      flattenedSteps,
      streamName,
      options
    );

    if (processingStatements.length > 0) {
      for (const stmt of processingStatements) {
        // Add condition to only process when stream.name matches
        const conditions = [
          ...(stmt.conditions || []),
          `attributes["target_stream"] == "${streamName}"`,
        ];
        allStatements.push({
          context: stmt.context,
          conditions: conditions.length > 0 ? [conditions.join(' and ')] : undefined,
          statements: stmt.statements,
        });
      }
    }

    // 2. Add stream metadata (when stream.name == streamName)
    allStatements.push({
      context: 'log',
      conditions: [`attributes["target_stream"] == "${streamName}"`],
      statements: [
        `set(attributes["target_stream"], "${streamName}")`,
        `set(attributes["otel_processed"], true)`,
      ],
    });

    // 3. Route to children by changing stream.name (when stream.name == streamName AND routing condition)
    const activeRoutings = streamDef.ingest.wired.routing.filter(
      (routing) =>
        routing.status !== 'disabled' && filteredStreams.some((s) => s.name === routing.destination)
    );

    for (const routing of activeRoutings) {
      const ottlCondition = convertConditionToOTTL(routing.where);
      const conditions = [
        `attributes["target_stream"] == "${streamName}"`,
        ottlCondition !== 'true' ? ottlCondition : undefined,
      ].filter(Boolean);
      allStatements.push({
        context: 'log',
        conditions: conditions.length > 0 ? [conditions.join(' and ')] : undefined,
        statements: [`set(attributes["target_stream"], "${routing.destination}")`],
      });
    }
  }

  // Create the single transform processor
  config.processors['transform/stream_processing'] = {
    error_mode: options.ignoreUnsupportedProcessors ? 'ignore' : 'propagate',
    log_statements: allStatements,
  };

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
