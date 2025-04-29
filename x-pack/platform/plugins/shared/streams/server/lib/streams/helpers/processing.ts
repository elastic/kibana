/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AdvancedJsonProcessorConfig,
  ProcessorDefinition,
  getProcessorConfig,
  getProcessorType,
} from '@kbn/streams-schema';
import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { conditionToPainless } from './condition_to_painless';

export function formatToIngestProcessors(
  processing: ProcessorDefinition[]
): IngestProcessorContainer[] {
  return processing.flatMap((processor) => {
    const config = getProcessorConfig(processor);
    const type = getProcessorType(processor);
    if (type === 'advanced_json') {
      const advancedJsonProcessorConfig = config as AdvancedJsonProcessorConfig;

      // advanced_json processor is a special case, since it has nested Elasticsearch-level processors and doesn't support if
      return advancedJsonProcessorConfig.processors.map(
        (nestedProcessor) =>
          ({
            ...nestedProcessor,
            tag: advancedJsonProcessorConfig.tag ?? nestedProcessor.tag,
            ignore_failure:
              advancedJsonProcessorConfig.ignore_failure ?? nestedProcessor.ignore_failure,
            on_failure: [
              ...(advancedJsonProcessorConfig.on_failure || []),
              ...((nestedProcessor.on_failure as unknown[]) || []),
            ],
            if: advancedJsonProcessorConfig.if
              ? conditionToPainless(advancedJsonProcessorConfig.if)
              : nestedProcessor.if,
          } as IngestProcessorContainer)
      );
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
