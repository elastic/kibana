/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  description,
  enabled,
  false_positives,
  from,
  id,
  immutable,
  index,
  interval,
  rule_id,
  language,
  name,
  output_index,
  max_signals,
  query,
  references,
  severity,
  updated_by,
  tags,
  to,
  risk_score,
  created_at,
  created_by,
  updated_at,
  saved_id,
  timeline_id,
  timeline_title,
  type,
  threat,
  job_status,
  status_date,
  last_success_at,
  last_success_message,
  version,
  filters,
  meta,
} from './schemas';

/**
 * This is the required fields for the rules schema response. Put all required properties on
 * this base for schemas such as create_rules, update_rules, for the correct validation of the
 * output schema.
 */
export const requiredRulesSchema = t.type({
  description,
  enabled,
  false_positives,
  from,
  id,
  immutable,
  interval,
  rule_id,
  language,
  output_index,
  max_signals,
  risk_score,
  name,
  query,
  references,
  severity,
  updated_by,
  tags,
  to,
  type,
  threat,
  created_at,
  updated_at,
  created_by,
  version,
});

export type RequiredRulesSchema = t.TypeOf<typeof requiredRulesSchema>;

/**
 * If you have type dependents or exclusive or situations add them here AND update the
 * check_type_dependents file for whichever REST flow it is going through.
 */
export const dependentRulesSchema = t.partial({
  // when type = saved_query, saved_is is required
  saved_id,

  // These two are required together or not at all.
  timeline_id,
  timeline_title,
});

/**
 * This is the partial or optional fields for the rules schema. Put all optional
 * properties on this. DO NOT PUT type dependents such as xor relationships here.
 * Instead use dependentRulesSchema and check_type_dependents for how to do those.
 */
export const partialRulesSchema = t.partial({
  // TODO: We need type dependents on these 4 where either they all show up or none
  // of them show up? I need to talk to Devin
  status: job_status,
  status_date,
  last_success_at,
  last_success_message,

  filters,
  meta,
  index,
});

/**
 * This is the rules schema with all base and all optional properties
 * on it merged together
 */
export const rulesSchema = t.intersection([
  t.exact(dependentRulesSchema),
  t.exact(partialRulesSchema),
  t.exact(requiredRulesSchema),
]);
export type RulesSchema = t.TypeOf<typeof rulesSchema>;
