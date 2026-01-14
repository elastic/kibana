/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// This import makes the file a module, which is required for the `declare module`
// below to augment the existing 'joi' types rather than replace them entirely.
import type * as Joi from 'joi';

import type { ByteSizeValue } from '@kbn/config-schema/src/byte_size_value';
import type { DurationValueType } from '@kbn/config-schema/src/types/duration_type';

/**
 * Joi module augmentation for kbn-config-schema custom types.
 * These extend Joi with custom schema types: bytes, duration, map, record, stream.
 */
declare module 'joi' {
  interface BytesSchema extends Joi.AnySchema {
    min(limit: number | string | ByteSizeValue): this;
    max(limit: number | string | ByteSizeValue): this;
  }

  interface DurationSchema extends Joi.AnySchema {
    min(limit: DurationValueType): this;
    max(limit: DurationValueType): this;
  }

  interface MapSchema extends Joi.AnySchema {
    entries(key: Joi.AnySchema, value: Joi.AnySchema): this;
  }

  interface RecordSchema extends Joi.AnySchema {
    entries(key: Joi.AnySchema, value: Joi.AnySchema): this;
  }

  interface ErrorReport {
    code: string;
    path: Array<string | number>;
    value: unknown;
    local?: Record<string, unknown>;
    toString(): string;
  }

  export type JoiRoot = Joi.Root & {
    bytes: () => BytesSchema;
    duration: () => DurationSchema;
    map: () => MapSchema;
    record: () => RecordSchema;
    stream: () => Joi.AnySchema;
  };
}
