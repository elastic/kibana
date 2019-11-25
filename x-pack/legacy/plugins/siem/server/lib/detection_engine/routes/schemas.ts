/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */
const description = Joi.string();
const enabled = Joi.boolean();
const false_positives = Joi.array().items(Joi.string());
const filter = Joi.object();
const filters = Joi.array();
const from = Joi.string();
const immutable = Joi.boolean();
const rule_id = Joi.string();
const id = Joi.string();
const index = Joi.array()
  .items(Joi.string())
  .single();
const interval = Joi.string();
const query = Joi.string();
const language = Joi.string().valid('kuery', 'lucene');
const output_index = Joi.string();
const saved_id = Joi.string();
const meta = Joi.object();
const max_signals = Joi.number().greater(0);
const name = Joi.string();
const risk_score = Joi.number()
  .greater(-1)
  .less(101);
const severity = Joi.string();
const to = Joi.string();
const type = Joi.string().valid('filter', 'query', 'saved_query');
const queryFilter = Joi.string();
const references = Joi.array()
  .items(Joi.string())
  .single();
const per_page = Joi.number()
  .min(0)
  .default(20);
const page = Joi.number()
  .min(1)
  .default(1);
const sort_field = Joi.string();
const sort_order = Joi.string().valid('asc', 'desc');
const tags = Joi.array().items(Joi.string());
const fields = Joi.array()
  .items(Joi.string())
  .single();
/* eslint-enable @typescript-eslint/camelcase */

export const createSignalsSchema = Joi.object({
  description: description.required(),
  enabled: enabled.default(true),
  false_positives: false_positives.default([]),
  filter: filter.when('type', { is: 'filter', then: Joi.required(), otherwise: Joi.forbidden() }),
  filters: Joi.when('type', {
    is: 'query',
    then: filters.optional(),
    otherwise: Joi.when('type', {
      is: 'saved_query',
      then: filters.optional(),
      otherwise: Joi.forbidden(),
    }),
  }),
  from: from.required(),
  rule_id,
  immutable: immutable.default(false),
  index,
  interval: interval.default('5m'),
  query: Joi.when('type', {
    is: 'query',
    then: Joi.when('filters', {
      is: Joi.exist(),
      then: query
        .optional()
        .allow('')
        .default(''),
      otherwise: Joi.required(),
    }),
    otherwise: Joi.when('type', {
      is: 'saved_query',
      then: query.optional(),
      otherwise: Joi.forbidden(),
    }),
  }),
  language: Joi.when('type', {
    is: 'query',
    then: language.required(),
    otherwise: Joi.when('type', {
      is: 'saved_query',
      then: language.optional(),
      otherwise: Joi.forbidden(),
    }),
  }),
  output_index,
  saved_id: saved_id.when('type', {
    is: 'saved_query',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  meta,
  risk_score: risk_score.required(),
  max_signals: max_signals.default(100),
  name: name.required(),
  severity: severity.required(),
  tags: tags.default([]),
  to: to.required(),
  type: type.required(),
  references: references.default([]),
});

export const updateSignalSchema = Joi.object({
  description,
  enabled,
  false_positives,
  filter: filter.when('type', { is: 'filter', then: Joi.optional(), otherwise: Joi.forbidden() }),
  filters: Joi.when('type', {
    is: 'query',
    then: filters.optional(),
    otherwise: Joi.when('type', {
      is: 'saved_query',
      then: filters.optional(),
      otherwise: Joi.forbidden(),
    }),
  }),
  from,
  rule_id,
  id,
  immutable,
  index,
  interval,
  query: Joi.when('type', {
    is: 'query',
    then: query.optional(),
    otherwise: Joi.when('type', {
      is: 'saved_query',
      then: query.optional(),
      otherwise: Joi.forbidden(),
    }),
  }),
  language: Joi.when('type', {
    is: 'query',
    then: language.optional(),
    otherwise: Joi.when('type', {
      is: 'saved_query',
      then: language.optional(),
      otherwise: Joi.forbidden(),
    }),
  }),
  output_index,
  saved_id: saved_id.when('type', {
    is: 'saved_query',
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),
  meta,
  risk_score,
  max_signals,
  name,
  severity,
  tags,
  to,
  type,
  references,
}).xor('id', 'rule_id');

export const querySignalSchema = Joi.object({
  rule_id,
  id,
}).xor('id', 'rule_id');

export const findSignalsSchema = Joi.object({
  fields,
  filter: queryFilter,
  per_page,
  page,
  sort_field: Joi.when(Joi.ref('sort_order'), {
    is: Joi.exist(),
    then: sort_field.required(),
    otherwise: sort_field.optional(),
  }),
  sort_order,
});
