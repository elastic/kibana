/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

export const userSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string(),
  roles: Joi.array().items(Joi.string()),
  full_name: Joi.string().allow(null, ''),
  email: Joi.string().allow(null, ''),
  metadata: Joi.object(),
  enabled: Joi.boolean().default(true),
});
