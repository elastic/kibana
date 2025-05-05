/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OTTLProcessorConfig,
  ProcessorDefinition,
  compileOTTL,
  getProcessorConfig,
  getProcessorType,
  parseOttl,
} from '@kbn/streams-schema';
import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { conditionToPainless } from './condition_to_painless';

export function formatToIngestProcessors(
  processing: ProcessorDefinition[]
): IngestProcessorContainer[] {
  return processing.flatMap((processor) => {
    const config = getProcessorConfig(processor);
    const type = getProcessorType(processor);
    if (type === 'ottl') {
      const ottlProcessorConfig = config as OTTLProcessorConfig;

      const processors = compileOTTL(parseOttl(ottlProcessorConfig.statement).ast!);

      // advanced_json processor is a special case, since it has nested Elasticsearch-level processors and doesn't support if
      return processors.map((nestedProcessor) => {
        const nestedType = Object.keys(nestedProcessor)[0];
        return {
          [nestedType]: {
            ...nestedProcessor[nestedType],
            tag: ottlProcessorConfig.tag,
            ignore_failure: ottlProcessorConfig.ignore_failure,
            on_failure: ottlProcessorConfig.on_failure,
            ...('if' in config && config.if ? { if: conditionToPainless(config.if) } : {}),
          },
        } as IngestProcessorContainer;
      });
    }
    return [
      {
        [type]: {
          ...config,
          ...('if' in config && config.if ? { if: conditionToPainless(config.if) } : {}),
        },
      },
    ];
  });
}
