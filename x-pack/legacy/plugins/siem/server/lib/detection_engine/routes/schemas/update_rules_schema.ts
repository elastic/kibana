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
  id,
  version,
} from './schemas';
/* eslint-enable @typescript-eslint/camelcase */

import { DEFAULT_MAX_SIGNALS } from '../../../../../common/constants';

/**
 * This almost identical to the create_rules_schema except for a few details.
 *   - The version will not be defaulted to a 1. If it is not given then its default will become the previous version auto-incremented
 *     This does break idempotency slightly as calls repeatedly without it will increment the number. If the version number is passed in
 *     this will update the rule's version number.
 *   - id is on here because you can pass in an id to update using it instead of rule_id.
 */
export const updateRulesSchema = Joi.object({
  description: description.required(),
  enabled: enabled.default(true),
  id,
  false_positives: false_positives.default([]),
  filters,
  from: from.default('now-6m'),
  rule_id,
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
  version,
}).xor('id', 'rule_id');
