/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */
const description = Joi.string();
const enabled = Joi.boolean();
const filter = Joi.object();
const filters = Joi.array();
const from = Joi.string();
const id = Joi.string();
const index = Joi.array()
  .items(Joi.string())
  .single();
const interval = Joi.string();
const query = Joi.string();
const language = Joi.string().valid('kuery', 'lucene');
const saved_id = Joi.string();
const max_signals = Joi.number().greater(0);
const name = Joi.string();
const severity = Joi.string();
const to = Joi.string();
const type = Joi.string().valid('filter', 'query', 'saved_query');
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
const fields = Joi.array()
  .items(Joi.string())
  .single();
/* eslint-enable @typescript-eslint/camelcase */

export const createSignalsSchema = Joi.object({
  description: description.required(),
  enabled: enabled.default(true),
  filter: filter.when('type', { is: 'filter', then: Joi.required(), otherwise: Joi.forbidden() }),
  filters: filters.when('type', { is: 'query', then: Joi.optional(), otherwise: Joi.forbidden() }),
  from: from.required(),
  id: id.required(),
  index: index.required(),
  interval: interval.default('5m'),
  query: query.when('type', { is: 'query', then: Joi.required(), otherwise: Joi.forbidden() }),
  language: language.when('type', {
    is: 'query',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  saved_id: saved_id.when('type', {
    is: 'saved_query',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  max_signals: max_signals.default(100),
  name: name.required(),
  severity: severity.required(),
  to: to.required(),
  type: type.required(),
  references: references.default([]),
});

export const updateSignalSchema = Joi.object({
  description,
  enabled,
  filter: filter.when('type', { is: 'filter', then: Joi.optional(), otherwise: Joi.forbidden() }),
  filters: filters.when('type', { is: 'query', then: Joi.optional(), otherwise: Joi.forbidden() }),
  from,
  id,
  index,
  interval,
  query: query.when('type', { is: 'query', then: Joi.optional(), otherwise: Joi.forbidden() }),
  language: language.when('type', {
    is: 'query',
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),
  saved_id: saved_id.when('type', {
    is: 'saved_query',
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),
  max_signals,
  name,
  severity,
  to,
  type,
  references,
});

export const findSignalsSchema = Joi.object({
  per_page,
  page,
  sort_field,
  fields,
});
