/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';

export const agentConfigPayloadValidation = {
  settings: Joi.object({
    transaction_sample_rate: Joi.number()
      .min(0)
      .max(1)
      .precision(3)
      .required()
      .options({ convert: false })
  }),
  service: Joi.object({
    name: Joi.string().required(),
    environment: Joi.string()
  })
};
