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
  note,
  id,
  version,
  lists,
  anomaly_threshold,
  machine_learning_job_id,
} from './schemas';
import { hasListsFeature } from '../../feature_flags';
/* eslint-enable @typescript-eslint/camelcase */

export const patchRulesSchema = Joi.object({
  actions,
  anomaly_threshold,
  description,
  enabled,
  false_positives,
  filters,
  from,
  rule_id,
  id,
  index,
  interval,
  query: query.allow(''),
  language,
  machine_learning_job_id,
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
  note: note.allow(''),
  version,

  // TODO: (LIST-FEATURE) Remove the hasListsFeatures once this is ready for release
  lists: hasListsFeature() ? lists.default([]) : lists.forbidden().default([]),
}).xor('id', 'rule_id');
