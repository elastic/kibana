/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

export const querySignalsSchema = Joi.object({
  query: Joi.object(),
  aggs: Joi.object(),
  size: Joi.number().integer(),
  track_total_hits: Joi.boolean(),
  _source: Joi.array().items(Joi.string()),
}).min(1);
