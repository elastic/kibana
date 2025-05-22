/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AdvancedJsonProcessorConfig,
  ElasticsearchProcessorType,
  ProcessorDefinition,
  elasticsearchProcessorTypes,
  getProcessorConfig,
  getProcessorType,
} from '@kbn/streams-schema';
import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { conditionToPainless } from './condition_to_painless';

export function formatToIngestProcessors(
  processing: ProcessorDefinition[],
  ignoreMalformedAdvancedJson: boolean = false
): IngestProcessorContainer[] {
  return processing.flatMap((processor) => {
    const config = getProcessorConfig(processor);
    const type = getProcessorType(processor);
    if (type === 'advanced_json') {
      const advancedJsonProcessorConfig = config as AdvancedJsonProcessorConfig;

      // advanced_json processor is a special case, since it has nested Elasticsearch-level processors and doesn't support if
      // directly - we need to add it to each nested processor
      return advancedJsonProcessorConfig.processors.flatMap((nestedProcessor) => {
        const nestedType = Object.keys(nestedProcessor)[0];
        if (!elasticsearchProcessorTypes.includes(nestedType as ElasticsearchProcessorType)) {
          if (ignoreMalformedAdvancedJson) {
            return [];
          }
          throw new Error(
            `Invalid processor type "${nestedType}" in advanced_json processor. Supported types: ${elasticsearchProcessorTypes.join(
              ', '
            )}`
          );
        }
        const nestedConfig = nestedProcessor[nestedType] as Record<string, unknown>;
        if (typeof nestedConfig !== 'object' || nestedConfig === null) {
          if (ignoreMalformedAdvancedJson) {
            return [];
          }
          throw new Error(
            `Invalid processor config for "${nestedType}" in advanced_json processor. Expected an object.`
          );
        }
        return {
          [nestedType]: {
            ...nestedConfig,
            tag: advancedJsonProcessorConfig.tag ?? nestedConfig.tag,
            ignore_failure:
              nestedConfig.ignore_failure ?? advancedJsonProcessorConfig.ignore_failure,
            on_failure: nestedConfig.on_failure
              ? [
                  ...(nestedConfig.on_failure as []),
                  ...(advancedJsonProcessorConfig.on_failure as []),
                ]
              : advancedJsonProcessorConfig.on_failure,
            ...(!nestedConfig.if && 'if' in config && config.if
              ? { if: conditionToPainless(config.if) }
              : {}),
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
