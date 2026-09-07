/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { isRuntimeField } from './utils/runtime_field_utils';

export const analyzeFileQuerySchema = schema.object({
  charset: schema.maybe(schema.string({ maxLength: 10000 })),
  column_names: schema.maybe(schema.string({ maxLength: 10000 })),
  delimiter: schema.maybe(schema.string({ maxLength: 10000 })),
  explain: schema.maybe(schema.string({ maxLength: 10000 })),
  format: schema.maybe(schema.string({ maxLength: 10000 })),
  grok_pattern: schema.maybe(schema.string({ maxLength: 10000 })),
  has_header_row: schema.maybe(schema.string({ maxLength: 10000 })),
  line_merge_size_limit: schema.maybe(schema.string({ maxLength: 10000 })),
  lines_to_sample: schema.maybe(schema.string({ maxLength: 10000 })),
  quote: schema.maybe(schema.string({ maxLength: 10000 })),
  should_trim_fields: schema.maybe(schema.string({ maxLength: 10000 })),
  timeout: schema.maybe(schema.string({ maxLength: 10000 })),
  timestamp_field: schema.maybe(schema.string({ maxLength: 10000 })),
  timestamp_format: schema.maybe(schema.string({ maxLength: 10000 })),
  includePreview: schema.maybe(schema.boolean()),
});

const ingestPipeline = schema.object({
  id: schema.string({ maxLength: 1000 }),
  pipeline: schema.maybe(schema.any()),
});

export const initializeImportFileBodySchema = schema.object({
  index: schema.string({ maxLength: 1000 }),
  /* Index settings */
  settings: schema.maybe(schema.any()),
  /** Mappings */
  mappings: schema.any(),
  /** Ingest pipeline definition */
  ingestPipelines: schema.arrayOf(ingestPipeline, { maxSize: 50000 }),
  existingIndex: schema.maybe(schema.boolean()),
});

export const importFileBodySchema = schema.object({
  index: schema.string({ maxLength: 1000 }),
  data: schema.arrayOf(schema.any(), { maxSize: 10000 }),
  ingestPipelineId: schema.maybe(schema.string({ maxLength: 1000 })),
});

export const runtimeMappingsSchema = schema.object(
  {},
  {
    unknowns: 'allow',
    validate: (v: object) => {
      if (Object.values(v).some((o) => !isRuntimeField(o))) {
        return i18n.translate('xpack.fileUpload.invalidRuntimeFieldMessage', {
          defaultMessage: 'Invalid runtime field',
        });
      }
    },
  }
);
