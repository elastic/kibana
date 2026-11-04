/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

export const MAX_AUTOMATION_NAME_LENGTH = 200;
export const MAX_SOURCE_INDEX_LENGTH = 1024;
export const MAX_FIELD_NAME_LENGTH = 256;
export const MAX_CORPUS_FILTER_LENGTH = 2000;
/** Per-item runs fail at around 2,800 items on serverless (elastic/kibana#298948). */
export const MAX_DOCUMENTS_LIMIT = 2_000;
export const MAX_BODY_CHARS_LIMIT = 50_000;
export const MAX_UNITS_LIMIT = MAX_DOCUMENTS_LIMIT;
export const MAX_KIS_LENGTH = 50_000;
export const MAX_METRIC_FIELDS = 10;
/** One KI per source, so the list is capped at the 100-KI onboarding budget (`strategy_catalog`, "The KI budget"). */
export const MAX_INDEX_METADATA_SOURCES = 100;

export const DEFAULT_MAX_DOCUMENTS = 50;
export const DEFAULT_BODY_MAX_CHARS = 12_000;
export const DEFAULT_MAX_UNITS = 100;

export const findDuplicate = (values: readonly string[]): string | undefined =>
  values.find((item, position) => values.indexOf(item) !== position);

export const automationNameSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(MAX_AUTOMATION_NAME_LENGTH)
    .refine((v) => v.trim().length > 0, { message: 'name must not be blank or whitespace-only' })
    .refine((v) => !v.includes('/'), { message: 'name must not contain a forward slash' })
);
