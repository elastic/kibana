/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */

export const ids = Joi.array().items(Joi.string());

export const exclude_export_details = Joi.boolean();
export const file_name = Joi.string();
