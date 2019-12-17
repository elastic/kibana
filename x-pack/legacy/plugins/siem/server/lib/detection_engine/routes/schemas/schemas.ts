/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */
export const description = Joi.string();
export const enabled = Joi.boolean();
export const false_positives = Joi.array().items(Joi.string());
export const filters = Joi.array();
export const from = Joi.string();
export const immutable = Joi.boolean();
export const rule_id = Joi.string();
export const id = Joi.string();
export const index = Joi.array()
  .items(Joi.string())
  .single();
export const interval = Joi.string();
export const query = Joi.string();
export const language = Joi.string().valid('kuery', 'lucene');
export const output_index = Joi.string();
export const saved_id = Joi.string();
export const timeline_id = Joi.string();
export const meta = Joi.object();
export const max_signals = Joi.number().greater(0);
export const name = Joi.string();
export const risk_score = Joi.number()
  .greater(-1)
  .less(101);
export const severity = Joi.string();
export const status = Joi.string().valid('open', 'closed');
export const to = Joi.string();
export const type = Joi.string().valid('query', 'saved_query');
export const queryFilter = Joi.string();
export const references = Joi.array()
  .items(Joi.string())
  .single();
export const per_page = Joi.number()
  .min(0)
  .default(20);
export const page = Joi.number()
  .min(1)
  .default(1);
export const signal_ids = Joi.array().items(Joi.string());
export const signal_status_query = Joi.object();
export const sort_field = Joi.string();
export const sort_order = Joi.string().valid('asc', 'desc');
export const tags = Joi.array().items(Joi.string());
export const fields = Joi.array()
  .items(Joi.string())
  .single();
export const threat_framework = Joi.string();
export const threat_tactic_id = Joi.string();
export const threat_tactic_name = Joi.string();
export const threat_tactic_reference = Joi.string();
export const threat_tactic = Joi.object({
  id: threat_tactic_id.required(),
  name: threat_tactic_name.required(),
  reference: threat_tactic_reference.required(),
});
export const threat_technique_id = Joi.string();
export const threat_technique_name = Joi.string();
export const threat_technique_reference = Joi.string();
export const threat_technique = Joi.object({
  id: threat_technique_id.required(),
  name: threat_technique_name.required(),
  reference: threat_technique_reference.required(),
});
export const threat_techniques = Joi.array().items(threat_technique.required());

export const threats = Joi.array().items(
  Joi.object({
    framework: threat_framework.required(),
    tactic: threat_tactic.required(),
    techniques: threat_techniques.required(),
  })
);
