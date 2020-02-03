/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */
import {
  id,
  created_at,
  updated_at,
  created_by,
  updated_by,
  enabled,
  description,
  false_positives,
  filters,
  from,
  immutable,
  index,
  rule_id,
  interval,
  query,
  language,
  output_index,
  saved_id,
  timeline_id,
  timeline_title,
  meta,
  risk_score,
  max_signals,
  name,
  severity,
  tags,
  to,
  type,
  threat,
  references,
  version,
} from './schemas';
/* eslint-enable @typescript-eslint/camelcase */

import { DEFAULT_MAX_SIGNALS } from '../../../../../common/constants';

/**
 * Differences from this and the createRulesSchema are
 *   - rule_id is required
 *   - id is optional (but ignored in the import code - rule_id is exclusively used for imports)
 *   - created_at is optional (but ignored in the import code)
 *   - updated_at is optional (but ignored in the import code)
 *   - created_by is optional (but ignored in the import code)
 *   - updated_by is optional (but ignored in the import code)
 */
export const importRulesSchema = Joi.object({
  id,
  description: description.required(),
  enabled: enabled.default(true),
  false_positives: false_positives.default([]),
  filters,
  from: from.default('now-6m'),
  rule_id: rule_id.required(),
  immutable: immutable.default(false).valid(false),
  index,
  interval: interval.default('5m'),
  query: query.allow('').default(''),
  language: language.default('kuery'),
  output_index,
  saved_id: saved_id.when('type', {
    is: 'saved_query',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  timeline_id,
  timeline_title,
  meta,
  risk_score: risk_score.required(),
  max_signals: max_signals.default(DEFAULT_MAX_SIGNALS),
  name: name.required(),
  severity: severity.required(),
  tags: tags.default([]),
  to: to.default('now'),
  type: type.required(),
  threat: threat.default([]),
  references: references.default([]),
  version: version.default(1),
  created_at,
  updated_at,
  created_by,
  updated_by,
});

export const importRulesQuerySchema = Joi.object({
  overwrite: Joi.boolean().default(false),
});

export const importRulesPayloadSchema = Joi.object({
  file: Joi.object().required(),
});
