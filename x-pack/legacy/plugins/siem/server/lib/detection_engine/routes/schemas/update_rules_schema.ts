/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */
import {
  actions,
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
  throttle,
  references,
  id,
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
 * This almost identical to the create_rules_schema except for a few details.
 *   - The version will not be defaulted to a 1. If it is not given then its default will become the previous version auto-incremented
 *     This does break idempotency slightly as calls repeatedly without it will increment the number. If the version number is passed in
 *     this will update the rule's version number.
 *   - id is on here because you can pass in an id to update using it instead of rule_id.
 */
export const updateRulesSchema = Joi.object({
  actions: actions.default([]),
  anomaly_threshold: anomaly_threshold.when('type', {
    is: 'machine_learning',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  description: description.required(),
  enabled: enabled.default(true),
  id,
  false_positives: false_positives.default([]),
  filters,
  from: from.default('now-6m'),
  rule_id,
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
  machine_learning_job_id: machine_learning_job_id.when('type', {
    is: 'machine_learning',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
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
  throttle: throttle.default(null),
  references: references.default([]),
  note: note.allow(''),
  version,

  // TODO: (LIST-FEATURE) Remove the hasListsFeatures once this is ready for release
  lists: hasListsFeature() ? lists.default([]) : lists.forbidden().default([]),
}).xor('id', 'rule_id');
