/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ProcessorDefinition,
  getInFields,
  getProcessorConfig,
  getProcessorType,
} from '@kbn/streams-schema';
import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { conditionToPainless, generateFieldDefinition } from './condition_to_painless';

function normalizeFieldName(field: string): string {
  return `___${field.replace(/\./g, '____')}`;
}

export function formatToIngestProcessors(
  processing: ProcessorDefinition[]
): IngestProcessorContainer[] {
  return processing.flatMap((processor) => {
    const config = getProcessorConfig(processor);
    const type = getProcessorType(processor);
    const fields = getInFields(processor);
    return [
      {
        script: {
          source: `
            def relevant_fields = [:];
            ${fields.map((field) => generateFieldDefinition(field)).join('\n')}
            ${fields
              .map((field) => {
                const normalizedField = normalizeFieldName(field);
                return `ctx['${normalizedField}'] = relevant_fields['${field}'];`;
              })
              .join('\n')}
          `,
        },
      },
      {
        [type]: {
          ...config,
          field: normalizeFieldName(fields[0]),
          ...('if' in config && config.if ? { if: conditionToPainless(config.if) } : {}),
        },
      },
      {
        remove: {
          field: fields.map((field) => normalizeFieldName(field)),
          ignore_failure: true,
        },
      },
    ];
  });
}
