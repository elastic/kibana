/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { MAX_SPACE_INITIALS } from '../../common/constants';

export const SPACE_ID_REGEX = /^[a-z0-9_\-]+$/;

export const spaceSchema = Joi.object({
  id: Joi.string().regex(SPACE_ID_REGEX, `lower case, a-z, 0-9, "_", and "-" are allowed`),
  name: Joi.string().required(),
  description: Joi.string().allow(''),
  initials: Joi.string().max(MAX_SPACE_INITIALS),
  color: Joi.string().regex(/^#[a-zA-Z0-9]{6}$/, `6 digit hex color, starting with a #`),
  disabledFeatures: Joi.array()
    .items(Joi.string())
    .default([]),
  _reserved: Joi.boolean(),
}).default();
