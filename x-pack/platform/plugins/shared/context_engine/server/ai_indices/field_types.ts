/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexField } from '../../common/http_api/ai_indices';
import { CONFLICT_FIELD_TYPE } from './describe_fields';

export const TEXT_TYPES: ReadonlySet<string> = new Set(['text', 'match_only_text']);
export const KEYWORD_TYPES: ReadonlySet<string> = new Set([
  'keyword',
  'constant_keyword',
  'wildcard',
]);

/** One type across matched indices; `conflict` fields cannot be referenced in ES|QL safely. */
export const isUsableField = (field: AiIndexField): boolean => field.type !== CONFLICT_FIELD_TYPE;

/** Usable field at `path`, optionally restricted to `type`. */
export const findUsableField = (
  fields: AiIndexField[],
  path: string,
  type?: string
): AiIndexField | undefined =>
  fields.find(
    (field) =>
      field.path === path && isUsableField(field) && (type === undefined || field.type === type)
  );
