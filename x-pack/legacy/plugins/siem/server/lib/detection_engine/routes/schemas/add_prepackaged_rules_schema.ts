/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */
import {
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
 * Big differences between this schema and the createRulesSchema
 *  - rule_id is required here
 *  - output_index is not allowed (and instead the space index must be used)
 *  - immutable is forbidden but defaults to true instead of to false and it can only ever be true
 *  - enabled defaults to false instead of true
 *  - version is a required field that must exist
 *  - index is a required field that must exist
 */
export const addPrepackagedRulesSchema = Joi.object({
  description: description.required(),
  enabled: enabled.default(false),
  false_positives: false_positives.default([]),
  filters,
  from: from.default('now-6m'),
  rule_id: rule_id.required(),
  immutable: immutable
    .forbidden()
    .default(true)
    .valid(true),
  index: index.required(),
  interval: interval.default('5m'),
  query: query.allow('').default(''),
  language: language.default('kuery'),
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
  version: version.required(),
});
