/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangProcessorDefinition } from '../../../types/processors';
import type { OTTLStatement, OTTLTranspilationOptions } from './types';
import {
  AppendProcessorConverter,
  ConvertProcessorConverter,
  DateProcessorConverter,
  DissectProcessorConverter,
  GrokProcessorConverter,
  RemoveByPrefixProcessorConverter,
  RemoveProcessorConverter,
  RenameProcessorConverter,
  SetProcessorConverter,
} from './processors';

const converters = {
  grok: new GrokProcessorConverter(),
  dissect: new DissectProcessorConverter(),
  date: new DateProcessorConverter(),
  rename: new RenameProcessorConverter(),
  set: new SetProcessorConverter(),
  append: new AppendProcessorConverter(),
  convert: new ConvertProcessorConverter(),
  remove: new RemoveProcessorConverter(),
  remove_by_prefix: new RemoveByPrefixProcessorConverter(),
};

/**
 * Converts Streamlang processors to OTTL statements
 *
 * @param processors Flattened array of Streamlang processors
 * @param streamName Name of the stream being processed
 * @param options Transpilation options
 * @returns Array of OTTL statements
 */
export function convertStreamlangProcessorsToOTTL(
  processors: StreamlangProcessorDefinition[],
  streamName: string,
  options?: OTTLTranspilationOptions
): OTTLStatement[] {
  return processors.flatMap((processor, index) => {
    // Check for manual_ingest_pipeline first
    if (processor.action === 'manual_ingest_pipeline') {
      if (options?.ignoreUnsupportedProcessors) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping unsupported processor: ${processor.action} in stream ${streamName}`);
        return [];
      }
      throw new Error(
        `Processor "${processor.action}" cannot be transpiled to OTTL. ` +
          `Manual ingest pipeline processors are Elasticsearch-specific and have no OTTL equivalent. ` +
          `Consider rewriting the processing logic using Streamlang processors.`
      );
    }

    const converter = converters[processor.action];

    if (!converter) {
      throw new Error(`Unknown processor action: ${processor.action}`);
    }

    try {
      const result = converter.convert(processor as any, {
        streamName,
        processorIndex: index,
      });

      return result.statements;
    } catch (error) {
      if (options?.ignoreUnsupportedProcessors) {
        // eslint-disable-next-line no-console
        console.warn(
          `Error converting processor ${processor.action} in stream ${streamName}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return [];
      }
      throw error;
    }
  });
}
