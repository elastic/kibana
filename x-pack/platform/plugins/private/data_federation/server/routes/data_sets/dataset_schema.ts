/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  CSV_CHARACTER_NONE,
  isValidDelimiter,
  isValidQuoteOrEscapeCharacter,
} from '../../../common';

const optionalString = schema.maybe(schema.string({ maxLength: 4096 }));
const optionalShortString = schema.maybe(schema.string({ maxLength: 256 }));

/**
 * Request body for `PUT .../data_sets/{id}`: {@link Dataset} (no top-level `name`;
 * the path supplies the id).
 */
export const datasetSchema = schema.object({
  data_source: schema.string({ maxLength: 256 }),
  resource: schema.string({ maxLength: 4096 }),
  description: optionalString,
  mappings: schema.maybe(
    schema.object({
      dynamic: schema.maybe(schema.oneOf([schema.literal('true'), schema.literal('false')])),
      properties: schema.recordOf(
        schema.string({ maxLength: 256 }),
        schema.object({
          type: schema.oneOf([
            schema.literal('keyword'),
            schema.literal('long'),
            schema.literal('integer'),
            schema.literal('double'),
            schema.literal('boolean'),
            schema.literal('date'),
            schema.literal('date_nanos'),
            schema.literal('unsigned_long'),
            schema.literal('ip'),
          ]),
          path: optionalShortString,
          format: optionalString,
        })
      ),
    })
  ),
  settings: schema.maybe(
    schema.object({
      format: schema.maybe(
        schema.oneOf([
          schema.literal('parquet'),
          schema.literal('csv'),
          schema.literal('tsv'),
          schema.literal('ndjson'),
        ])
      ),
      // Universal
      file_exclusions: schema.maybe(
        schema.arrayOf(schema.string({ maxLength: 4096 }), { maxSize: 256 })
      ),
      partition_detection: schema.maybe(
        schema.oneOf([
          schema.literal('auto'),
          schema.literal('hive'),
          schema.literal('template'),
          schema.literal('none'),
        ])
      ),
      schema_resolution: schema.maybe(
        schema.oneOf([
          schema.literal('first_file_wins'),
          schema.literal('strict'),
          schema.literal('union_by_name'),
        ])
      ),
      partition_path: optionalString,
      hive_partitioning: schema.maybe(schema.boolean()),
      // CSV/TSV commonly changed
      delimiter: schema.maybe(
        schema.string({
          maxLength: 2,
          minLength: 1,
          validate: (value) => {
            if (isValidDelimiter(value)) return;
            return 'Must be a single character, \\t or \\\\.';
          },
        })
      ),
      mode: schema.maybe(
        schema.oneOf([schema.literal('quoted'), schema.literal('escaped'), schema.literal('plain')])
      ),
      header_row: schema.maybe(schema.boolean()),
      skip_rows: schema.maybe(schema.number({ min: 0, max: 1000 })),
      datetime_format: optionalString,
      null_value: optionalString,
      encoding: optionalString,
      // CSV/TSV error handling
      error_mode: schema.maybe(
        schema.oneOf([
          schema.literal('fail_fast'),
          schema.literal('skip_row'),
          schema.literal('null_field'),
        ])
      ),
      max_errors: schema.maybe(schema.number({ min: 0 })),
      max_error_ratio: schema.maybe(schema.number({ min: 0, max: 1 })),
      // CSV/TSV advanced
      quote: schema.maybe(
        schema.string({
          maxLength: CSV_CHARACTER_NONE.length,
          minLength: 1,
          validate: (value) => {
            if (isValidQuoteOrEscapeCharacter(value)) return;
            return "Must be a single character, \\t, \\\\ or 'none'.";
          },
        })
      ),
      escape: schema.maybe(
        schema.string({
          maxLength: CSV_CHARACTER_NONE.length,
          minLength: 1,
          validate: (value) => {
            if (isValidQuoteOrEscapeCharacter(value)) return;
            return "Must be a single character, \\t, \\\\ or 'none'.";
          },
        })
      ),
      comment: optionalString,
      column_prefix: optionalString,
      trim_spaces: schema.maybe(schema.boolean()),

      // API-only (not shown in the UI)
      file_order: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
      file_sort_by: schema.maybe(
        schema.oneOf([schema.literal('list'), schema.literal('name'), schema.literal('mtime')])
      ),
      max_field_size: schema.maybe(
        schema.number({
          min: 0,
          validate: (value) => {
            if (Number.isInteger(value)) return;
            return 'Must be an integer.';
          },
        })
      ),
      multi_value_syntax: schema.maybe(
        schema.oneOf([schema.literal('none'), schema.literal('brackets')])
      ),
      partition_sample_size: schema.maybe(schema.string({ maxLength: 255 })),
      region: optionalString,
      schema_sample_size: schema.maybe(
        schema.number({
          min: 1,
          validate: (value) => {
            if (Number.isInteger(value)) return;
            return 'Must be an integer.';
          },
        })
      ),
      segment_size: optionalString,
      split_probe_window: optionalString,
      target_split_size: optionalString,
      max_split_probes: schema.maybe(
        schema.number({
          min: 0,
          validate: (value) => {
            if (Number.isInteger(value)) return;
            return 'Must be an integer.';
          },
        })
      ),
    })
  ),
});
