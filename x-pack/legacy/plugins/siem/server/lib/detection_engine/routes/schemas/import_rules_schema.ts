/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */
import {
  id,
  actions,
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
  throttle,
  references,
  note,
  version,
  lists,
  anomaly_threshold,
  machine_learning_job_id,
} from './schemas';
/* eslint-enable @typescript-eslint/camelcase */

import { DEFAULT_MAX_SIGNALS } from '../../../../../common/constants';
import { hasListsFeature } from '../../feature_flags';

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
  anomaly_threshold: anomaly_threshold.when('type', {
    is: 'machine_learning',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  id,
  actions: actions.default([]),
  description: description.required(),
  enabled: enabled.default(true),
  false_positives: false_positives.default([]),
  filters,
  from: from.default('now-6m'),
  rule_id: rule_id.required(),
  immutable: immutable.default(false).valid(false),
  index,
  interval: interval.default('5m'),
  query: query.when('type', {
    is: 'machine_learning',
    then: Joi.forbidden(),
    otherwise: query.allow('').default(''),
  }),
  language: language.when('type', {
    is: 'machine_learning',
    then: Joi.forbidden(),
    otherwise: language.default('kuery'),
  }),
  output_index,
  machine_learning_job_id: machine_learning_job_id.when('type', {
    is: 'machine_learning',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
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
  throttle: throttle.default(null),
  references: references.default([]),
  note: note.allow(''),
  version: version.default(1),
  created_at,
  updated_at,
  created_by,
  updated_by,

  // TODO: (LIST-FEATURE) Remove the hasListsFeatures once this is ready for release
  lists: hasListsFeature() ? lists.default([]) : lists.forbidden().default([]),
});

export const importRulesQuerySchema = Joi.object({
  overwrite: Joi.boolean().default(false),
});

export const importRulesPayloadSchema = Joi.object({
  file: Joi.object().required(),
});
