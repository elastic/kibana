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
  output_index,
  saved_id,
  timeline_id,
  meta,
  risk_score,
  max_signals,
  name,
  severity,
  tags,
  to,
  type,
  threats,
  references,
  id,
  version,
} from './schemas';
/* eslint-enable @typescript-eslint/camelcase */

export const updateRulesSchema = Joi.object({
  description,
  enabled,
  false_positives,
  filters,
  from,
  rule_id,
  id,
  immutable,
  index,
  interval,
  query: query.allow(''),
  language,
  output_index,
  saved_id,
  timeline_id,
  meta,
  risk_score,
  max_signals,
  name,
  severity,
  tags,
  to,
  type,
  threats,
  references,
  version,
}).xor('id', 'rule_id');
