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
  note,
  id,
  version,
  lists,
} from './schemas';
import { hasListsFeature } from '../../feature_flags';
/* eslint-enable @typescript-eslint/camelcase */

export const patchRulesSchema = Joi.object({
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
  note: note.allow(''),
  version,

  // TODO: Remove the hasListsFeatures once this is ready for release
  lists: hasListsFeature() ? lists.default([]) : lists.forbidden().default([]),
}).xor('id', 'rule_id');
